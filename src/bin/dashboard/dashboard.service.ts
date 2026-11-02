import { Inject, Injectable } from '@nestjs/common';
import { QueryFilter } from 'mongoose';
import { AppResponse } from '../../common/response/app-response';
import {
  EmployeeDocument,
  EmployeeOnboardingStep,
} from '../employee/entity/employee.schema';
import { EmployeeStatus } from '../employee/enum/employee.enum';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { LeaveRequestDocument } from '../leave/entity/leave-request.schema';
import { LeaveRequestStatus } from '../leave/enum/leave.enum';
import { LeaveRequestRepository } from '../leave/repository/leave-request.repository';
import { ExitTrackingDocument } from '../offboarding/entity/exit-tracking.schema';
import { ExitTrackingRepository } from '../offboarding/repository/exit-tracking.repository';
import { OnboardingStatus } from '../onboarding/enum/onboarding-status.enum';
import { OrganizationDepartmentRepository } from '../organization/repository/organization-department.repository';
import { JobTitleRepository } from '../organization/repository/job-title.repository';
import {
  EmployeeRequestDocument,
} from '../request/entity/request.schema';
import { EmployeeRequestStatus } from '../request/enum/request.enum';
import { RequestRepository } from '../request/repository/request.repository';
import { RequestType } from '../setting/request-management/enum/request-management.enum';
import {
  DashboardEmployeeDistributionQueryDto,
  DashboardOnboardingProgressQueryDto,
  DashboardRecentActivitiesQueryDto,
  DashboardSummaryQueryDto,
} from './dto/dashboard.dto';
import {
  DashboardActivity,
  DashboardActivityEmployee,
  DashboardEmployeeDistribution,
  DashboardMetric,
  DashboardOnboardingItem,
  DashboardOnboardingProgress,
  DashboardRecentActivities,
  DashboardSummary,
} from './interface/dashboard.interface';
import {
  DashboardActivityType,
  DashboardDistributionDimension,
  DashboardInterval,
  DashboardMetricKey,
} from './enum/dashboard.enum';
import {
  addDays,
  buildDayBuckets,
  buildMonthBuckets,
  daysBetween,
  endOfDay,
  endOfMonth,
  formatDate,
  formatDateTime,
  getEmployeeName,
  getOnboardingStatus,
  humanize,
  percent,
  resolveStepDueDate,
  safeChange,
  startOfDay,
  startOfMonth,
  toDate,
} from './dashboard.utility';

const DEFAULT_ONBOARDING_LIMIT = 5;
const DEFAULT_ACTIVITY_LIMIT = 10;
const DEFAULT_ACTIVITY_DAYS = 90;

type EmployeeWithTimestamps = EmployeeDocument & {
  createdAt?: Date;
  updatedAt?: Date;
};

interface OnboardingRecord extends DashboardOnboardingItem {
  status: OnboardingStatus;
  employmentDateValue: Date | null;
  dueDateValue: Date | null;
  sortPriority: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(OrganizationDepartmentRepository)
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
    @Inject(JobTitleRepository)
    private readonly jobTitleRepository: JobTitleRepository,
    @Inject(LeaveRequestRepository)
    private readonly leaveRequestRepository: LeaveRequestRepository,
    @Inject(RequestRepository)
    private readonly requestRepository: RequestRepository,
    @Inject(ExitTrackingRepository)
    private readonly exitTrackingRepository: ExitTrackingRepository,
  ) {}

  async getSummary(
    organizationId: string,
    query: DashboardSummaryQueryDto = {},
  ): Promise<DashboardSummary> {
    try {
      const interval = query.interval ?? DashboardInterval.TWELVE_MONTHS;
      const now = new Date();
      const {
        currentStart,
        previousStart,
        previousEnd,
        bucketCount,
        isMonthly,
      } = this.getIntervalBounds(interval, now);

      const [employees, leaveRequests, exitRequests] = await Promise.all([
        this.employeeRepository.findByOrganization(
          organizationId,
          'firstName lastName email employeeId avatarUrl employmentDate status departmentCode jobTitleCode createdAt updatedAt',
        ),
        this.leaveRequestRepository.findAll(
          {
            organizationId,
            status: LeaveRequestStatus.APPROVED,
            startDate: { $lte: endOfMonth(now) },
            endDate: { $gte: currentStart },
          } as QueryFilter<LeaveRequestDocument>,
          { startDate: 1 },
        ),
        this.requestRepository.findAll(
          {
            organizationId,
            requestType: RequestType.EMPLOYEE_TERMINATION,
          } as QueryFilter<EmployeeRequestDocument>,
          { createdAt: -1 },
        ),
      ]);

      const requestIds = exitRequests.map((request) => String(request._id));
      const trackings =
        await this.exitTrackingRepository.findByRequestIds(
          organizationId,
          requestIds,
        );
      const trackingMap = new Map(
        trackings.map((tracking) => [tracking.requestId, tracking]),
      );
      const exitDateByEmployeeId = this.buildExitDateMap(
        exitRequests,
        trackingMap,
      );

      const currentHeadcount = this.countHeadcountAt(
        employees as EmployeeWithTimestamps[],
        exitDateByEmployeeId,
        now,
      );
      const previousHeadcount = this.countHeadcountAt(
        employees as EmployeeWithTimestamps[],
        exitDateByEmployeeId,
        previousEnd,
      );
      const currentLeave = this.countLeaveOn(leaveRequests, now);
      const previousLeave = this.countLeaveOn(leaveRequests, previousEnd);
      const currentNewHires = this.countNewHires(
        employees as EmployeeWithTimestamps[],
        currentStart,
        now,
      );
      const previousNewHires = this.countNewHires(
        employees as EmployeeWithTimestamps[],
        previousStart,
        previousEnd,
      );
      const currentExits = this.countExits(
        exitRequests,
        trackingMap,
        currentStart,
        now,
      );
      const previousExits = this.countExits(
        exitRequests,
        trackingMap,
        previousStart,
        previousEnd,
      );

      const metrics: DashboardMetric[] = [
        this.toMetric(
          DashboardMetricKey.TOTAL_EMPLOYEES,
          'Total employees',
          currentHeadcount,
          previousHeadcount,
        ),
        this.toMetric(
          DashboardMetricKey.LEAVE,
          'Leave',
          currentLeave,
          previousLeave,
        ),
        this.toMetric(
          DashboardMetricKey.NEW_HIRES,
          'New hires',
          currentNewHires,
          previousNewHires,
        ),
        this.toMetric(
          DashboardMetricKey.EXITS,
          'Exits',
          currentExits,
          previousExits,
        ),
      ];

      const trendBuckets = isMonthly
        ? buildMonthBuckets(currentStart, now)
        : buildDayBuckets(currentStart, now);

      const trend = trendBuckets.map((bucket) => {
        const [year, month, day] = bucket.key.split(/-|\//).map(Number);
        const bucketStart = isMonthly
          ? new Date(year, month - 1, 1)
          : new Date(year, month - 1, day);
        const bucketEnd = isMonthly
          ? year === now.getFullYear() && month - 1 === now.getMonth()
            ? now
            : endOfMonth(bucketStart)
          : bucketStart.getDate() === now.getDate() &&
            bucketStart.getMonth() === now.getMonth() &&
            bucketStart.getFullYear() === now.getFullYear()
            ? now
            : endOfDay(bucketStart);

        return {
          ...bucket,
          headcount: this.countHeadcountAt(
            employees as EmployeeWithTimestamps[],
            exitDateByEmployeeId,
            bucketEnd,
          ),
          newHires: this.countNewHires(
            employees as EmployeeWithTimestamps[],
            bucketStart,
            bucketEnd,
          ),
          exits: this.countExits(
            exitRequests,
            trackingMap,
            bucketStart,
            bucketEnd,
          ),
          approvedLeaveRequests: this.countLeaveRequestsInRange(
            leaveRequests,
            bucketStart,
            bucketEnd,
          ),
        };
      });

      return {
        generatedAt: new Date().toISOString(),
        period: {
          startDate: formatDate(currentStart) as string,
          endDate: formatDate(now) as string,
        },
        rangeMonths: bucketCount,
        hasData: employees.some(
          (employee) => employee.status !== EmployeeStatus.DRAFT,
        ),
        metrics,
        trend,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getSummary.name);
    }
  }

  async getOnboardingProgress(
    organizationId: string,
    query: DashboardOnboardingProgressQueryDto = {},
  ): Promise<DashboardOnboardingProgress> {
    try {
      const batch = query.batch ?? 1;
      const limit = query.limit ?? DEFAULT_ONBOARDING_LIMIT;

      const [employees, jobTitles, departments] = await Promise.all([
        this.employeeRepository.findByOrganization(
          organizationId,
          'firstName lastName email employeeId avatarUrl employmentDate status departmentCode jobTitleCode employeeOnboardingSteps createdAt updatedAt',
        ),
        this.jobTitleRepository.findByOrganization(organizationId, 'code name'),
        this.organizationDepartmentRepository.findByOrganization(
          organizationId,
          'code name',
        ),
      ]);

      const jobTitleByCode = new Map(
        jobTitles.map((jobTitle) => [jobTitle.code, jobTitle.name]),
      );
      const departmentMap = new Map(
        departments.map((department) => [department.code, department.name]),
      );

      const records = employees
        .map((employee) => {
          const steps = employee.employeeOnboardingSteps ?? [];

          if (steps.length === 0) {
            return null;
          }

          const totalSteps = steps.length;
          const completedSteps = steps.filter((step) => step.isCompleted).length;
          const progress = Math.round((completedSteps / totalSteps) * 100);
          const status = getOnboardingStatus(
            steps,
            employee.employmentDate,
            progress,
          );
          const dueDateValue = this.resolveOnboardingDueDate(
            steps,
            employee.employmentDate,
          );

          return {
            employeeId: String(employee._id),
            employeeUniqueId: employee.employeeId ?? null,
            employeeName: getEmployeeName(employee),
            email: employee.email,
            avatarUrl: employee.avatarUrl ?? null,
            departmentCode: employee.departmentCode ?? null,
            department: employee.departmentCode
              ? departmentMap.get(employee.departmentCode) ??
                employee.departmentCode
              : null,
            jobTitle: employee.jobTitleCode
              ? jobTitleByCode.get(employee.jobTitleCode) ??
                employee.jobTitleCode
              : null,
            employmentDate: formatDate(employee.employmentDate),
            status,
            progress,
            completedSteps,
            totalSteps,
            dueDate: formatDate(dueDateValue),
            daysUntilDue: dueDateValue
              ? daysBetween(new Date(), dueDateValue)
              : null,
            isOverdue: status === OnboardingStatus.OVERDUE,
            employmentDateValue: employee.employmentDate ?? null,
            dueDateValue,
            sortPriority: this.onboardingSortPriority(status),
          } satisfies OnboardingRecord;
        })
        .filter((record): record is OnboardingRecord => record !== null);

      const summary = {
        total: records.length,
        draft: records.filter(
          (record) => record.status === OnboardingStatus.DRAFT,
        ).length,
        incomplete: records.filter(
          (record) => record.status === OnboardingStatus.INCOMPLETE,
        ).length,
        overdue: records.filter(
          (record) => record.status === OnboardingStatus.OVERDUE,
        ).length,
        onboarded: records.filter(
          (record) => record.status === OnboardingStatus.ONBOARDED,
        ).length,
        completionRate: percent(
          records.filter(
            (record) => record.status === OnboardingStatus.ONBOARDED,
          ).length,
          records.length,
        ),
      };

      const filtered = records
        .filter((record) =>
          query.status
            ? record.status === query.status
            : record.status !== OnboardingStatus.ONBOARDED,
        )
        .sort((a, b) => {
          if (a.sortPriority !== b.sortPriority) {
            return a.sortPriority - b.sortPriority;
          }

          const aTime = a.dueDateValue?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const bTime = b.dueDateValue?.getTime() ?? Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        });
      const start = (batch - 1) * limit;

      return {
        generatedAt: new Date().toISOString(),
        hasData: records.length > 0,
        summary,
        data: filtered
          .slice(start, start + limit)
          .map(({ employmentDateValue, dueDateValue, sortPriority, ...item }) => {
            void employmentDateValue;
            void dueDateValue;
            void sortPriority;
            return item;
          }),
        count: filtered.length,
        page: batch,
        limit,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getOnboardingProgress.name);
    }
  }

  async getEmployeeDistribution(
    organizationId: string,
    query: DashboardEmployeeDistributionQueryDto = {},
  ): Promise<DashboardEmployeeDistribution> {
    try {
      const dimension =
        query.dimension ?? DashboardDistributionDimension.DEPARTMENT;
      const [employees, departments] = await Promise.all([
        this.employeeRepository.findByOrganization(
          organizationId,
          'firstName lastName email employeeId avatarUrl employmentDate status departmentCode jobTitleCode employeeType jobType workMode location createdAt updatedAt',
        ),
        this.organizationDepartmentRepository.findByOrganization(
          organizationId,
          'code name',
        ),
      ]);
      const departmentMap = new Map(
        departments.map((department) => [department.code, department.name]),
      );
      const workforce = employees.filter((employee) =>
        this.isCurrentWorkforce(employee.status),
      );
      const counts = new Map<string, { key: string; label: string; count: number }>();

      for (const employee of workforce) {
        const item = this.getDistributionValue(
          employee,
          dimension,
          departmentMap,
        );
        const existing = counts.get(item.key);

        if (existing) {
          existing.count += 1;
        } else {
          counts.set(item.key, { ...item, count: 1 });
        }
      }

      const total = workforce.length;
      const data = Array.from(counts.values())
        .sort(
          (a, b) =>
            b.count - a.count || a.label.localeCompare(b.label),
        )
        .map((item) => ({
          ...item,
          percentage: percent(item.count, total),
        }));

      return {
        generatedAt: new Date().toISOString(),
        hasData: total > 0,
        dimension,
        total,
        data,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getEmployeeDistribution.name);
    }
  }

  async getRecentActivities(
    organizationId: string,
    query: DashboardRecentActivitiesQueryDto = {},
  ): Promise<DashboardRecentActivities> {
    try {
      const batch = query.batch ?? 1;
      const limit = query.limit ?? DEFAULT_ACTIVITY_LIMIT;
      const days = query.days ?? DEFAULT_ACTIVITY_DAYS;
      const now = new Date();
      const windowStart = addDays(startOfDay(now), -(days - 1));

      const [employees, leaveRequests, exitRequests] = await Promise.all([
        this.employeeRepository.findByOrganization(
          organizationId,
          'firstName lastName email employeeId avatarUrl employmentDate status departmentCode jobTitleCode employeeOnboardingSteps createdAt updatedAt',
        ),
        this.leaveRequestRepository.findAll(
          {
            organizationId,
            updatedAt: { $gte: windowStart },
          } as QueryFilter<LeaveRequestDocument>,
          { updatedAt: -1 },
        ),
        this.requestRepository.findAll(
          {
            organizationId,
            requestType: RequestType.EMPLOYEE_TERMINATION,
            updatedAt: { $gte: windowStart },
          } as QueryFilter<EmployeeRequestDocument>,
          { updatedAt: -1 },
        ),
      ]);

      const requestIds = exitRequests.map((request) => String(request._id));
      const trackings =
        await this.exitTrackingRepository.findByRequestIds(
          organizationId,
          requestIds,
        );
      const trackingMap = new Map(
        trackings.map((tracking) => [tracking.requestId, tracking]),
      );
      const events: DashboardActivity[] = [];

      for (const employee of employees as EmployeeWithTimestamps[]) {
        const createdAt = toDate(employee.createdAt);
        const employeeView = this.toActivityEmployee(employee);

        if (createdAt && this.isWithin(createdAt, windowStart, now)) {
          events.push({
            id: `employee:${String(employee._id)}:added`,
            type: DashboardActivityType.EMPLOYEE_ADDED,
            action: 'created',
            title: 'New employee added',
            description: `${employeeView.employeeName} was added to the organization`,
            occurredAt: formatDateTime(createdAt) as string,
            actor: null,
            employee: employeeView,
          });
        }

        for (const step of employee.employeeOnboardingSteps ?? []) {
          const completedAt = toDate(step.completedAt);

          if (!completedAt || !this.isWithin(completedAt, windowStart, now)) {
            continue;
          }

          events.push({
            id: `onboarding:${String(employee._id)}:${step.stepId}:completed`,
            type: DashboardActivityType.ONBOARDING_STEP_COMPLETED,
            action: 'completed',
            title: 'Onboarding step completed',
            description: `${step.stepName} completed for ${employeeView.employeeName}`,
            occurredAt: formatDateTime(completedAt) as string,
            actor: null,
            employee: employeeView,
          });
        }
      }

      for (const request of leaveRequests) {
        const employee = this.toActivityEmployeeFromSnapshot(request.employee);
        const requestedAt = toDate(request.requestedAt ?? request.createdAt);

        if (requestedAt && this.isWithin(requestedAt, windowStart, now)) {
          events.push({
            id: `leave:${String(request._id)}:requested`,
            type: DashboardActivityType.LEAVE_REQUESTED,
            action: 'requested',
            title: 'Leave requested',
            description: `${employee?.employeeName ?? 'An employee'} requested ${request.leaveCategory?.label ?? 'leave'}`,
            occurredAt: formatDateTime(requestedAt) as string,
            actor: null,
            employee,
          });
        }

        const reviewedAt = toDate(request.reviewedAt);

        if (
          reviewedAt &&
          this.isWithin(reviewedAt, windowStart, now) &&
          (request.status === LeaveRequestStatus.APPROVED ||
            request.status === LeaveRequestStatus.REJECTED)
        ) {
          events.push({
            id: `leave:${String(request._id)}:${request.status}`,
            type: DashboardActivityType.LEAVE_REVIEWED,
            action: request.status,
            title:
              request.status === LeaveRequestStatus.APPROVED
                ? 'Leave approved'
                : 'Leave rejected',
            description: `${employee?.employeeName ?? 'An employee'}'s leave request was ${request.status}`,
            occurredAt: formatDateTime(reviewedAt) as string,
            actor: request.reviewedBy
              ? {
                  userId: request.reviewedBy.userId,
                  name: request.reviewedBy.name,
                }
              : null,
            employee,
          });
        }
      }

      for (const request of exitRequests) {
        const employee = this.toActivityEmployeeFromSnapshot(request.employee);
        const requestedAt = toDate(request.submittedAt ?? request.createdAt);

        if (requestedAt && this.isWithin(requestedAt, windowStart, now)) {
          events.push({
            id: `exit:${String(request._id)}:requested`,
            type: DashboardActivityType.EXIT_REQUESTED,
            action: 'requested',
            title: 'Exit requested',
            description: `${employee?.employeeName ?? 'An employee'} submitted an exit request`,
            occurredAt: formatDateTime(requestedAt) as string,
            actor: request.createdBy
              ? {
                  userId: request.createdBy.userId,
                  name: request.createdBy.name,
                }
              : null,
            employee,
          });
        }

        const tracking = trackingMap.get(String(request._id));
        const completedAt = toDate(tracking?.completedAt);

        if (!completedAt || !this.isWithin(completedAt, windowStart, now)) {
          continue;
        }

        events.push({
          id: `exit:${String(request._id)}:completed`,
          type: DashboardActivityType.EXIT_COMPLETED,
          action: 'completed',
          title: 'Exit completed',
          description: `${employee?.employeeName ?? 'An employee'}'s exit process was completed`,
          occurredAt: formatDateTime(completedAt) as string,
          actor: tracking?.completedByName
            ? {
                userId: tracking.completedByUserId ?? '',
                name: tracking.completedByName,
              }
            : null,
          employee,
        });
      }

      const filtered = events
        .filter((event) => !query.type || event.type === query.type)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      const start = (batch - 1) * limit;

      return {
        generatedAt: new Date().toISOString(),
        hasData: events.length > 0,
        data: filtered.slice(start, start + limit),
        count: filtered.length,
        page: batch,
        limit,
        hasMore: start + limit < filtered.length,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getRecentActivities.name);
    }
  }

  private getIntervalBounds(
    interval: DashboardInterval,
    now: Date,
  ): {
    currentStart: Date;
    previousStart: Date;
    previousEnd: Date;
    bucketCount: number;
    isMonthly: boolean;
  } {
    const isMonthly = interval === DashboardInterval.TWELVE_MONTHS;
    const bucketCount = isMonthly
      ? 12
      : Number(interval.split('_')[0]);

    const currentStart = isMonthly
      ? startOfMonth(this.shiftMonthClamped(now, -(bucketCount - 1)))
      : startOfDay(addDays(now, -(bucketCount - 1)));

    let previousStart: Date;
    let previousEnd: Date;

    if (isMonthly) {
      const monthBeforeCurrent = this.shiftMonthClamped(currentStart, -1);
      previousEnd = endOfDay(monthBeforeCurrent);
      previousStart = startOfMonth(
        this.shiftMonthClamped(monthBeforeCurrent, -(bucketCount - 1)),
      );
    } else {
      previousEnd = endOfDay(addDays(startOfDay(currentStart), -1));
      previousStart = startOfDay(addDays(previousEnd, -(bucketCount - 1)));
    }

    return {
      currentStart,
      previousStart,
      previousEnd,
      bucketCount,
      isMonthly,
    };
  }

  private toMetric(
    key: DashboardMetricKey,
    label: string,
    value: number,
    previousValue: number,
  ): DashboardMetric {
    return {
      key,
      label,
      value,
      previousValue,
      ...safeChange(value, previousValue),
      comparisonLabel: 'vs last month',
    };
  }

  private shiftMonthClamped(value: Date, delta: number): Date {
    const date = new Date(value);
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + delta);
    const lastDay = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();
    date.setDate(Math.min(day, lastDay));
    return date;
  }

  private isCurrentWorkforce(status: EmployeeStatus): boolean {
    return (
      status !== EmployeeStatus.DRAFT && status !== EmployeeStatus.TERMINATED
    );
  }

  private countHeadcountAt(
    employees: EmployeeWithTimestamps[],
    exitDates: Map<string, Date>,
    date: Date,
  ): number {
    const cutoff = endOfDay(date);

    return employees.filter((employee) => {
      if (employee.status === EmployeeStatus.DRAFT) {
        return false;
      }

      const start = toDate(employee.employmentDate ?? employee.createdAt);

      if (!start || start.getTime() > cutoff.getTime()) {
        return false;
      }

      const exitDate =
        exitDates.get(String(employee._id)) ??
        (employee.status === EmployeeStatus.TERMINATED
          ? toDate(employee.updatedAt ?? employee.createdAt)
          : null);

      return !exitDate || exitDate.getTime() > cutoff.getTime();
    }).length;
  }

  private countNewHires(
    employees: EmployeeWithTimestamps[],
    start: Date,
    end: Date,
  ): number {
    const from = startOfDay(start).getTime();
    const to = endOfDay(end).getTime();

    return employees.filter((employee) => {
      if (employee.status === EmployeeStatus.DRAFT) {
        return false;
      }

      const employmentDate = toDate(employee.employmentDate);
      return (
        employmentDate != null &&
        employmentDate.getTime() >= from &&
        employmentDate.getTime() <= to
      );
    }).length;
  }

  private countLeaveOn(
    requests: LeaveRequestDocument[],
    date: Date,
  ): number {
    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();
    const employeeIds = new Set<string>();

    for (const request of requests) {
      if (request.status !== LeaveRequestStatus.APPROVED) {
        continue;
      }

      const start = toDate(request.startDate);
      const end = toDate(request.endDate);

      if (
        start &&
        end &&
        start.getTime() <= dayEnd &&
        end.getTime() >= dayStart
      ) {
        employeeIds.add(String(request.employeeId));
      }
    }

    return employeeIds.size;
  }

  private countLeaveRequestsInRange(
    requests: LeaveRequestDocument[],
    start: Date,
    end: Date,
  ): number {
    const from = startOfDay(start).getTime();
    const to = endOfDay(end).getTime();

    return requests.filter((request) => {
      const requestStart = toDate(request.startDate);
      return (
        request.status === LeaveRequestStatus.APPROVED &&
        requestStart != null &&
        requestStart.getTime() >= from &&
        requestStart.getTime() <= to
      );
    }).length;
  }

  private countExits(
    requests: EmployeeRequestDocument[],
    trackingMap: Map<string, ExitTrackingDocument>,
    start: Date,
    end: Date,
  ): number {
    const from = startOfDay(start).getTime();
    const to = endOfDay(end).getTime();

    return requests.filter((request) => {
      const exitDate = this.resolveExitDate(
        request,
        trackingMap.get(String(request._id)),
      );

      return (
        exitDate != null &&
        exitDate.getTime() >= from &&
        exitDate.getTime() <= to
      );
    }).length;
  }

  private buildExitDateMap(
    requests: EmployeeRequestDocument[],
    trackingMap: Map<string, ExitTrackingDocument>,
  ): Map<string, Date> {
    const map = new Map<string, Date>();

    for (const request of requests) {
      const exitDate = this.resolveExitDate(
        request,
        trackingMap.get(String(request._id)),
      );

      if (!exitDate) {
        continue;
      }

      const key = String(request.employeeId);
      const existing = map.get(key);

      if (!existing || exitDate.getTime() > existing.getTime()) {
        map.set(key, exitDate);
      }
    }

    return map;
  }

  private resolveExitDate(
    request: EmployeeRequestDocument,
    tracking?: ExitTrackingDocument | null,
  ): Date | null {
    if (
      request.status === EmployeeRequestStatus.CANCELLED ||
      request.status === EmployeeRequestStatus.REJECTED
    ) {
      return null;
    }

    const lastWorkingDay = this.getLastWorkingDay(request);

    return (
      this.parseDateValue(lastWorkingDay) ??
      toDate(tracking?.completedAt) ??
      null
    );
  }

  private getLastWorkingDay(request: EmployeeRequestDocument): string | null {
    const details = (request.details ?? {}) as Record<string, unknown>;
    const terminationDate = details.terminationDate;

    if (typeof terminationDate === 'string' && terminationDate.trim()) {
      return terminationDate.trim();
    }

    return formatDate(request.effectiveDate);
  }

  private parseDateValue(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private resolveOnboardingDueDate(
    steps: EmployeeOnboardingStep[],
    employmentDate?: Date | null,
  ): Date | null {
    const dueDates = steps
      .filter(
        (step): step is EmployeeOnboardingStep & { dueDate: NonNullable<EmployeeOnboardingStep['dueDate']> } =>
          !step.isCompleted && step.dueDate != null,
      )
      .map((step) => resolveStepDueDate(employmentDate, step.dueDate))
      .filter((date): date is Date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    return dueDates[0] ?? null;
  }

  private onboardingSortPriority(status: OnboardingStatus): number {
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

  private getDistributionValue(
    employee: EmployeeDocument,
    dimension: DashboardDistributionDimension,
    departmentMap: Map<string, string>,
  ): { key: string; label: string } {
    switch (dimension) {
      case DashboardDistributionDimension.STATUS:
        return {
          key: employee.status,
          label: humanize(employee.status),
        };
      case DashboardDistributionDimension.EMPLOYMENT_TYPE:
        return {
          key: employee.employeeType ?? 'unspecified',
          label: employee.employeeType
            ? humanize(employee.employeeType)
            : 'Unspecified',
        };
      case DashboardDistributionDimension.JOB_TYPE:
        return {
          key: employee.jobType ?? 'unspecified',
          label: employee.jobType ? humanize(employee.jobType) : 'Unspecified',
        };
      case DashboardDistributionDimension.WORK_MODE:
        return {
          key: employee.workMode ?? 'unspecified',
          label: employee.workMode
            ? humanize(employee.workMode)
            : 'Unspecified',
        };
      case DashboardDistributionDimension.LOCATION:
        return {
          key: employee.location?.trim() || 'unspecified',
          label: employee.location?.trim() || 'Unspecified',
        };
      case DashboardDistributionDimension.DEPARTMENT:
      default: {
        const code = employee.departmentCode?.trim();

        return {
          key: code || 'unassigned',
          label: code ? departmentMap.get(code) ?? code : 'Unassigned',
        };
      }
    }
  }

  private toActivityEmployee(
    employee: EmployeeDocument,
  ): DashboardActivityEmployee {
    return {
      employeeId: String(employee._id),
      employeeUniqueId: employee.employeeId ?? null,
      employeeName: getEmployeeName(employee),
      avatarUrl: employee.avatarUrl ?? null,
    };
  }

  private toActivityEmployeeFromSnapshot(
    employee: EmployeeRequestDocument['employee'] | LeaveRequestDocument['employee'],
  ): DashboardActivityEmployee | null {
    if (!employee) {
      return null;
    }

    return {
      employeeId: employee.employeeId,
      employeeUniqueId: employee.employeeUniqueId ?? null,
      employeeName:
        employee.employeeName ||
        ('email' in employee ? employee.email : null) ||
        'Unknown employee',
      avatarUrl: employee.avatarUrl ?? null,
    };
  }

  private isWithin(value: Date, start: Date, end: Date): boolean {
    return (
      value.getTime() >= start.getTime() &&
      value.getTime() <= end.getTime()
    );
  }

  private handleError(error: unknown, method: string): never {
    const err = error as Error & { location?: string };
    err.location = `DashboardService.${method}`;
    AppResponse.error(err);
    throw error;
  }
}
