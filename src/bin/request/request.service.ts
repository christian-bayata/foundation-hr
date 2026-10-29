import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { QueryFilter } from 'mongoose';
import { AppResponse } from '../../common/response/app-response';
import type { CurrentUser as ICurrentUser } from '../../common';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { JobTitleRepository } from '../organization/repository/job-title.repository';
import { OrganizationDepartmentRepository } from '../organization/repository/organization-department.repository';
import { SettingsDomainOrganisationService } from '../setting/domain/settings.domain.organisation.service';
import {
  REQUEST_TYPE_LABELS,
  RequestType,
} from '../setting/request-management/enum/request-management.enum';
import {
  AddEmployeeRequestDto,
  CancelEmployeeRequestDto,
  ListEmployeeRequestQueryDto,
  UpdateEmployeeRequestDto,
  UpdateEmployeeRequestStepDto,
} from './dto/request.dto';
import {
  EmployeeRequest,
  EmployeeRequestDocument,
  RequestStepSnapshot,
} from './entity/request.schema';
import { getRequestFormDefinition } from './form/request-form.registry';
import { RequestFormDefinition } from './form/request-form.types';
import { RequestFormValidatorService } from './form/request-form-validator.service';
import {
  EMPLOYEE_REQUEST_STATUSES,
  EmployeeRequestStatus,
  EmployeeRequestStepAction,
  EmployeeRequestStepStatus,
} from './enum/request.enum';
import { RequestRepository } from './repository/request.repository';

type RequestScope = 'your' | 'employee';
type MongoFilter = QueryFilter<EmployeeRequestDocument>;

interface RequestWorkflowStepView {
  id: string;
  order: number;
  responsibleParty: string | null;
}

interface RequestWorkflowView {
  id: string;
  requestType: RequestType;
  name: string;
  isDefault: boolean;
  steps: RequestWorkflowStepView[];
}

interface RequestTypeWorkflowsView {
  type: RequestType;
  label: string;
  workflows: RequestWorkflowView[];
}

@Injectable()
export class RequestService {
  private readonly logger = new Logger(RequestService.name);

  constructor(
    @Inject(RequestRepository)
    private readonly requestRepository: RequestRepository,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(JobTitleRepository)
    private readonly jobTitleRepository: JobTitleRepository,
    @Inject(OrganizationDepartmentRepository)
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
    @Inject(SettingsDomainOrganisationService)
    private readonly settingsDomainOrganisationService: SettingsDomainOrganisationService,
    @Inject(RequestFormValidatorService)
    private readonly requestFormValidator: RequestFormValidatorService,
  ) {}

  async addRequest(
    organizationId: string,
    user: ICurrentUser,
    dto: AddEmployeeRequestDto,
  ) {
    try {
      const details = this.extractRequestDetails(dto);
      const employeeId = dto.employeeId?.trim() || user.employeeId;
      if (!employeeId) {
        AppResponse.error({
          message: 'Employee ID is required.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const resolvedEmployeeId = employeeId!;
      const employee =
        (await this.employeeRepository.findById(resolvedEmployeeId)) ??
        AppResponse.error({
          message: 'Employee not found',
          status: HttpStatus.NOT_FOUND,
        });

      if (employee!.organizationId !== organizationId) {
        AppResponse.error({
          message: 'Employee does not belong to this organization',
          status: HttpStatus.FORBIDDEN,
        });
      }

      const [
        jobTitles,
        workflowResponse,
        creatorEmployee,
        department,
        manager,
      ] = await Promise.all([
        this.jobTitleRepository.findByOrganization(organizationId, 'code name'),
        this.settingsDomainOrganisationService.getRequestWorkflows(
          organizationId,
          dto.requestType,
        ),
        user.employeeId && user.employeeId !== employeeId
          ? this.employeeRepository.findById(user.employeeId)
          : Promise.resolve(employee),
        employee!.departmentCode
          ? this.organizationDepartmentRepository.findByCode(
              organizationId,
              employee!.departmentCode,
            )
          : Promise.resolve(null),
        employee!.supervisor
          ? this.employeeRepository.findById(employee!.supervisor)
          : Promise.resolve(null),
      ]);

      const workflows =
        (workflowResponse as { requestTypes: RequestTypeWorkflowsView[] })
          .requestTypes[0]?.workflows ?? [];
      const workflow = this.selectWorkflow(workflows, dto.workflowId);
      const now = new Date();
      const steps = this.buildRequestSteps(workflow.steps, now);
      const jobTitle = employee!.jobTitleCode
        ? jobTitles.find((title) => title.code === employee!.jobTitleCode)
        : null;
      const employeeName = this.getEmployeeName(employee!);
      const creatorName = creatorEmployee
        ? this.getEmployeeName(creatorEmployee)
        : user.email;
      const lineManager =
        manager && manager.organizationId === organizationId ? manager : null;

      const request = await this.requestRepository.create({
        organizationId,
        requestType: dto.requestType,
        workflowId: workflow.id,
        workflowName: workflow.name,
        employeeId: resolvedEmployeeId,
        employee: {
          employeeId: resolvedEmployeeId,
          employeeUniqueId: employee!.employeeId ?? null,
          employeeName,
          email: employee!.email,
          avatarUrl: employee!.avatarUrl ?? null,
          jobTitle: jobTitle?.name ?? null,
          departmentCode: employee!.departmentCode ?? null,
          department: department?.name ?? null,
          lineManagerId: lineManager ? String(lineManager._id) : null,
          lineManager: lineManager ? this.getEmployeeName(lineManager) : null,
          employmentDate: employee!.employmentDate ?? null,
        },
        createdBy: {
          userId: user.userId,
          email: user.email,
          employeeId: user.employeeId ?? null,
          name: creatorName,
        },
        reason: this.normaliseOptionalString(dto.reason),
        effectiveDate: this.parseDate(dto.effectiveDate),
        endDate: this.parseDate(dto.endDate),
        details,
        attachmentUrls: dto.attachmentUrls ?? [],
        status: EmployeeRequestStatus.PENDING,
        currentStepOrder: steps[0].order,
        steps,
        submittedAt: now,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
      });

      this.logger.log(
        `Created ${dto.requestType} request ${String(request._id)} for employee ${resolvedEmployeeId} in org ${organizationId}`,
      );

      return this.toRequestView(request);
    } catch (error: any) {
      error.location = `RequestService.${this.addRequest.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  private extractRequestDetails(
    dto: AddEmployeeRequestDto,
  ): Record<string, unknown> {
    const definition = getRequestFormDefinition(dto.requestType);
    const values = dto as unknown as Record<string, unknown>;
    const details: Record<string, unknown> = {};

    for (const field of definition.fields) {
      const value = values[field.key];
      if (value === undefined || value === null || value === '') {
        continue;
      }

      details[field.key] = typeof value === 'string' ? value.trim() : value;
    }

    return details;
  }

  async getRequest(organizationId: string, requestId: string) {
    try {
      const request = await this.findRequestOrFail(organizationId, requestId);
      return this.toRequestView(request);
    } catch (error: any) {
      error.location = `RequestService.${this.getRequest.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async getYourRequests(
    organizationId: string,
    user: ICurrentUser,
    query: ListEmployeeRequestQueryDto = {},
  ) {
    return this.listRequests(organizationId, user, query, 'your');
  }

  async getEmployeeRequests(
    organizationId: string,
    user: ICurrentUser,
    query: ListEmployeeRequestQueryDto = {},
  ) {
    return this.listRequests(organizationId, user, query, 'employee');
  }

  async getSummary(organizationId: string, user: ICurrentUser) {
    try {
      const [your, employee] = await Promise.all([
        this.countSummary(this.buildWhere(organizationId, user, {}, 'your')),
        this.countSummary(
          this.buildWhere(organizationId, user, {}, 'employee'),
        ),
      ]);

      return { your, employee };
    } catch (error: any) {
      error.location = `RequestService.${this.getSummary.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async getRequestTypes(organizationId: string) {
    try {
      const response =
        (await this.settingsDomainOrganisationService.getRequestWorkflows(
          organizationId,
        )) as { requestTypes: RequestTypeWorkflowsView[] };

      return {
        requestTypes: response.requestTypes.map((entry) => {
          const defaultWorkflow =
            entry.workflows.find((workflow) => workflow.isDefault) ??
            entry.workflows[0] ??
            null;

          return {
            type: entry.type,
            label: entry.label,
            hasWorkflow: entry.workflows.length > 0,
            defaultWorkflowId: defaultWorkflow?.id ?? null,
            defaultWorkflowName: defaultWorkflow?.name ?? null,
            workflows: entry.workflows.map((workflow) => ({
              id: workflow.id,
              name: workflow.name,
              isDefault: workflow.isDefault,
              stepCount: workflow.steps.length,
            })),
          };
        }),
      };
    } catch (error: any) {
      error.location = `RequestService.${this.getRequestTypes.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  getRequestForm(requestType: RequestType): RequestFormDefinition {
    const definition = getRequestFormDefinition(requestType);
    if (!definition) {
      AppResponse.error({
        message: 'Request form not found',
        status: HttpStatus.NOT_FOUND,
      });
    }

    return definition!;
  }

  async updateRequest(
    organizationId: string,
    requestId: string,
    dto: UpdateEmployeeRequestDto,
  ) {
    try {
      const request = await this.findRequestOrFail(organizationId, requestId);

      if (request.status !== EmployeeRequestStatus.PENDING) {
        AppResponse.error({
          message: 'Only pending requests can be updated',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const changes: Partial<EmployeeRequest> = {};

      if (dto.workflowId !== undefined) {
        const workflowResponse =
          await this.settingsDomainOrganisationService.getRequestWorkflows(
            organizationId,
            request.requestType,
          );
        const workflows =
          (workflowResponse as { requestTypes: RequestTypeWorkflowsView[] })
            .requestTypes[0]?.workflows ?? [];
        const workflow = this.selectWorkflow(workflows, dto.workflowId);
        const steps = this.buildRequestSteps(workflow.steps, new Date());

        changes.workflowId = workflow.id;
        changes.workflowName = workflow.name;
        changes.steps = steps;
        changes.currentStepOrder = steps[0].order;
      }

      if (dto.reason !== undefined) {
        changes.reason = this.normaliseOptionalString(dto.reason);
      }
      if (dto.effectiveDate !== undefined) {
        changes.effectiveDate = this.parseDate(dto.effectiveDate);
      }
      if (dto.endDate !== undefined) {
        changes.endDate = this.parseDate(dto.endDate);
      }
      if (dto.details !== undefined) {
        const mergedDetails = {
          ...request.details,
          ...dto.details,
        };
        changes.details = this.requestFormValidator.validate(
          request.requestType,
          mergedDetails,
        );
      }
      if (dto.attachmentUrls !== undefined) {
        changes.attachmentUrls = dto.attachmentUrls;
      }

      const updated = await this.requestRepository.updateById(
        requestId,
        changes,
      );

      return this.toRequestView(updated!);
    } catch (error: any) {
      error.location = `RequestService.${this.updateRequest.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async cancelRequest(
    organizationId: string,
    requestId: string,
    dto: CancelEmployeeRequestDto,
  ) {
    try {
      const request = await this.findRequestOrFail(organizationId, requestId);

      if (
        request.status === EmployeeRequestStatus.CANCELLED ||
        request.status === EmployeeRequestStatus.APPROVED ||
        request.status === EmployeeRequestStatus.REJECTED
      ) {
        AppResponse.error({
          message: 'Request can no longer be cancelled',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const cancelledAt = new Date();
      const updated = await this.requestRepository.updateById(requestId, {
        status: EmployeeRequestStatus.CANCELLED,
        cancelledAt,
        cancellationReason: this.normaliseOptionalString(dto.reason),
      });

      this.logger.log(
        `Cancelled request ${requestId} in org ${organizationId}`,
      );
      return this.toRequestView(updated!);
    } catch (error: any) {
      error.location = `RequestService.${this.cancelRequest.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async updateRequestStep(
    organizationId: string,
    user: ICurrentUser,
    requestId: string,
    dto: UpdateEmployeeRequestStepDto,
  ) {
    try {
      const request = await this.findRequestOrFail(organizationId, requestId);

      if (
        request.status === EmployeeRequestStatus.CANCELLED ||
        request.status === EmployeeRequestStatus.APPROVED ||
        request.status === EmployeeRequestStatus.REJECTED
      ) {
        AppResponse.error({
          message: 'Request has already been completed',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const steps = [...request.steps].sort((a, b) => a.order - b.order);
      const activeIndex = this.findActiveStepIndex(steps);
      const activeStep = activeIndex === -1 ? null : steps[activeIndex];

      if (!activeStep) {
        AppResponse.error({
          message: 'Request has no active step',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      if (activeStep!.stepId !== dto.stepId) {
        AppResponse.error({
          message: 'Step is not the current request step',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const now = new Date();
      const completedAt =
        dto.action === EmployeeRequestStepAction.REJECT ? now : now;
      steps[activeIndex] = {
        ...activeStep!,
        status:
          dto.action === EmployeeRequestStepAction.APPROVE
            ? EmployeeRequestStepStatus.APPROVED
            : EmployeeRequestStepStatus.REJECTED,
        completedAt,
        actedByUserId: user.userId,
        actedByName: user.email,
        comment: this.normaliseOptionalString(dto.comment),
      };

      let status = request.status;
      let currentStepOrder = activeStep!.order;
      let requestCompletedAt: Date | null = request.completedAt ?? null;

      if (dto.action === EmployeeRequestStepAction.REJECT) {
        status = EmployeeRequestStatus.REJECTED;
        requestCompletedAt = now;
      } else {
        const nextStep = steps[activeIndex + 1];

        if (nextStep) {
          nextStep.status = EmployeeRequestStepStatus.IN_PROGRESS;
          nextStep.startedAt = nextStep.startedAt ?? now;
          status = EmployeeRequestStatus.IN_PROGRESS;
          currentStepOrder = nextStep.order;
        } else {
          status = EmployeeRequestStatus.APPROVED;
          requestCompletedAt = now;
        }
      }

      const updated = await this.requestRepository.updateById(requestId, {
        steps,
        status,
        currentStepOrder,
        completedAt: requestCompletedAt,
      });

      this.logger.log(
        `Updated request ${requestId} step ${dto.stepId} with action ${dto.action}`,
      );
      return this.toRequestView(updated!);
    } catch (error: any) {
      error.location = `RequestService.${this.updateRequestStep.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async deleteRequest(organizationId: string, requestId: string) {
    try {
      const request = await this.findRequestOrFail(organizationId, requestId);

      if (
        request.status !== EmployeeRequestStatus.CANCELLED &&
        request.status !== EmployeeRequestStatus.REJECTED
      ) {
        AppResponse.error({
          message: 'Only cancelled or rejected requests can be deleted',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      await this.requestRepository.deleteById(requestId);
      this.logger.log(`Deleted request ${requestId} in org ${organizationId}`);
      return 'Request deleted';
    } catch (error: any) {
      error.location = `RequestService.${this.deleteRequest.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  private async listRequests(
    organizationId: string,
    user: ICurrentUser,
    query: ListEmployeeRequestQueryDto,
    scope: RequestScope,
  ) {
    try {
      const batch = query.batch ?? 1;
      const limit = query.limit ?? 10;
      const where = this.buildWhere(organizationId, user, query, scope);

      const { items, total } = await this.requestRepository.paginatedQuery(
        where,
        { createdAt: -1 },
        batch,
        limit,
      );

      return {
        data: items.map((request) => this.toRequestListItem(request)),
        count: total,
      };
    } catch (error: any) {
      error.location = `RequestService.${this.listRequests.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  private buildWhere(
    organizationId: string,
    user: ICurrentUser,
    query: ListEmployeeRequestQueryDto,
    scope: RequestScope,
  ): MongoFilter {
    const conditions: Record<string, unknown>[] = [
      { organizationId },
      this.buildScopeFilter(user, scope),
    ];

    if (query.requestType) {
      conditions.push({ requestType: query.requestType });
    }
    if (query.status) {
      conditions.push({ status: query.status });
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
          { workflowName: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const createdAt: Record<string, Date> = {};
    const startDate = this.parseDate(query.startDate);
    const endDate = this.parseDate(query.endDate, true);
    if (startDate) createdAt.$gte = startDate;
    if (endDate) createdAt.$lte = endDate;
    if (Object.keys(createdAt).length > 0) {
      conditions.push({ createdAt });
    }

    return (
      conditions.length === 1 ? conditions[0] : { $and: conditions }
    ) as MongoFilter;
  }

  private buildScopeFilter(
    user: ICurrentUser,
    scope: RequestScope,
  ): Record<string, unknown> {
    if (scope === 'your') {
      const clauses: Record<string, unknown>[] = [
        { 'createdBy.userId': user.userId },
      ];
      if (user.employeeId) {
        clauses.push({ employeeId: user.employeeId });
      }
      return { $or: clauses };
    }

    return user.employeeId ? { employeeId: { $ne: user.employeeId } } : {};
  }

  private async countSummary(where: MongoFilter) {
    const counts = await Promise.all(
      EMPLOYEE_REQUEST_STATUSES.map(async (status) => {
        const count = await this.requestRepository.count(
          Object.assign({}, where, { status }) as MongoFilter,
        );
        return [status, count] as const;
      }),
    );

    const summary = counts.reduce(
      (acc, [status, count]) => {
        acc[status] = count;
        acc.total += count;
        return acc;
      },
      {
        total: 0,
        pending: 0,
        in_progress: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      } as Record<string, number>,
    );

    return summary;
  }

  private async findRequestOrFail(
    organizationId: string,
    requestId: string,
  ): Promise<EmployeeRequestDocument> {
    const request =
      (await this.requestRepository.findById(requestId)) ??
      AppResponse.error({
        message: 'Request not found',
        status: HttpStatus.NOT_FOUND,
      });

    if (request!.organizationId !== organizationId) {
      AppResponse.error({
        message: 'Request does not belong to this organization',
        status: HttpStatus.FORBIDDEN,
      });
    }

    return request!;
  }

  private selectWorkflow(
    workflows: RequestWorkflowView[],
    workflowId?: string,
  ): RequestWorkflowView {
    if (workflowId) {
      const workflow = workflows.find((item) => item.id === workflowId);
      if (!workflow) {
        AppResponse.error({
          message: 'Request workflow not found',
          status: HttpStatus.NOT_FOUND,
        });
      }
      return workflow!;
    }

    const workflow = workflows.find((item) => item.isDefault) ?? workflows[0];
    if (!workflow) {
      AppResponse.error({
        message: 'No request workflow configured for this request type',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return workflow!;
  }

  private buildRequestSteps(
    workflowSteps: RequestWorkflowStepView[],
    startedAt: Date,
  ): RequestStepSnapshot[] {
    const sortedSteps = [...workflowSteps].sort((a, b) => a.order - b.order);

    if (sortedSteps.length === 0) {
      AppResponse.error({
        message: 'Request workflow has no steps',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return sortedSteps.map((step, index) => ({
      stepId: step.id,
      order: step.order,
      responsibleParty: step.responsibleParty ?? null,
      status:
        index === 0
          ? EmployeeRequestStepStatus.IN_PROGRESS
          : EmployeeRequestStepStatus.PENDING,
      startedAt: index === 0 ? startedAt : null,
      completedAt: null,
      actedByUserId: null,
      actedByName: null,
      comment: null,
    }));
  }

  private findActiveStepIndex(steps: RequestStepSnapshot[]): number {
    const inProgressIndex = steps.findIndex(
      (step) => step.status === EmployeeRequestStepStatus.IN_PROGRESS,
    );
    if (inProgressIndex !== -1) {
      return inProgressIndex;
    }

    return steps.findIndex(
      (step) => step.status === EmployeeRequestStepStatus.PENDING,
    );
  }

  private toRequestListItem(request: EmployeeRequestDocument) {
    const view = this.toRequestView(request);

    return {
      id: view.id,
      requestType: view.requestType,
      requestTypeLabel: view.requestTypeLabel,
      title: view.title,
      status: view.status,
      employee: view.employee,
      workflow: view.workflow,
      currentStep: view.currentStep,
      progress: view.progress,
      createdAt: view.createdAt,
      submittedAt: view.submittedAt,
      updatedAt: view.updatedAt,
    };
  }

  private toRequestView(request: EmployeeRequestDocument) {
    const steps = [...(request.steps ?? [])].sort((a, b) => a.order - b.order);
    const totalSteps = steps.length;
    const approvedSteps = steps.filter(
      (step) => step.status === EmployeeRequestStepStatus.APPROVED,
    ).length;
    const activeIndex = this.findActiveStepIndex(steps);
    const activeStep = activeIndex === -1 ? null : steps[activeIndex];
    const isTerminal =
      request.status === EmployeeRequestStatus.APPROVED ||
      request.status === EmployeeRequestStatus.REJECTED ||
      request.status === EmployeeRequestStatus.CANCELLED;
    const requestType = request.requestType;

    return {
      id: String(request._id),
      requestType,
      requestTypeLabel: REQUEST_TYPE_LABELS[requestType],
      title: `${REQUEST_TYPE_LABELS[requestType]} for ${request.employee?.employeeName ?? request.employeeId}`,
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
        lineManagerId: request.employee?.lineManagerId ?? null,
        lineManager: request.employee?.lineManager ?? null,
        employmentDate: this.formatDate(request.employee?.employmentDate),
      },
      createdBy: {
        userId: request.createdBy?.userId ?? null,
        email: request.createdBy?.email ?? null,
        employeeId: request.createdBy?.employeeId ?? null,
        name: request.createdBy?.name ?? null,
      },
      workflow: {
        id: request.workflowId,
        name: request.workflowName,
      },
      reason: request.reason ?? null,
      effectiveDate: this.formatDate(request.effectiveDate),
      endDate: this.formatDate(request.endDate),
      details: request.details ?? {},
      attachmentUrls: request.attachmentUrls ?? [],
      currentStep:
        activeStep && !isTerminal
          ? {
              stepId: activeStep.stepId,
              responsibleParty: activeStep.responsibleParty ?? null,
              number: activeIndex + 1,
              order: activeStep.order,
              total: totalSteps,
            }
          : null,
      progress:
        totalSteps === 0 ? 0 : Math.round((approvedSteps / totalSteps) * 100),
      completedSteps: approvedSteps,
      totalSteps,
      steps: steps.map((step) => ({
        stepId: step.stepId,
        order: step.order,
        responsibleParty: step.responsibleParty ?? null,
        status: step.status,
        startedAt: this.formatDateTime(step.startedAt),
        completedAt: this.formatDateTime(step.completedAt),
        actedByUserId: step.actedByUserId ?? null,
        actedByName: step.actedByName ?? null,
        comment: step.comment ?? null,
      })),
      canUpdate:
        request.status === EmployeeRequestStatus.PENDING &&
        activeIndex === 0 &&
        !steps.some(
          (step) => step.status === EmployeeRequestStepStatus.APPROVED,
        ),
      canCancel:
        request.status === EmployeeRequestStatus.PENDING ||
        request.status === EmployeeRequestStatus.IN_PROGRESS,
      cancellationReason: request.cancellationReason ?? null,
      createdAt: this.formatDateTime(request.createdAt),
      submittedAt: this.formatDateTime(request.submittedAt),
      completedAt: this.formatDateTime(request.completedAt),
      cancelledAt: this.formatDateTime(request.cancelledAt),
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

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
