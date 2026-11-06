import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { QueryFilter } from 'mongoose';
import { AppResponse } from '../../../common/response/app-response';
import {
  EmployeeDocument,
  EmployeeOnboardingStep,
} from '../employee/entity/employee.schema';
import { EmployeeStatus, Sex } from '../employee/enum/employee.enum';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { LeaveBalanceDocument } from '../leave/entity/leave-balance.schema';
import { LeaveRequestDocument } from '../leave/entity/leave-request.schema';
import { LeaveRequestStatus } from '../leave/enum/leave.enum';
import { LeaveBalanceRepository } from '../leave/repository/leave-balance.repository';
import { LeaveRequestRepository } from '../leave/repository/leave-request.repository';
import { ExitTrackingDocument } from '../offboarding/entity/exit-tracking.schema';
import { ExitRequestStatus } from '../offboarding/enum/offboarding.enum';
import { ExitTrackingRepository } from '../offboarding/repository/exit-tracking.repository';
import { OnboardingStatus } from '../onboarding/enum/onboarding-status.enum';
import { LeaveCategory } from '../organization/entity/organization.schema';
import { JobTitleRepository } from '../organization/repository/job-title.repository';
import { OrganizationDepartmentRepository } from '../organization/repository/organization-department.repository';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { EmployeeRequestDocument } from '../request/entity/request.schema';
import { EmployeeRequestStatus } from '../request/enum/request.enum';
import { RequestRepository } from '../request/repository/request.repository';
import { DueDate } from '../../generic/setting/employee-profiles/enum/employee-profile.enum';
import { RequestType } from '../../generic/setting/request-management/enum/request-management.enum';
import {
  EmployeeAnalysisQueryDto,
  LeaveAnalysisQueryDto,
  OffboardingAnalysisQueryDto,
  OnboardingAnalysisQueryDto,
} from './dto/analytics.dto';
import {
  AnalyticsCountItem,
  AnalyticsMonthBucket,
  AnalyticsOverview,
  AnalyticsOverviewSection,
  AnalyticsPeriod,
  ExitAnalysisRecord,
  OnboardingAnalysisRecord,
} from './interface/analytics.interface';
import {
  AnalyticsSection,
  ANALYTICS_SECTION_LABELS,
} from './enum/analytics.enum';

const DEFAULT_PAGE_SIZE = 10;
const MAX_MONTH_BUCKETS = 36;
const UPCOMING_LEAVE_DAYS = 30;

interface DateRange extends AnalyticsPeriod {
  start: Date;
  end: Date;
}

interface OnboardingRecord extends OnboardingAnalysisRecord {
  employmentDateValue: Date | null;
  startedAtValue: Date | null;
  completedAtValue: Date | null;
  dueDateValue: Date | null;
  steps: EmployeeOnboardingStep[];
}

interface ExitRecord extends ExitAnalysisRecord {
  request: EmployeeRequestDocument;
  tracking: ExitTrackingDocument | null;
  lastWorkingDayValue: Date | null;
  createdAtValue: Date | null;
  completedAtValue: Date | null;
}

interface LeaveCategoryTotals {
  leaveCategoryId: string;
  label: string;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  utilizationRate: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(OrganizationRepository)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(OrganizationDepartmentRepository)
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
    @Inject(JobTitleRepository)
    private readonly jobTitleRepository: JobTitleRepository,
    @Inject(LeaveRequestRepository)
    private readonly leaveRequestRepository: LeaveRequestRepository,
    @Inject(LeaveBalanceRepository)
    private readonly leaveBalanceRepository: LeaveBalanceRepository,
    @Inject(RequestRepository)
    private readonly requestRepository: RequestRepository,
    @Inject(ExitTrackingRepository)
    private readonly exitTrackingRepository: ExitTrackingRepository,
  ) {}

  /**
   * @Responsibility: Build the Report & Analysis overview. Each section reports
   * whether it has data yet so the UI can render its empty state per section.
   */
  async getOverview(organizationId: string): Promise<AnalyticsOverview> {
    try {
      const year = new Date().getFullYear();
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

      const employees = await this.employeeRepository.findByOrganization(
        organizationId,
        'employeeOnboardingSteps createdAt updatedAt',
      );

      const [leaveCount, exitCount, latestLeave, latestExit] =
        await Promise.all([
          this.leaveRequestRepository.count({
            organizationId,
            startDate: { $lte: yearEnd },
            endDate: { $gte: yearStart },
          }),
          this.requestRepository.count({
            organizationId,
            requestType: RequestType.EMPLOYEE_TERMINATION,
          }),
          this.leaveRequestRepository.findAll(
            { organizationId },
            { createdAt: -1 },
            1,
          ),
          this.requestRepository.findAll(
            {
              organizationId,
              requestType: RequestType.EMPLOYEE_TERMINATION,
            },
            { createdAt: -1 },
            1,
          ),
        ]);

      const onboardingCount = employees.filter(
        (employee) => (employee.employeeOnboardingSteps ?? []).length > 0,
      ).length;

      const employeeLastActivity = this.maxDate(
        employees
          .map((employee) => {
            const timestamps = employee as EmployeeDocument & {
              createdAt?: Date;
              updatedAt?: Date;
            };
            return timestamps.updatedAt ?? timestamps.createdAt;
          })
          .filter((value): value is Date => value != null),
      );

      const onboardingLastActivity = this.maxDate(
        employees.flatMap((employee) =>
          (employee.employeeOnboardingSteps ?? []).flatMap((step) =>
            [step.startedAt, step.completedAt].filter(
              (value): value is Date => value != null,
            ),
          ),
        ),
      );

      const sections: AnalyticsOverviewSection[] = [
        this.toOverviewSection(
          AnalyticsSection.EMPLOYEE,
          employees.length,
          employeeLastActivity,
        ),
        this.toOverviewSection(
          AnalyticsSection.ONBOARDING,
          onboardingCount,
          onboardingLastActivity,
        ),
        this.toOverviewSection(
          AnalyticsSection.LEAVE,
          leaveCount,
          latestLeave[0]?.createdAt ?? null,
        ),
        this.toOverviewSection(
          AnalyticsSection.OFFBOARDING,
          exitCount,
          latestExit[0]?.createdAt ?? null,
        ),
      ];

      return {
        generatedAt: new Date().toISOString(),
        hasData: sections.some((section) => section.available),
        sections,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getOverview.name);
    }
  }

  /**
   * @Responsibility: Headcount and demographic analysis for the organisation:
   * status, department, job title, employment type, work mode, location, sex,
   * age and tenure distributions, plus hiring trend and recent hires.
   */
  async getEmployeeAnalysis(
    organizationId: string,
    query: EmployeeAnalysisQueryDto,
  ) {
    try {
      const range = this.resolveDateRange(query.startDate, query.endDate);
      const [employees, departments, jobTitles] = await Promise.all([
        this.employeeRepository.findByOrganization(organizationId),
        this.organizationDepartmentRepository.findByOrganization(
          organizationId,
          'code name',
        ),
        this.jobTitleRepository.findByOrganization(organizationId, 'code name'),
      ]);

      const departmentMap = new Map(
        departments.map((department) => [department.code, department.name]),
      );
      const jobTitleMap = new Map(
        jobTitles.map((jobTitle) => [jobTitle.code, jobTitle.name]),
      );

      const filtered = this.filterEmployees(employees, query);
      const total = filtered.length;

      const statusCounts = new Map<string, number>();
      const employeeTypeCounts = new Map<string, number>();
      const jobTypeCounts = new Map<string, number>();
      const workModeCounts = new Map<string, number>();
      const sexCounts = new Map<string, number>();
      const ageBandCounts = new Map<string, number>();
      const tenureBandCounts = new Map<string, number>();

      for (const employee of filtered) {
        this.increment(statusCounts, employee.status || 'unspecified');
        this.increment(
          employeeTypeCounts,
          employee.employeeType || 'unspecified',
        );
        this.increment(jobTypeCounts, employee.jobType || 'unspecified');
        this.increment(workModeCounts, employee.workMode || 'unspecified');
        this.increment(
          sexCounts,
          employee.personalDetails?.sex || 'unspecified',
        );
        this.increment(
          ageBandCounts,
          this.getAgeBand(employee.personalDetails?.dateOfBirth ?? null),
        );
        this.increment(
          tenureBandCounts,
          this.getTenureBand(employee.employmentDate),
        );
      }

      const statusTotals = {
        draft: statusCounts.get(EmployeeStatus.DRAFT) ?? 0,
        active: statusCounts.get(EmployeeStatus.ACTIVE) ?? 0,
        onLeave: statusCounts.get(EmployeeStatus.ON_LEAVE) ?? 0,
        suspended: statusCounts.get(EmployeeStatus.SUSPENDED) ?? 0,
        terminated: statusCounts.get(EmployeeStatus.TERMINATED) ?? 0,
      };

      const hiresInRange = filtered.filter((employee) =>
        this.isWithin(employee.employmentDate, range),
      );

      const monthBuckets = this.buildMonthBuckets(range.start, range.end);
      const trend = monthBuckets.map((bucket) => {
        const hires = filtered.filter((employee) =>
          this.isWithin(employee.employmentDate, bucket),
        ).length;
        const headcount = filtered.filter((employee) => {
          if (!employee.employmentDate) return false;
          return new Date(employee.employmentDate) <= bucket.end;
        }).length;

        return {
          month: bucket.key,
          label: bucket.label,
          hires,
          headcount,
        };
      });

      const sortedByEmploymentDate = [...filtered].sort((a, b) => {
        const aTime = a.employmentDate
          ? new Date(a.employmentDate).getTime()
          : 0;
        const bTime = b.employmentDate
          ? new Date(b.employmentDate).getTime()
          : 0;
        return bTime - aTime;
      });

      const { batch, limit } = this.resolvePagination(query);
      const data = sortedByEmploymentDate
        .slice((batch - 1) * limit, batch * limit)
        .map((employee) =>
          this.toEmployeeAnalysisRow(employee, departmentMap, jobTitleMap),
        );

      return {
        generatedAt: new Date().toISOString(),
        period: { startDate: range.startDate, endDate: range.endDate },
        totals: {
          total,
          ...statusTotals,
          newHires: hiresInRange.length,
          turnoverRate: this.percent(statusTotals.terminated, total),
          averageTenureMonths: this.average(
            filtered
              .map((employee) =>
                this.monthsBetween(employee.employmentDate, new Date()),
              )
              .filter((value): value is number => value != null),
          ),
        },
        byStatus: this.toCountItems(statusCounts, total),
        byDepartment: this.toDepartmentCounts(filtered, departmentMap),
        byJobTitle: this.toJobTitleCounts(filtered, jobTitleMap),
        byEmploymentType: this.toCountItems(employeeTypeCounts, total),
        byJobType: this.toCountItems(jobTypeCounts, total),
        byWorkMode: this.toCountItems(workModeCounts, total),
        byLocation: this.toCountItems(
          this.countBy(filtered, (employee) =>
            this.normaliseKey(employee.location),
          ),
          total,
        ),
        bySex: this.toCountItems(sexCounts, total, {
          [Sex.MALE]: 'Male',
          [Sex.FEMALE]: 'Female',
        }),
        byAgeBand: this.toCountItems(ageBandCounts, total),
        byTenureBand: this.toCountItems(tenureBandCounts, total),
        trend,
        data,
        count: total,
        page: batch,
        limit,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getEmployeeAnalysis.name);
    }
  }

  /**
   * @Responsibility: Onboarding pipeline analysis: status mix, completion rate
   * and duration, overdue load, step bottlenecks, department breakdown, monthly
   * starts/completions, upcoming due dates and the paginated employee list.
   */
  async getOnboardingAnalysis(
    organizationId: string,
    query: OnboardingAnalysisQueryDto,
  ) {
    try {
      const range = this.resolveDateRange(query.startDate, query.endDate);
      const [employees, departments, jobTitles] = await Promise.all([
        this.employeeRepository.findByOrganization(organizationId),
        this.organizationDepartmentRepository.findByOrganization(
          organizationId,
          'code name',
        ),
        this.jobTitleRepository.findByOrganization(organizationId, 'code name'),
      ]);

      const departmentMap = new Map(
        departments.map((department) => [department.code, department.name]),
      );
      const jobTitleMap = new Map(
        jobTitles.map((jobTitle) => [jobTitle.code, jobTitle.name]),
      );

      const records = employees
        .filter(
          (employee) => (employee.employeeOnboardingSteps ?? []).length > 0,
        )
        .map((employee) =>
          this.toOnboardingRecord(employee, departmentMap, jobTitleMap),
        )
        .filter((record) => this.matchesOnboardingFilters(record, query))
        .filter((record) => !query.status || record.status === query.status);

      const total = records.length;
      const statusCounts = new Map<string, number>();
      const departmentCounts = new Map<
        string,
        { total: number; onboarded: number; overdue: number }
      >();
      const jobTitleCounts = new Map<string, number>();
      const stepCounts = new Map<
        string,
        {
          stepId: string;
          stepName: string;
          total: number;
          completed: number;
          overdue: number;
        }
      >();

      for (const record of records) {
        this.increment(statusCounts, record.status);

        const departmentKey = record.departmentCode ?? 'unspecified';
        const departmentEntry = departmentCounts.get(departmentKey) ?? {
          total: 0,
          onboarded: 0,
          overdue: 0,
        };
        departmentEntry.total += 1;
        if (record.status === OnboardingStatus.ONBOARDED) {
          departmentEntry.onboarded += 1;
        }
        if (record.status === OnboardingStatus.OVERDUE) {
          departmentEntry.overdue += 1;
        }
        departmentCounts.set(departmentKey, departmentEntry);

        this.increment(
          jobTitleCounts,
          record.jobTitleCode ?? record.jobTitle ?? 'unspecified',
        );

        for (const step of record.steps) {
          const stepEntry = stepCounts.get(step.stepId) ?? {
            stepId: step.stepId,
            stepName: step.stepName,
            total: 0,
            completed: 0,
            overdue: 0,
          };
          stepEntry.total += 1;
          if (step.isCompleted) {
            stepEntry.completed += 1;
          } else if (
            this.isOnboardingStepOverdue(step, record.employmentDateValue)
          ) {
            stepEntry.overdue += 1;
          }
          stepCounts.set(step.stepId, stepEntry);
        }
      }

      const monthBuckets = this.buildMonthBuckets(range.start, range.end);
      const trend = monthBuckets.map((bucket) => ({
        month: bucket.key,
        label: bucket.label,
        started: records.filter((record) =>
          this.isWithin(record.startedAtValue, bucket),
        ).length,
        completed: records.filter((record) =>
          this.isWithin(record.completedAtValue, bucket),
        ).length,
      }));

      const today = this.startOfDay(new Date());
      const upcomingDue = records
        .filter(
          (record) =>
            record.status !== OnboardingStatus.ONBOARDED &&
            record.dueDateValue != null &&
            record.dueDateValue >= today &&
            record.dueDateValue <= this.addDays(today, 30),
        )
        .sort(
          (a, b) =>
            (a.dueDateValue?.getTime() ?? 0) - (b.dueDateValue?.getTime() ?? 0),
        )
        .slice(0, 10);

      const sortedRecords = [...records].sort((a, b) => {
        const priority =
          this.onboardingStatusPriority(a.status) -
          this.onboardingStatusPriority(b.status);
        if (priority !== 0) return priority;
        return (
          (a.dueDateValue?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (b.dueDateValue?.getTime() ?? Number.MAX_SAFE_INTEGER)
        );
      });

      const { batch, limit } = this.resolvePagination(query);
      const data = sortedRecords
        .slice((batch - 1) * limit, batch * limit)
        .map((record) => this.toOnboardingView(record));

      const onboarded = statusCounts.get(OnboardingStatus.ONBOARDED) ?? 0;
      const overdue = statusCounts.get(OnboardingStatus.OVERDUE) ?? 0;

      return {
        generatedAt: new Date().toISOString(),
        period: { startDate: range.startDate, endDate: range.endDate },
        totals: {
          total,
          draft: statusCounts.get(OnboardingStatus.DRAFT) ?? 0,
          incomplete: statusCounts.get(OnboardingStatus.INCOMPLETE) ?? 0,
          overdue,
          onboarded,
          completionRate: this.percent(onboarded, total),
          overdueRate: this.percent(overdue, total),
          averageCompletionDays: this.average(
            records
              .map((record) => record.completionDays)
              .filter((value): value is number => value != null),
          ),
        },
        byStatus: this.toCountItems(statusCounts, total),
        byDepartment: [...departmentCounts.entries()]
          .map(([key, value]) => ({
            key,
            label:
              departmentMap.get(key) ??
              (key === 'unspecified' ? 'Unspecified' : key),
            total: value.total,
            onboarded: value.onboarded,
            overdue: value.overdue,
            completionRate: this.percent(value.onboarded, value.total),
          }))
          .sort((a, b) => b.total - a.total),
        byJobTitle: this.toCountItems(jobTitleCounts, total),
        byStep: [...stepCounts.values()]
          .map((step) => ({
            ...step,
            completionRate: this.percent(step.completed, step.total),
            overdueRate: this.percent(step.overdue, step.total),
          }))
          .sort((a, b) => b.overdue - a.overdue || b.total - a.total),
        trend,
        upcomingDue: upcomingDue.map((record) => ({
          ...this.toOnboardingView(record),
          daysUntilDue: record.dueDateValue
            ? this.daysBetween(today, record.dueDateValue)
            : null,
        })),
        data,
        count: total,
        page: batch,
        limit,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getOnboardingAnalysis.name);
    }
  }

  /**
   * @Responsibility: Leave analysis for a year: utilisation, category and
   * department breakdowns, monthly volume, top leave takers, upcoming approved
   * leaves and the paginated per-employee balance list.
   */
  async getLeaveAnalysis(organizationId: string, query: LeaveAnalysisQueryDto) {
    try {
      const year = query.year ?? new Date().getFullYear();
      const range = this.resolveYearRange(year, query.startDate, query.endDate);

      const [organization, employees, departments, jobTitles] =
        await Promise.all([
          this.organizationRepository.findOrg(
            { _id: organizationId },
            'leaveManagement',
          ),
          this.employeeRepository.findByOrganization(organizationId),
          this.organizationDepartmentRepository.findByOrganization(
            organizationId,
            'code name',
          ),
          this.jobTitleRepository.findByOrganization(
            organizationId,
            'code name',
          ),
        ]);

      const categories: LeaveCategory[] =
        organization?.leaveManagement?.leaveCategories ?? [];
      const departmentMap = new Map(
        departments.map((department) => [department.code, department.name]),
      );
      const jobTitleMap = new Map(
        jobTitles.map((jobTitle) => [jobTitle.code, jobTitle.name]),
      );

      const filteredEmployees = this.filterEmployees(
        employees.filter(
          (employee) => employee.status !== EmployeeStatus.DRAFT,
        ),
        {
          search: query.search,
          departmentCode: query.departmentCode,
          jobTitleCode: query.jobTitleCode,
        },
      );
      const employeeIds = filteredEmployees.map((employee) =>
        String(employee._id),
      );

      const [balances, allRequests, upcomingLeaves] = await Promise.all([
        this.leaveBalanceRepository.findForEmployeesYear(
          organizationId,
          employeeIds,
          year,
        ),
        this.leaveRequestRepository.findAll(
          {
            organizationId,
            employeeId: { $in: employeeIds },
            startDate: { $lte: range.end },
            endDate: { $gte: range.start },
          },
          { startDate: 1 },
        ),
        this.leaveRequestRepository.findAll(
          {
            organizationId,
            employeeId: { $in: employeeIds },
            status: LeaveRequestStatus.APPROVED,
            startDate: {
              $gte: this.startOfDay(new Date()),
              $lte: this.addDays(new Date(), UPCOMING_LEAVE_DAYS),
            },
          },
          { startDate: 1 },
          10,
        ),
      ]);

      const requests = query.status
        ? allRequests.filter((request) => request.status === query.status)
        : allRequests;

      const balanceMap = new Map(
        balances.map((balance) => [
          this.balanceKey(balance.employeeId, balance.leaveCategoryId),
          balance,
        ]),
      );

      const categoryTotals = this.buildLeaveCategoryTotals(
        categories,
        filteredEmployees,
        balanceMap,
        requests,
      );

      const totals = this.buildLeaveTotals(
        filteredEmployees,
        categories,
        balanceMap,
        requests,
      );

      const today = this.startOfDay(new Date());
      const onLeaveToday = new Set(
        allRequests
          .filter(
            (request) =>
              request.status === LeaveRequestStatus.APPROVED &&
              this.startOfDay(request.startDate) <= today &&
              this.startOfDay(request.endDate) >= today,
          )
          .map((request) => request.employeeId),
      );

      const monthBuckets = this.buildMonthBuckets(range.start, range.end);
      const trend = monthBuckets.map((bucket) => {
        const monthly = requests.filter((request) =>
          this.isWithin(request.startDate, bucket),
        );
        const approved = monthly.filter(
          (request) => request.status === LeaveRequestStatus.APPROVED,
        );
        const pending = monthly.filter(
          (request) => request.status === LeaveRequestStatus.PENDING,
        );
        const rejected = monthly.filter(
          (request) => request.status === LeaveRequestStatus.REJECTED,
        );
        const cancelled = monthly.filter(
          (request) => request.status === LeaveRequestStatus.CANCELLED,
        );

        return {
          month: bucket.key,
          label: bucket.label,
          requestCount: monthly.length,
          approvedDays: this.roundDays(
            approved.reduce(
              (total, request) => total + request.durationDays,
              0,
            ),
          ),
          pendingDays: this.roundDays(
            pending.reduce((total, request) => total + request.durationDays, 0),
          ),
          rejectedDays: this.roundDays(
            rejected.reduce(
              (total, request) => total + request.durationDays,
              0,
            ),
          ),
          cancelledDays: this.roundDays(
            cancelled.reduce(
              (total, request) => total + request.durationDays,
              0,
            ),
          ),
        };
      });

      const departmentTotals = this.buildLeaveDepartmentTotals(
        filteredEmployees,
        categories,
        balanceMap,
        requests,
        departmentMap,
      );

      const topTakers = this.buildTopLeaveTakers(requests, 5);

      const sortedEmployees = [...filteredEmployees].sort((a, b) =>
        this.getEmployeeName(a).localeCompare(this.getEmployeeName(b)),
      );

      const { batch, limit } = this.resolvePagination(query);
      const data = sortedEmployees
        .slice((batch - 1) * limit, batch * limit)
        .map((employee) =>
          this.toLeaveEmployeeSummary(
            employee,
            categories,
            balanceMap,
            requests,
            departmentMap,
            jobTitleMap,
          ),
        );

      return {
        generatedAt: new Date().toISOString(),
        year,
        period: { startDate: range.startDate, endDate: range.endDate },
        totals: {
          totalEmployees: totals.totalEmployees,
          entitledDays: totals.entitledDays,
          usedDays: totals.usedDays,
          pendingDays: totals.pendingDays,
          remainingDays: totals.remainingDays,
          utilizationRate: this.percent(totals.usedDays, totals.entitledDays),
          totalRequests: requests.length,
          approvedRequests: requests.filter(
            (request) => request.status === LeaveRequestStatus.APPROVED,
          ).length,
          pendingRequests: requests.filter(
            (request) => request.status === LeaveRequestStatus.PENDING,
          ).length,
          rejectedRequests: requests.filter(
            (request) => request.status === LeaveRequestStatus.REJECTED,
          ).length,
          cancelledRequests: requests.filter(
            (request) => request.status === LeaveRequestStatus.CANCELLED,
          ).length,
          onLeaveToday: onLeaveToday.size,
          averageDurationDays: this.roundDays(
            this.average(requests.map((request) => request.durationDays)),
          ),
        },
        byCategory: categoryTotals,
        byDepartment: departmentTotals,
        byMonth: trend,
        topTakers,
        upcomingLeaves: upcomingLeaves.map((request) =>
          this.toLeaveRequestView(request),
        ),
        data,
        count: filteredEmployees.length,
        page: batch,
        limit,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getLeaveAnalysis.name);
    }
  }

  /**
   * @Responsibility: Offboarding analysis: exit status mix, types and reasons,
   * department breakdown, monthly exits, upcoming exits, completion duration,
   * tenure at exit and checklist/document completion.
   */
  async getOffboardingAnalysis(
    organizationId: string,
    query: OffboardingAnalysisQueryDto,
  ) {
    try {
      const range = this.resolveDateRange(query.startDate, query.endDate);
      const upcomingDays = query.upcomingDays ?? 30;

      const [employees, departments, requests] = await Promise.all([
        this.employeeRepository.findByOrganization(organizationId),
        this.organizationDepartmentRepository.findByOrganization(
          organizationId,
          'code name',
        ),
        this.requestRepository.findAll(
          {
            organizationId,
            requestType: RequestType.EMPLOYEE_TERMINATION,
            createdAt: { $gte: range.start, $lte: range.end },
          } as QueryFilter<EmployeeRequestDocument>,
          { createdAt: -1 },
        ),
      ]);

      const departmentMap = new Map(
        departments.map((department) => [department.code, department.name]),
      );
      const requestIds = requests.map((request) => String(request._id));
      const trackings = await this.exitTrackingRepository.findByRequestIds(
        organizationId,
        requestIds,
      );
      const trackingMap = new Map(
        trackings.map((tracking) => [tracking.requestId, tracking]),
      );

      const records = requests
        .map((request) =>
          this.toExitRecord(
            request,
            trackingMap.get(String(request._id)) ?? null,
            departmentMap,
          ),
        )
        .filter((record) => this.matchesExitFilters(record, query))
        .filter((record) => !query.status || record.status === query.status);

      const total = records.length;
      const statusCounts = new Map<string, number>();
      const typeCounts = new Map<string, number>();
      const reasonCounts = new Map<string, number>();
      const departmentCounts = new Map<string, number>();

      for (const record of records) {
        this.increment(statusCounts, record.status);
        this.increment(typeCounts, record.exitType?.label ?? 'unspecified');
        this.increment(reasonCounts, record.exitReason?.label ?? 'unspecified');
        this.increment(
          departmentCounts,
          record.departmentCode ?? 'unspecified',
        );
      }

      const monthBuckets = this.buildMonthBuckets(range.start, range.end);
      const trend = monthBuckets.map((bucket) => ({
        month: bucket.key,
        label: bucket.label,
        exits: records.filter(
          (record) =>
            record.status === ExitRequestStatus.COMPLETED &&
            this.isWithin(record.lastWorkingDayValue, bucket),
        ).length,
      }));

      const today = this.startOfDay(new Date());
      const upcoming = records
        .filter(
          (record) =>
            (record.status === ExitRequestStatus.PENDING ||
              record.status === ExitRequestStatus.IN_PROGRESS) &&
            record.lastWorkingDayValue != null &&
            record.lastWorkingDayValue >= today &&
            record.lastWorkingDayValue <= this.addDays(today, upcomingDays),
        )
        .sort(
          (a, b) =>
            (a.lastWorkingDayValue?.getTime() ?? 0) -
            (b.lastWorkingDayValue?.getTime() ?? 0),
        );

      const completedRecords = records.filter(
        (record) => record.status === ExitRequestStatus.COMPLETED,
      );

      const exitDurations = completedRecords
        .map((record) => {
          if (!record.completedAtValue || !record.createdAtValue) {
            return null;
          }
          return this.daysBetween(
            record.createdAtValue,
            record.completedAtValue,
          );
        })
        .filter((value): value is number => value != null);

      const tenureAtExit = completedRecords
        .map((record) => {
          const employmentDate = record.request.employee?.employmentDate
            ? new Date(record.request.employee.employmentDate)
            : null;
          const exitDate =
            record.lastWorkingDayValue ?? record.completedAtValue;
          if (!employmentDate || !exitDate) {
            return null;
          }
          return this.monthsBetween(employmentDate, exitDate);
        })
        .filter((value): value is number => value != null);

      const activeEmployees = employees.filter(
        (employee) => employee.status !== EmployeeStatus.DRAFT,
      ).length;

      const sortedRecords = [...records].sort((a, b) => {
        const aTime =
          a.lastWorkingDayValue?.getTime() ?? a.createdAtValue?.getTime() ?? 0;
        const bTime =
          b.lastWorkingDayValue?.getTime() ?? b.createdAtValue?.getTime() ?? 0;
        return bTime - aTime;
      });

      const { batch, limit } = this.resolvePagination(query);
      const data = sortedRecords
        .slice((batch - 1) * limit, batch * limit)
        .map((record) => this.toExitView(record));

      const completed = statusCounts.get(ExitRequestStatus.COMPLETED) ?? 0;
      const onExit =
        (statusCounts.get(ExitRequestStatus.PENDING) ?? 0) +
        (statusCounts.get(ExitRequestStatus.IN_PROGRESS) ?? 0);

      return {
        generatedAt: new Date().toISOString(),
        period: { startDate: range.startDate, endDate: range.endDate },
        upcomingDays,
        totals: {
          total,
          pending: statusCounts.get(ExitRequestStatus.PENDING) ?? 0,
          inProgress: statusCounts.get(ExitRequestStatus.IN_PROGRESS) ?? 0,
          completed,
          cancelled: statusCounts.get(ExitRequestStatus.CANCELLED) ?? 0,
          rejected: statusCounts.get(ExitRequestStatus.REJECTED) ?? 0,
          onExit,
          upcomingExits: upcoming.length,
          attritionRate: this.percent(completed, activeEmployees),
          averageExitDurationDays: this.roundDays(this.average(exitDurations)),
          averageTenureMonths: this.average(tenureAtExit),
        },
        byStatus: this.toCountItems(statusCounts, total),
        byExitType: this.toCountItems(typeCounts, total),
        byExitReason: this.toCountItems(reasonCounts, total),
        byDepartment: this.toExitDepartmentCounts(
          departmentCounts,
          departmentMap,
          total,
        ),
        checklistCompletion: {
          exitChecklist: this.average(
            completedRecords.map((record) =>
              this.progressPercent(record.tracking?.exitChecklist ?? []),
            ),
          ),
          complianceChecklist: this.average(
            completedRecords.map((record) =>
              this.progressPercent(record.tracking?.complianceChecklist ?? []),
            ),
          ),
          employerDocuments: this.average(
            completedRecords.map((record) =>
              this.progressPercent(record.tracking?.employerDocuments ?? []),
            ),
          ),
        },
        trend,
        upcomingExits: upcoming.map((record) => ({
          ...this.toExitView(record),
          daysUntil: record.lastWorkingDayValue
            ? this.daysBetween(today, record.lastWorkingDayValue)
            : null,
        })),
        data,
        count: total,
        page: batch,
        limit,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getOffboardingAnalysis.name);
    }
  }

  private toOverviewSection(
    key: AnalyticsSection,
    recordCount: number,
    lastActivityAt: Date | null,
  ): AnalyticsOverviewSection {
    return {
      key,
      label: ANALYTICS_SECTION_LABELS[key],
      available: recordCount > 0,
      recordCount,
      lastActivityAt: lastActivityAt
        ? new Date(lastActivityAt).toISOString()
        : null,
    };
  }

  private filterEmployees(
    employees: EmployeeDocument[],
    query: {
      search?: string;
      departmentCode?: string;
      jobTitleCode?: string;
      status?: string;
      employeeType?: string;
      jobType?: string;
      workMode?: string;
      location?: string;
    },
  ): EmployeeDocument[] {
    const search = query.search?.trim().toLowerCase();
    const location = query.location?.trim().toLowerCase();

    return employees
      .filter(
        (employee) =>
          !query.departmentCode ||
          employee.departmentCode === query.departmentCode,
      )
      .filter(
        (employee) =>
          !query.jobTitleCode || employee.jobTitleCode === query.jobTitleCode,
      )
      .filter((employee) => !query.status || employee.status === query.status)
      .filter(
        (employee) =>
          !query.employeeType || employee.employeeType === query.employeeType,
      )
      .filter(
        (employee) => !query.jobType || employee.jobType === query.jobType,
      )
      .filter(
        (employee) => !query.workMode || employee.workMode === query.workMode,
      )
      .filter(
        (employee) =>
          !location || (employee.location ?? '').toLowerCase() === location,
      )
      .filter((employee) => {
        if (!search) return true;
        return [
          this.getEmployeeName(employee),
          employee.email,
          employee.employeeId,
          employee.employeeUniqueId,
          employee.departmentCode,
          employee.jobTitleCode,
        ].some((value) => value?.toLowerCase().includes(search));
      });
  }

  private toEmployeeAnalysisRow(
    employee: EmployeeDocument,
    departmentMap: Map<string, string>,
    jobTitleMap: Map<string, string>,
  ) {
    return {
      employeeId: String(employee._id),
      employeeUniqueId: employee.employeeUniqueId ?? null,
      employeeName: this.getEmployeeName(employee),
      email: employee.email,
      avatarUrl: employee.avatarUrl ?? null,
      departmentCode: employee.departmentCode ?? null,
      department: employee.departmentCode
        ? (departmentMap.get(employee.departmentCode) ?? null)
        : null,
      jobTitleCode: employee.jobTitleCode ?? null,
      jobTitle: employee.jobTitleCode
        ? (jobTitleMap.get(employee.jobTitleCode) ?? null)
        : null,
      employmentDate: this.formatDate(employee.employmentDate),
      status: employee.status,
      employeeType: employee.employeeType ?? null,
      jobType: employee.jobType ?? null,
      workMode: employee.workMode ?? null,
      location: employee.location ?? null,
      ageBand: this.getAgeBand(employee.personalDetails?.dateOfBirth ?? null),
      tenureBand: this.getTenureBand(employee.employmentDate),
    };
  }

  private toOnboardingRecord(
    employee: EmployeeDocument,
    departmentMap: Map<string, string>,
    jobTitleMap: Map<string, string>,
  ): OnboardingRecord {
    const steps = employee.employeeOnboardingSteps ?? [];
    const totalSteps = steps.length;
    const completedSteps = steps.filter((step) => step.isCompleted).length;
    const overallProgress =
      totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
    const status = this.getOnboardingStatus(
      steps,
      employee.employmentDate,
      overallProgress,
    );

    const startedAtValue = this.minDate(
      steps
        .map((step) => step.startedAt)
        .filter((value): value is Date => value != null),
    );
    const completedAtValue =
      status === OnboardingStatus.ONBOARDED
        ? this.maxDate(
            steps
              .map((step) => step.completedAt)
              .filter((value): value is Date => value != null),
          )
        : null;

    const nextDueDate = this.minDate(
      steps
        .filter(
          (step): step is EmployeeOnboardingStep & { dueDate: DueDate } =>
            !step.isCompleted && step.dueDate != null,
        )
        .map((step) =>
          this.resolveStepDueDate(employee.employmentDate, step.dueDate),
        )
        .filter((value): value is Date => value != null),
    );

    const completionDays =
      startedAtValue && completedAtValue
        ? this.daysBetween(startedAtValue, completedAtValue)
        : null;

    return {
      employeeId: String(employee._id),
      employeeUniqueId: employee.employeeUniqueId ?? null,
      employeeName: this.getEmployeeName(employee),
      email: employee.email,
      avatarUrl: employee.avatarUrl ?? null,
      departmentCode: employee.departmentCode ?? null,
      department: employee.departmentCode
        ? (departmentMap.get(employee.departmentCode) ?? null)
        : null,
      jobTitleCode: employee.jobTitleCode ?? null,
      jobTitle: employee.jobTitleCode
        ? (jobTitleMap.get(employee.jobTitleCode) ?? null)
        : null,
      employmentDate: this.formatDate(employee.employmentDate),
      startedAt: this.formatDate(startedAtValue),
      completedAt: this.formatDate(completedAtValue),
      status,
      overallProgress,
      completedSteps,
      totalSteps,
      dueDate: this.formatDate(nextDueDate),
      completionDays,
      employmentDateValue: employee.employmentDate
        ? new Date(employee.employmentDate)
        : null,
      startedAtValue,
      completedAtValue,
      dueDateValue: nextDueDate,
      steps,
    };
  }

  private toOnboardingView(record: OnboardingRecord): OnboardingAnalysisRecord {
    return {
      employeeId: record.employeeId,
      employeeUniqueId: record.employeeUniqueId,
      employeeName: record.employeeName,
      email: record.email,
      avatarUrl: record.avatarUrl,
      departmentCode: record.departmentCode,
      department: record.department,
      jobTitleCode: record.jobTitleCode,
      jobTitle: record.jobTitle,
      employmentDate: record.employmentDate,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      status: record.status,
      overallProgress: record.overallProgress,
      completedSteps: record.completedSteps,
      totalSteps: record.totalSteps,
      dueDate: record.dueDate,
      completionDays: record.completionDays,
    };
  }

  private matchesOnboardingFilters(
    record: OnboardingRecord,
    query: OnboardingAnalysisQueryDto,
  ): boolean {
    const search = query.search?.trim().toLowerCase();

    if (
      query.departmentCode &&
      record.departmentCode !== query.departmentCode
    ) {
      return false;
    }

    if (query.jobTitleCode && record.jobTitleCode !== query.jobTitleCode) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      record.employeeName,
      record.email,
      record.employeeUniqueId,
      record.departmentCode,
      record.jobTitle,
    ].some((value) => value?.toLowerCase().includes(search));
  }

  private getOnboardingStatus(
    steps: EmployeeOnboardingStep[],
    employmentDate: Date | null | undefined,
    overallProgress: number,
  ): OnboardingStatus {
    if (overallProgress === 100) {
      return OnboardingStatus.ONBOARDED;
    }

    const now = new Date();
    const hasOverdueStep = steps.some((step) =>
      this.isOnboardingStepOverdue(step, employmentDate, now),
    );

    if (hasOverdueStep) {
      return OnboardingStatus.OVERDUE;
    }

    if (overallProgress === 0) {
      return OnboardingStatus.DRAFT;
    }

    return OnboardingStatus.INCOMPLETE;
  }

  private isOnboardingStepOverdue(
    step: EmployeeOnboardingStep,
    employmentDate: Date | null | undefined,
    now: Date = new Date(),
  ): boolean {
    if (step.isCompleted || !step.dueDate || !employmentDate) {
      return false;
    }

    const dueDate = this.resolveStepDueDate(employmentDate, step.dueDate);

    if (!dueDate) {
      return false;
    }

    dueDate.setHours(23, 59, 59, 999);

    return dueDate.getTime() < now.getTime();
  }

  private onboardingStatusPriority(status: string): number {
    switch (status) {
      case OnboardingStatus.OVERDUE:
        return 0;
      case OnboardingStatus.INCOMPLETE:
        return 1;
      case OnboardingStatus.DRAFT:
        return 2;
      case OnboardingStatus.ONBOARDED:
        return 3;
      default:
        return 4;
    }
  }

  private resolveStepDueDate(
    employmentDate: Date | null | undefined,
    dueDate: DueDate,
  ): Date | null {
    if (!employmentDate) {
      return null;
    }

    const daysAfterJoining = Number.parseInt(dueDate, 10);

    if (Number.isNaN(daysAfterJoining)) {
      return null;
    }

    const resolved = new Date(employmentDate);
    resolved.setDate(resolved.getDate() + daysAfterJoining);

    return resolved;
  }

  private buildLeaveCategoryTotals(
    categories: LeaveCategory[],
    employees: EmployeeDocument[],
    balanceMap: Map<string, LeaveBalanceDocument>,
    requests: LeaveRequestDocument[],
  ): LeaveCategoryTotals[] {
    return categories.map((category) => {
      let entitledDays = 0;

      for (const employee of employees) {
        const employeeId = String(employee._id);
        const balance = balanceMap.get(
          this.balanceKey(employeeId, category.id),
        ) as
          | {
              entitledDays?: number;
              carriedOverDays?: number;
              adjustmentDays?: number;
            }
          | undefined;
        entitledDays +=
          (balance?.entitledDays ?? category.entitlementDays ?? 0) +
          (balance?.carriedOverDays ?? 0) +
          (balance?.adjustmentDays ?? 0);
      }

      const categoryRequests = requests.filter(
        (request) => request.leaveCategoryId === category.id,
      );
      const usedDays = categoryRequests
        .filter((request) => request.status === LeaveRequestStatus.APPROVED)
        .reduce((total, request) => total + request.durationDays, 0);
      const pendingDays = categoryRequests
        .filter((request) => request.status === LeaveRequestStatus.PENDING)
        .reduce((total, request) => total + request.durationDays, 0);

      return {
        leaveCategoryId: category.id,
        label: category.label,
        entitledDays: this.roundDays(entitledDays),
        usedDays: this.roundDays(usedDays),
        pendingDays: this.roundDays(pendingDays),
        remainingDays: this.roundDays(entitledDays - usedDays - pendingDays),
        utilizationRate: this.percent(usedDays, entitledDays),
      };
    });
  }

  private buildLeaveTotals(
    employees: EmployeeDocument[],
    categories: LeaveCategory[],
    balanceMap: Map<string, LeaveBalanceDocument>,
    requests: LeaveRequestDocument[],
  ) {
    let entitledDays = 0;
    let usedDays = 0;
    let pendingDays = 0;

    for (const employee of employees) {
      const employeeId = String(employee._id);

      for (const category of categories) {
        const balance = balanceMap.get(
          this.balanceKey(employeeId, category.id),
        ) as
          | {
              entitledDays?: number;
              carriedOverDays?: number;
              adjustmentDays?: number;
            }
          | undefined;
        entitledDays +=
          (balance?.entitledDays ?? category.entitlementDays ?? 0) +
          (balance?.carriedOverDays ?? 0) +
          (balance?.adjustmentDays ?? 0);
      }
    }

    for (const request of requests) {
      if (request.status === LeaveRequestStatus.APPROVED) {
        usedDays += request.durationDays;
      } else if (request.status === LeaveRequestStatus.PENDING) {
        pendingDays += request.durationDays;
      }
    }

    return {
      totalEmployees: employees.length,
      entitledDays: this.roundDays(entitledDays),
      usedDays: this.roundDays(usedDays),
      pendingDays: this.roundDays(pendingDays),
      remainingDays: this.roundDays(entitledDays - usedDays - pendingDays),
    };
  }

  private buildLeaveDepartmentTotals(
    employees: EmployeeDocument[],
    categories: LeaveCategory[],
    balanceMap: Map<string, LeaveBalanceDocument>,
    requests: LeaveRequestDocument[],
    departmentMap: Map<string, string>,
  ) {
    const groups = new Map<
      string,
      {
        employees: EmployeeDocument[];
        entitledDays: number;
        usedDays: number;
        pendingDays: number;
      }
    >();

    const requestByEmployee = new Map<string, LeaveRequestDocument[]>();
    for (const request of requests) {
      const list = requestByEmployee.get(request.employeeId) ?? [];
      list.push(request);
      requestByEmployee.set(request.employeeId, list);
    }

    for (const employee of employees) {
      const key = employee.departmentCode ?? 'unspecified';
      const group = groups.get(key) ?? {
        employees: [],
        entitledDays: 0,
        usedDays: 0,
        pendingDays: 0,
      };
      group.employees.push(employee);

      let employeeEntitled = 0;
      for (const category of categories) {
        const balance = balanceMap.get(
          this.balanceKey(String(employee._id), category.id),
        ) as
          | {
              entitledDays?: number;
              carriedOverDays?: number;
              adjustmentDays?: number;
            }
          | undefined;
        employeeEntitled +=
          (balance?.entitledDays ?? category.entitlementDays ?? 0) +
          (balance?.carriedOverDays ?? 0) +
          (balance?.adjustmentDays ?? 0);
      }
      group.entitledDays += employeeEntitled;

      const employeeRequests =
        requestByEmployee.get(String(employee._id)) ?? [];
      group.usedDays += employeeRequests
        .filter((request) => request.status === LeaveRequestStatus.APPROVED)
        .reduce((total, request) => total + request.durationDays, 0);
      group.pendingDays += employeeRequests
        .filter((request) => request.status === LeaveRequestStatus.PENDING)
        .reduce((total, request) => total + request.durationDays, 0);

      groups.set(key, group);
    }

    return [...groups.entries()]
      .map(([key, group]) => ({
        key,
        label:
          departmentMap.get(key) ??
          (key === 'unspecified' ? 'Unspecified' : key),
        employees: group.employees.length,
        entitledDays: this.roundDays(group.entitledDays),
        usedDays: this.roundDays(group.usedDays),
        pendingDays: this.roundDays(group.pendingDays),
        remainingDays: this.roundDays(
          group.entitledDays - group.usedDays - group.pendingDays,
        ),
        utilizationRate: this.percent(group.usedDays, group.entitledDays),
      }))
      .sort((a, b) => b.employees - a.employees);
  }

  private buildTopLeaveTakers(requests: LeaveRequestDocument[], limit: number) {
    const totals = new Map<
      string,
      {
        employeeId: string;
        employeeName: string | null;
        email: string | null;
        department: string | null;
        usedDays: number;
        requests: number;
      }
    >();

    for (const request of requests) {
      if (request.status !== LeaveRequestStatus.APPROVED) {
        continue;
      }

      const entry = totals.get(request.employeeId) ?? {
        employeeId: request.employeeId,
        employeeName: request.employee?.employeeName ?? null,
        email: request.employee?.email ?? null,
        department: request.employee?.department ?? null,
        usedDays: 0,
        requests: 0,
      };
      entry.usedDays += request.durationDays;
      entry.requests += 1;
      totals.set(request.employeeId, entry);
    }

    return [...totals.values()]
      .map((entry) => ({
        ...entry,
        usedDays: this.roundDays(entry.usedDays),
      }))
      .sort((a, b) => b.usedDays - a.usedDays)
      .slice(0, limit);
  }

  private toLeaveEmployeeSummary(
    employee: EmployeeDocument,
    categories: LeaveCategory[],
    balanceMap: Map<string, LeaveBalanceDocument>,
    requests: LeaveRequestDocument[],
    departmentMap: Map<string, string>,
    jobTitleMap: Map<string, string>,
  ) {
    const employeeId = String(employee._id);
    const employeeRequests = requests.filter(
      (request) => request.employeeId === employeeId,
    );

    const leaveBalances = categories.map((category) => {
      const balance = balanceMap.get(
        this.balanceKey(employeeId, category.id),
      ) as
        | {
            entitledDays?: number;
            carriedOverDays?: number;
            adjustmentDays?: number;
          }
        | undefined;
      const entitledDays =
        balance?.entitledDays ?? category.entitlementDays ?? 0;
      const carriedOverDays = balance?.carriedOverDays ?? 0;
      const adjustmentDays = balance?.adjustmentDays ?? 0;

      const categoryRequests = employeeRequests.filter(
        (request) => request.leaveCategoryId === category.id,
      );
      const usedDays = categoryRequests
        .filter((request) => request.status === LeaveRequestStatus.APPROVED)
        .reduce((total, request) => total + request.durationDays, 0);
      const pendingDays = categoryRequests
        .filter((request) => request.status === LeaveRequestStatus.PENDING)
        .reduce((total, request) => total + request.durationDays, 0);

      return {
        leaveCategoryId: category.id,
        label: category.label,
        entitledDays: this.roundDays(entitledDays),
        carriedOverDays: this.roundDays(carriedOverDays),
        adjustmentDays: this.roundDays(adjustmentDays),
        usedDays: this.roundDays(usedDays),
        pendingDays: this.roundDays(pendingDays),
        remainingDays: this.roundDays(
          entitledDays +
            carriedOverDays +
            adjustmentDays -
            usedDays -
            pendingDays,
        ),
      };
    });

    return {
      employeeId,
      employeeUniqueId: employee.employeeId ?? null,
      employeeName: this.getEmployeeName(employee),
      email: employee.email,
      avatarUrl: employee.avatarUrl ?? null,
      jobTitle: employee.jobTitleCode
        ? (jobTitleMap.get(employee.jobTitleCode) ?? null)
        : null,
      departmentCode: employee.departmentCode ?? null,
      department: employee.departmentCode
        ? (departmentMap.get(employee.departmentCode) ?? null)
        : null,
      status: employee.status,
      leaveBalances,
      totals: {
        entitledDays: this.roundDays(
          leaveBalances.reduce(
            (total, balance) =>
              total +
              balance.entitledDays +
              balance.carriedOverDays +
              balance.adjustmentDays,
            0,
          ),
        ),
        usedDays: this.roundDays(
          leaveBalances.reduce((total, balance) => total + balance.usedDays, 0),
        ),
        pendingDays: this.roundDays(
          leaveBalances.reduce(
            (total, balance) => total + balance.pendingDays,
            0,
          ),
        ),
        remainingDays: this.roundDays(
          leaveBalances.reduce(
            (total, balance) => total + balance.remainingDays,
            0,
          ),
        ),
      },
    };
  }

  private toLeaveRequestView(request: LeaveRequestDocument) {
    return {
      id: String(request._id),
      status: request.status,
      employee: {
        employeeId: request.employeeId,
        employeeUniqueId: request.employee?.employeeUniqueId ?? null,
        employeeName: request.employee?.employeeName ?? null,
        email: request.employee?.email ?? null,
        avatarUrl: request.employee?.avatarUrl ?? null,
        jobTitle: request.employee?.jobTitle ?? null,
        departmentCode: request.employee?.departmentCode ?? null,
        department: request.employee?.department ?? null,
      },
      leaveCategory: {
        id: request.leaveCategoryId,
        label: request.leaveCategory?.label ?? null,
      },
      startDate: this.formatDate(request.startDate),
      endDate: this.formatDate(request.endDate),
      durationDays: request.durationDays,
      requestedAt: this.formatDateTime(
        request.requestedAt ?? request.createdAt,
      ),
    };
  }

  private toExitRecord(
    request: EmployeeRequestDocument,
    tracking: ExitTrackingDocument | null,
    departmentMap: Map<string, string>,
  ): ExitRecord {
    const status = this.toExitStatus(request.status, tracking);
    const lastWorkingDay =
      this.detailString(
        (request.details ?? {}) as Record<string, unknown>,
        'terminationDate',
      ) ?? this.formatDate(request.effectiveDate);
    const lastWorkingDayValue = this.parseDate(lastWorkingDay, true);

    return {
      id: String(request._id),
      employeeId: request.employeeId,
      employeeUniqueId: request.employee?.employeeUniqueId ?? null,
      employeeName: request.employee?.employeeName ?? null,
      email: request.employee?.email ?? null,
      departmentCode: request.employee?.departmentCode ?? null,
      department:
        request.employee?.department ??
        (request.employee?.departmentCode
          ? (departmentMap.get(request.employee.departmentCode) ?? null)
          : null),
      jobTitle: request.employee?.jobTitle ?? null,
      exitType: this.resolveExitType(request, tracking),
      exitReason: this.resolveExitReason(request, tracking),
      lastWorkingDay,
      status,
      requestedAt: this.formatDateTime(request.createdAt),
      completedAt: this.formatDateTime(tracking?.completedAt),
      exitChecklistProgress: this.progressPercent(
        tracking?.exitChecklist ?? [],
      ),
      complianceProgress: this.progressPercent(
        tracking?.complianceChecklist ?? [],
      ),
      documentsProgress: this.progressPercent(
        tracking?.employerDocuments ?? [],
      ),
      request,
      tracking,
      lastWorkingDayValue,
      createdAtValue: request.createdAt ? new Date(request.createdAt) : null,
      completedAtValue: tracking?.completedAt
        ? new Date(tracking.completedAt)
        : null,
    };
  }

  private matchesExitFilters(
    record: ExitRecord,
    query: OffboardingAnalysisQueryDto,
  ): boolean {
    const search = query.search?.trim().toLowerCase();

    if (query.employeeId && record.employeeId !== query.employeeId) {
      return false;
    }

    if (
      query.departmentCode &&
      record.departmentCode !== query.departmentCode
    ) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      record.employeeName,
      record.email,
      record.employeeUniqueId,
      record.department,
      record.jobTitle,
    ].some((value) => value?.toLowerCase().includes(search));
  }

  private toExitView(record: ExitRecord): ExitAnalysisRecord {
    return {
      id: record.id,
      employeeId: record.employeeId,
      employeeUniqueId: record.employeeUniqueId,
      employeeName: record.employeeName,
      email: record.email,
      departmentCode: record.departmentCode,
      department: record.department,
      jobTitle: record.jobTitle,
      exitType: record.exitType,
      exitReason: record.exitReason,
      lastWorkingDay: record.lastWorkingDay,
      status: record.status,
      requestedAt: record.requestedAt,
      completedAt: record.completedAt,
      exitChecklistProgress: record.exitChecklistProgress,
      complianceProgress: record.complianceProgress,
      documentsProgress: record.documentsProgress,
    };
  }

  private toExitStatus(
    requestStatus: EmployeeRequestStatus | string,
    tracking?: ExitTrackingDocument | null,
  ): ExitRequestStatus {
    if (requestStatus === EmployeeRequestStatus.CANCELLED) {
      return ExitRequestStatus.CANCELLED;
    }
    if (requestStatus === EmployeeRequestStatus.REJECTED) {
      return ExitRequestStatus.REJECTED;
    }
    if (tracking?.completedAt) {
      return ExitRequestStatus.COMPLETED;
    }
    if (requestStatus === EmployeeRequestStatus.PENDING) {
      return ExitRequestStatus.PENDING;
    }
    return ExitRequestStatus.IN_PROGRESS;
  }

  private resolveExitType(
    request: EmployeeRequestDocument,
    tracking?: ExitTrackingDocument | null,
  ) {
    if (tracking?.exitType) {
      return {
        id: tracking.exitType.id ?? null,
        label: tracking.exitType.label,
      };
    }

    const terminationType = this.detailString(
      (request.details ?? {}) as Record<string, unknown>,
      'terminationType',
    );

    return terminationType
      ? { id: terminationType, label: this.humanize(terminationType) }
      : null;
  }

  private resolveExitReason(
    request: EmployeeRequestDocument,
    tracking?: ExitTrackingDocument | null,
  ) {
    if (tracking?.exitReason) {
      return {
        id: tracking.exitReason.id ?? null,
        label: tracking.exitReason.label,
      };
    }

    const reason = this.detailString(
      (request.details ?? {}) as Record<string, unknown>,
      'reasonForTermination',
    );

    return reason ? { id: null, label: reason } : null;
  }

  private toExitDepartmentCounts(
    counts: Map<string, number>,
    departmentMap: Map<string, string>,
    total: number,
  ): AnalyticsCountItem[] {
    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label:
          departmentMap.get(key) ??
          (key === 'unspecified' ? 'Unspecified' : key),
        count,
        percentage: this.percent(count, total),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private toDepartmentCounts(
    employees: EmployeeDocument[],
    departmentMap: Map<string, string>,
  ): AnalyticsCountItem[] {
    const counts = this.countBy(
      employees,
      (employee) => employee.departmentCode ?? 'unspecified',
    );

    return this.toCountItems(
      counts,
      employees.length,
      Object.fromEntries(departmentMap),
    );
  }

  private toJobTitleCounts(
    employees: EmployeeDocument[],
    jobTitleMap: Map<string, string>,
  ): AnalyticsCountItem[] {
    const counts = this.countBy(
      employees,
      (employee) => employee.jobTitleCode ?? 'unspecified',
    );

    return this.toCountItems(
      counts,
      employees.length,
      Object.fromEntries(jobTitleMap),
    );
  }

  private toCountItems(
    counts: Map<string, number>,
    total: number,
    labels?: Record<string, string>,
  ): AnalyticsCountItem[] {
    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label:
          labels?.[key] ??
          (key === 'unspecified' ? 'Unspecified' : this.humanize(key)),
        count,
        percentage: this.percent(count, total),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private countBy<T>(
    items: T[],
    keyFn: (item: T) => string,
  ): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items) {
      this.increment(counts, keyFn(item));
    }
    return counts;
  }

  private increment(map: Map<string, number>, key: string, by = 1): void {
    map.set(key, (map.get(key) ?? 0) + by);
  }

  private resolvePagination(query: { batch?: number; limit?: number }): {
    batch: number;
    limit: number;
  } {
    return {
      batch: query.batch ?? 1,
      limit: query.limit ?? DEFAULT_PAGE_SIZE,
    };
  }

  private resolveDateRange(startDate?: string, endDate?: string): DateRange {
    const today = new Date();
    const fallbackEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );
    const end = this.parseDate(endDate, true) ?? fallbackEnd;
    const fallbackStart = new Date(end.getFullYear(), end.getMonth() - 11, 1);
    const start = this.parseDate(startDate) ?? fallbackStart;

    if (start.getTime() > end.getTime()) {
      AppResponse.error({
        message: 'Start date must be before end date',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return {
      start,
      end,
      startDate: this.formatDate(start) as string,
      endDate: this.formatDate(end) as string,
    };
  }

  private resolveYearRange(
    year: number,
    startDate?: string,
    endDate?: string,
  ): DateRange {
    const start = this.parseDate(startDate) ?? new Date(year, 0, 1, 0, 0, 0, 0);
    const end =
      this.parseDate(endDate, true) ?? new Date(year, 11, 31, 23, 59, 59, 999);

    if (start.getTime() > end.getTime()) {
      AppResponse.error({
        message: 'Start date must be before end date',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return {
      start,
      end,
      startDate: this.formatDate(start) as string,
      endDate: this.formatDate(end) as string,
    };
  }

  private buildMonthBuckets(start: Date, end: Date): AnalyticsMonthBucket[] {
    const buckets: AnalyticsMonthBucket[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    while (
      cursor.getTime() <= last.getTime() &&
      buckets.length < MAX_MONTH_BUCKETS
    ) {
      const bucketStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const bucketEnd = new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const key = `${bucketStart.getFullYear()}-${String(
        bucketStart.getMonth() + 1,
      ).padStart(2, '0')}`;

      buckets.push({
        key,
        label: `${bucketStart.toLocaleString('en-US', {
          month: 'short',
        })} ${bucketStart.getFullYear()}`,
        start: bucketStart,
        end: bucketEnd,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
  }

  private isWithin(
    value: Date | string | null | undefined,
    range: { start: Date; end: Date },
  ): boolean {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    return date >= range.start && date <= range.end;
  }

  private getAgeBand(dateOfBirth: Date | null): string {
    if (!dateOfBirth) {
      return 'unspecified';
    }

    const age = this.yearsBetween(new Date(dateOfBirth), new Date());

    if (age < 25) return 'under 25';
    if (age < 35) return '25 - 34';
    if (age < 45) return '35 - 44';
    if (age < 55) return '45 - 54';
    return '55+';
  }

  private getTenureBand(employmentDate: Date | null): string {
    const months = this.monthsBetween(employmentDate, new Date());

    if (months == null) {
      return 'unspecified';
    }

    if (months < 12) return 'under 1 year';
    if (months < 24) return '1 - 2 years';
    if (months < 60) return '2 - 5 years';
    if (months < 120) return '5 - 10 years';
    return '10+ years';
  }

  private yearsBetween(from: Date, to: Date): number {
    let years = to.getFullYear() - from.getFullYear();
    const monthDelta = to.getMonth() - from.getMonth();

    if (monthDelta < 0 || (monthDelta === 0 && to.getDate() < from.getDate())) {
      years -= 1;
    }

    return years;
  }

  private monthsBetween(
    from: Date | null | undefined,
    to: Date,
  ): number | null {
    if (!from) return null;
    const start = new Date(from);

    if (Number.isNaN(start.getTime())) return null;

    const months =
      (to.getFullYear() - start.getFullYear()) * 12 +
      (to.getMonth() - start.getMonth()) +
      (to.getDate() - start.getDate()) / 30;

    return Math.round(months * 10) / 10;
  }

  private progressPercent(items: { completed: boolean }[]): number {
    if (!items || items.length === 0) {
      return 0;
    }

    const completed = items.filter((item) => item.completed).length;
    return Math.round((completed / items.length) * 100);
  }

  private detailString(
    details: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = details[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private parseDate(value?: string | null, endOfDay = false): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }

    return endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private formatDate(value?: Date | null): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatDateTime(value?: Date | null): string | null {
    return value ? new Date(value).toISOString() : null;
  }

  private startOfDay(value: Date): Date {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      0,
      0,
      0,
      0,
    );
  }

  private addDays(value: Date, days: number): Date {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
  }

  private daysBetween(from: Date, to: Date): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.round(
      (this.startOfDay(to).getTime() - this.startOfDay(from).getTime()) /
        millisecondsPerDay,
    );
  }

  private minDate(values: Date[]): Date | null {
    if (values.length === 0) return null;
    return new Date(
      values.reduce(
        (minimum, value) => Math.min(minimum, value.getTime()),
        Number.MAX_SAFE_INTEGER,
      ),
    );
  }

  private maxDate(values: Date[]): Date | null {
    if (values.length === 0) return null;
    return new Date(
      values.reduce(
        (maximum, value) => Math.max(maximum, value.getTime()),
        Number.MIN_SAFE_INTEGER,
      ),
    );
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return (
      Math.round(
        (values.reduce((total, value) => total + value, 0) / values.length) *
          10,
      ) / 10
    );
  }

  private percent(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 1000) / 10;
  }

  private roundDays(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private getEmployeeName(employee: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  }): string {
    return (
      `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
      employee.email ||
      'Unknown employee'
    );
  }

  private humanize(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private normaliseKey(value?: string | null): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : 'unspecified';
  }

  private balanceKey(employeeId: string, leaveCategoryId: string): string {
    return `${employeeId}:${leaveCategoryId}`;
  }

  private handleError(error: unknown, method: string): never {
    const err = error as Error & { location?: string };
    err.location = `AnalyticsService.${method}`;
    AppResponse.error(err);
    throw error;
  }
}
