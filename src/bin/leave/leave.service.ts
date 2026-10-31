import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { QueryFilter } from 'mongoose';
import type { CurrentUser as ICurrentUser } from '../../common';
import { AppResponse } from '../../common/response/app-response';
import { EmployeeDocument } from '../employee/entity/employee.schema';
import { EmployeeStatus } from '../employee/enum/employee.enum';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { LeaveCategory } from '../organization/entity/organization.schema';
import { JobTitleRepository } from '../organization/repository/job-title.repository';
import { OrganizationDepartmentRepository } from '../organization/repository/organization-department.repository';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import {
  ApproveLeaveRequestDto,
  LeaveSummaryQueryDto,
  ListLeaveRequestQueryDto,
  RejectLeaveRequestDto,
  RetrieveLeaveRequestDto,
} from './dto/leave.dto';
import {
  LeaveBalanceDocument,
} from './entity/leave-balance.schema';
import {
  LeaveRequestDocument,
} from './entity/leave-request.schema';
import { LeaveRequestStatus } from './enum/leave.enum';
import {
  LeaveBalanceDefault,
  LeaveBalanceRepository,
} from './repository/leave-balance.repository';
import { LeaveRequestRepository } from './repository/leave-request.repository';

type MongoFilter = QueryFilter<LeaveRequestDocument>;

interface LeaveCategoryTotals {
  leaveCategoryId: string;
  label: string;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

interface LeaveTypeBalance {
  leaveCategoryId: string;
  label: string;
  entitledDays: number;
  carriedOverDays: number;
  adjustmentDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

interface LeaveSummaryEmployee {
  employeeId: string;
  employeeUniqueId: string | null;
  employeeName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  departmentCode: string | null;
  department: string | null;
  status: string;
  leaveBalances: LeaveTypeBalance[];
  totals: {
    entitledDays: number;
    usedDays: number;
    pendingDays: number;
    remainingDays: number;
  };
}

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    @Inject(LeaveRequestRepository)
    private readonly leaveRequestRepository: LeaveRequestRepository,
    @Inject(LeaveBalanceRepository)
    private readonly leaveBalanceRepository: LeaveBalanceRepository,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(OrganizationRepository)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(OrganizationDepartmentRepository)
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
    @Inject(JobTitleRepository)
    private readonly jobTitleRepository: JobTitleRepository,
  ) {}

  async listRequests(
    organizationId: string,
    query: ListLeaveRequestQueryDto,
  ) {
    try {
      const batch = query.batch ?? 1;
      const limit = query.limit ?? 10;
      const where = this.buildRequestWhere(organizationId, query);

      const { items, total } =
        await this.leaveRequestRepository.paginatedQuery(
          where,
          { createdAt: -1 },
          batch,
          limit,
        );

      return {
        data: items.map((request) => this.toLeaveRequestView(request)),
        count: total,
      };
    } catch (error: unknown) {
      this.handleError(error, this.listRequests.name);
    }
  }

  async retrieveRequest(
    organizationId: string,
    dto: RetrieveLeaveRequestDto,
  ) {
    try {
      const request = await this.findRequestOrFail(
        organizationId,
        dto.leaveRequestId,
      );

      return this.toLeaveRequestView(request);
    } catch (error: unknown) {
      this.handleError(error, this.retrieveRequest.name);
    }
  }

  async approveRequest(
    organizationId: string,
    user: ICurrentUser,
    dto: RetrieveLeaveRequestDto & ApproveLeaveRequestDto,
  ) {
    try {
      const request = await this.findRequestOrFail(
        organizationId,
        dto.leaveRequestId,
      );
      this.assertPending(request);

      const reviewer = await this.resolveReviewer(organizationId, user);
      const updated = await this.leaveRequestRepository.updateById(
        String(request._id),
        {
          status: LeaveRequestStatus.APPROVED,
          reviewedBy: reviewer,
          reviewedAt: new Date(),
          reviewComment: this.normaliseOptionalString(dto.comment),
          rejectionReason: null,
        },
      );

      this.logger.log(
        `Approved leave request ${String(request._id)} in org ${organizationId}`,
      );

      return this.toLeaveRequestView(updated ?? request);
    } catch (error: unknown) {
      this.handleError(error, this.approveRequest.name);
    }
  }

  async rejectRequest(
    organizationId: string,
    user: ICurrentUser,
    dto: RetrieveLeaveRequestDto & RejectLeaveRequestDto,
  ) {
    try {
      const request = await this.findRequestOrFail(
        organizationId,
        dto.leaveRequestId,
      );
      this.assertPending(request);

      const reviewer = await this.resolveReviewer(organizationId, user);
      const updated = await this.leaveRequestRepository.updateById(
        String(request._id),
        {
          status: LeaveRequestStatus.REJECTED,
          reviewedBy: reviewer,
          reviewedAt: new Date(),
          reviewComment: this.normaliseOptionalString(dto.comment),
          rejectionReason: dto.reason.trim(),
        },
      );

      this.logger.log(
        `Rejected leave request ${String(request._id)} in org ${organizationId}`,
      );

      return this.toLeaveRequestView(updated ?? request);
    } catch (error: unknown) {
      this.handleError(error, this.rejectRequest.name);
    }
  }

  async getSummary(
    organizationId: string,
    query: LeaveSummaryQueryDto,
  ) {
    try {
      const batch = query.batch ?? 1;
      const limit = query.limit ?? 10;
      const year = query.year ?? new Date().getFullYear();
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

      const organization =
        await this.organizationRepository.findOrg(
          { _id: organizationId },
          'leaveManagement',
        );
      const categories =
        organization?.leaveManagement?.leaveCategories ?? [];

      const allEmployees = await this.employeeRepository.findByOrganization(
        organizationId,
        'firstName lastName employeeId employeeUniqueId email avatarUrl departmentCode jobTitleCode status',
      );
      const employees = this.filterEmployees(allEmployees, query);
      const employeeIds = employees.map((employee) =>
        String(employee._id),
      );

      const balanceDefaults = this.buildBalanceDefaults(
        employeeIds,
        categories,
      );
      await this.leaveBalanceRepository.upsertDefaults(
        organizationId,
        year,
        balanceDefaults,
      );

      const [balances, requests, departments, jobTitles] =
        await Promise.all([
          this.leaveBalanceRepository.findForEmployeesYear(
            organizationId,
            employeeIds,
            year,
          ),
          this.leaveRequestRepository.findForSummary(
            organizationId,
            employeeIds,
            yearStart,
            yearEnd,
          ),
          this.organizationDepartmentRepository.findByOrganization(
            organizationId,
            'code name',
          ),
          this.jobTitleRepository.findByOrganization(
            organizationId,
            'code name',
          ),
        ]);

      const balanceMap = new Map<string, LeaveBalanceDocument>();
      for (const balance of balances) {
        balanceMap.set(
          this.balanceKey(balance.employeeId, balance.leaveCategoryId),
          balance,
        );
      }

      const departmentMap = new Map(
        departments.map((department) => [department.code, department.name]),
      );
      const jobTitleMap = new Map(
        jobTitles.map((jobTitle) => [jobTitle.code, jobTitle.name]),
      );

      const categoryTotals = this.buildCategoryTotals(
        categories,
        employees,
        balanceMap,
        requests,
      );

      const pageEmployees = employees.slice(
        (batch - 1) * limit,
        batch * limit,
      );
      const data = pageEmployees.map((employee) =>
        this.toSummaryEmployee(
          employee,
          categories,
          balanceMap,
          requests,
          departmentMap,
          jobTitleMap,
        ),
      );

      const today = new Date();
      const onLeaveEmployeeIds = new Set(
        requests
          .filter(
            (request) =>
              request.status === LeaveRequestStatus.APPROVED &&
              request.startDate <= today &&
              request.endDate >= today,
          )
          .map((request) => request.employeeId),
      );

      return {
        year,
        totalEmployees: employees.length,
        onLeave: onLeaveEmployeeIds.size,
        pendingRequests: requests.filter(
          (request) => request.status === LeaveRequestStatus.PENDING,
        ).length,
        approvedRequests: requests.filter(
          (request) => request.status === LeaveRequestStatus.APPROVED,
        ).length,
        rejectedRequests: requests.filter(
          (request) => request.status === LeaveRequestStatus.REJECTED,
        ).length,
        categoryTotals,
        data,
        count: employees.length,
        page: batch,
        limit,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getSummary.name);
    }
  }

  async exportRequests(
    organizationId: string,
    query: ListLeaveRequestQueryDto,
  ): Promise<{ filename: string; content: string }> {
    try {
      const where = this.buildRequestWhere(organizationId, query);
      const requests = await this.leaveRequestRepository.findAll(where, {
        createdAt: -1,
      });

      const header = [
        'Employee',
        'Employee ID',
        'Email',
        'Department',
        'Leave type',
        'Duration',
        'Start date',
        'End date',
        'Note',
        'Requested on',
        'Status',
        'Reviewer',
        'Reviewed date',
      ];

      const rows = requests.map((request) => [
        request.employee?.employeeName ?? '',
        request.employee?.employeeUniqueId ?? request.employeeId,
        request.employee?.email ?? '',
        request.employee?.department ?? '',
        request.leaveCategory?.label ?? '',
        String(request.durationDays ?? ''),
        this.formatDate(request.startDate) ?? '',
        this.formatDate(request.endDate) ?? '',
        request.note ?? '',
        this.formatDateTime(request.requestedAt ?? request.createdAt) ?? '',
        request.status,
        request.reviewedBy?.name ?? request.reviewedBy?.email ?? '',
        this.formatDateTime(request.reviewedAt) ?? '',
      ]);

      const content = [header, ...rows]
        .map((row) => row.map((cell) => this.escapeCsv(cell)).join(','))
        .join('\r\n');

      return {
        filename: `leave-requests-${this.formatDate(new Date())}.csv`,
        content,
      };
    } catch (error: unknown) {
      this.handleError(error, this.exportRequests.name);
    }
  }

  private buildRequestWhere(
    organizationId: string,
    query: ListLeaveRequestQueryDto,
  ): MongoFilter {
    const conditions: Record<string, unknown>[] = [{ organizationId }];

    if (query.status) {
      conditions.push({ status: query.status });
    }
    if (query.leaveCategoryId) {
      conditions.push({ leaveCategoryId: query.leaveCategoryId });
    }
    if (query.employeeId) {
      conditions.push({ employeeId: query.employeeId });
    }

    if (query.search?.trim()) {
      const search = this.escapeRegex(query.search.trim());
      conditions.push({
        $or: [
          { 'employee.employeeName': { $regex: search, $options: 'i' } },
          { 'employee.email': { $regex: search, $options: 'i' } },
          { 'employee.employeeUniqueId': { $regex: search, $options: 'i' } },
          { 'leaveCategory.label': { $regex: search, $options: 'i' } },
        ],
      });
    }

    const startDate = this.parseDate(query.startDate);
    const endDate = this.parseDate(query.endDate, true);
    if (startDate) {
      conditions.push({ endDate: { $gte: startDate } });
    }
    if (endDate) {
      conditions.push({ startDate: { $lte: endDate } });
    }

    return (
      conditions.length === 1 ? conditions[0] : { $and: conditions }
    ) as MongoFilter;
  }

  private async findRequestOrFail(
    organizationId: string,
    leaveRequestId: string,
  ): Promise<LeaveRequestDocument> {
    const request = await this.leaveRequestRepository.findById(
      organizationId,
      leaveRequestId,
    );

    if (!request) {
      AppResponse.error({
        message: 'Leave request not found',
        status: HttpStatus.NOT_FOUND,
      });
    }

    return request as LeaveRequestDocument;
  }

  private assertPending(request: LeaveRequestDocument): void {
    if (request.status !== LeaveRequestStatus.PENDING) {
      AppResponse.error({
        message: 'Only pending leave requests can be reviewed',
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  private async resolveReviewer(
    organizationId: string,
    user: ICurrentUser,
  ): Promise<{ userId: string; email: string; name: string | null }> {
    let name: string | null = null;

    if (user.employeeId) {
      const employee = await this.employeeRepository.findById(user.employeeId);
      if (employee && employee.organizationId === organizationId) {
        name = this.getEmployeeName(employee);
      }
    }

    return {
      userId: user.userId,
      email: user.email,
      name,
    };
  }

  private filterEmployees(
    employees: EmployeeDocument[],
    query: LeaveSummaryQueryDto,
  ): EmployeeDocument[] {
    const search = query.search?.trim().toLowerCase();
    const departmentCode = query.departmentCode?.trim();

    return employees
      .filter((employee) => employee.status !== EmployeeStatus.DRAFT)
      .filter(
        (employee) =>
          !departmentCode || employee.departmentCode === departmentCode,
      )
      .filter((employee) => {
        if (!search) return true;
        return [
          this.getEmployeeName(employee),
          employee.email,
          employee.employeeId,
          employee.employeeUniqueId,
          employee.departmentCode,
        ].some((value) => value?.toLowerCase().includes(search));
      })
      .sort((a, b) =>
        this.getEmployeeName(a).localeCompare(this.getEmployeeName(b)),
      );
  }

  private buildBalanceDefaults(
    employeeIds: string[],
    categories: LeaveCategory[],
  ): LeaveBalanceDefault[] {
    const defaults: LeaveBalanceDefault[] = [];
    for (const employeeId of employeeIds) {
      for (const category of categories) {
        defaults.push({
          employeeId,
          leaveCategoryId: category.id,
          entitledDays: category.entitlementDays ?? 0,
        });
      }
    }
    return defaults;
  }

  private buildCategoryTotals(
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
        );
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
        remainingDays: this.roundDays(
          entitledDays - usedDays - pendingDays,
        ),
      };
    });
  }

  private toSummaryEmployee(
    employee: EmployeeDocument,
    categories: LeaveCategory[],
    balanceMap: Map<string, LeaveBalanceDocument>,
    requests: LeaveRequestDocument[],
    departmentMap: Map<string, string>,
    jobTitleMap: Map<string, string>,
  ): LeaveSummaryEmployee {
    const employeeId = String(employee._id);

    const leaveBalances = categories.map((category) => {
      const balance = balanceMap.get(
        this.balanceKey(employeeId, category.id),
      );
      const entitledDays =
        balance?.entitledDays ?? category.entitlementDays ?? 0;
      const carriedOverDays = balance?.carriedOverDays ?? 0;
      const adjustmentDays = balance?.adjustmentDays ?? 0;

      const categoryRequests = requests.filter(
        (request) =>
          request.employeeId === employeeId &&
          request.leaveCategoryId === category.id,
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
          leaveBalances.reduce(
            (total, balance) => total + balance.usedDays,
            0,
          ),
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
      reliefStaff: request.reliefStaff ?? null,
      note: request.note ?? null,
      attachmentUrls: request.attachmentUrls ?? [],
      requestedAt: this.formatDateTime(
        request.requestedAt ?? request.createdAt,
      ),
      reviewedBy: request.reviewedBy
        ? {
            userId: request.reviewedBy.userId,
            email: request.reviewedBy.email,
            name: request.reviewedBy.name ?? null,
          }
        : null,
      reviewedAt: this.formatDateTime(request.reviewedAt),
      reviewComment: request.reviewComment ?? null,
      rejectionReason: request.rejectionReason ?? null,
      createdAt: this.formatDateTime(request.createdAt),
      updatedAt: this.formatDateTime(request.updatedAt),
    };
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

  private balanceKey(employeeId: string, leaveCategoryId: string): string {
    return `${employeeId}:${leaveCategoryId}`;
  }

  private normaliseOptionalString(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private parseDate(value?: string, endOfDay = false): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }

    return endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day);
  }

  private formatDate(value?: Date | null): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatDateTime(value?: Date | null): string | null {
    return value ? new Date(value).toISOString() : null;
  }

  private roundDays(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeCsv(value: string): string {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text)
      ? `"${text.replace(/"/g, '""')}"`
      : text;
  }

  private handleError(error: unknown, method: string): never {
    const err = error as Error & { location?: string };
    err.location = `LeaveService.${method}`;
    AppResponse.error(err);
    throw error;
  }
}
