import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { QueryFilter, Types } from 'mongoose';
import type { CurrentUser as ICurrentUser } from '../../common';
import { AppResponse } from '../../common/response/app-response';
import { EmployeeRequestDocument } from '../request/entity/request.schema';
import {
  EmployeeRequestStatus,
  EmployeeRequestStepAction,
  EmployeeRequestStepStatus,
} from '../request/enum/request.enum';
import { RequestRepository } from '../request/repository/request.repository';
import { RequestService } from '../request/request.service';
import { AddEmployeeRequestDto } from '../request/dto/request.dto';
import { UpdateEmployeeRequestDto } from '../request/dto/request.dto';
import { TerminationType } from '../request/dto/forms/form-option.enums';
import { RequestType } from '../setting/request-management/enum/request-management.enum';
import { SettingsDomainOrganisationService } from '../setting/domain/settings.domain.organisation.service';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { EmployeeStatus } from '../employee/enum/employee.enum';
import {
  CancelExitRequestDto,
  CompleteExitRequestDto,
  ExitSummaryQueryDto,
  InitiateExitRequestDto,
  ListExitRequestQueryDto,
  RetrieveExitRequestDto,
  UpdateExitChecklistDto,
  UpdateExitDocumentDto,
  UpdateExitRequestDto,
  UpdateExitRequestStepDto,
} from './dto/offboarding.dto';
import {
  ExitChecklistKind,
  ExitRequestStatus,
  EXIT_REQUEST_STATUSES,
} from './enum/offboarding.enum';
import { ExitTrackingDocument } from './entity/exit-tracking.schema';
import { ExitTrackingRepository } from './repository/exit-tracking.repository';

type MongoFilter = QueryFilter<EmployeeRequestDocument>;

interface OffboardingTypeView {
  id: string;
  label: string;
}

interface ExitReasonView {
  id: string;
  label: string;
}

interface ExitChecklistView {
  id: string;
  label: string;
  description: string | null;
  selected: boolean;
}

interface EmployerExitDocumentView {
  id: string;
  name: string;
  url: string | null;
  fileType: string | null;
  requiresSignature: boolean;
}

interface OffboardingSettingsView {
  offboardingTypes: OffboardingTypeView[];
  exitReasons: ExitReasonView[];
  exitChecklist: ExitChecklistView[];
}

interface OffboardingDocumentsSettingsView {
  employerExitDocuments: EmployerExitDocumentView[];
  complianceChecklist: ExitChecklistView[];
  dataRetentionPeriod: string | null;
  dataRetentionPeriodLabel: string | null;
}

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
export class OffboardingService {
  private readonly logger = new Logger(OffboardingService.name);

  constructor(
    @Inject(RequestRepository)
    private readonly requestRepository: RequestRepository,
    @Inject(RequestService)
    private readonly requestService: RequestService,
    @Inject(ExitTrackingRepository)
    private readonly exitTrackingRepository: ExitTrackingRepository,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(SettingsDomainOrganisationService)
    private readonly settingsDomainOrganisationService: SettingsDomainOrganisationService,
  ) {}

  async getFormOptions(organizationId: string) {
    try {
      const [settings, documents, workflowResponse] = await Promise.all([
        this.getOffboardingSettings(organizationId),
        this.getOffboardingDocumentsSettings(organizationId),
        this.settingsDomainOrganisationService.getRequestWorkflows(
          organizationId,
          RequestType.EMPLOYEE_TERMINATION,
        ),
      ]);

      const workflows =
        (workflowResponse as { requestTypes: RequestTypeWorkflowsView[] })
          .requestTypes[0]?.workflows ?? [];
      const defaultWorkflow =
        workflows.find((workflow) => workflow.isDefault) ?? workflows[0] ?? null;

      return {
        offboardingTypes: settings.offboardingTypes,
        exitReasons: settings.exitReasons,
        exitChecklist: settings.exitChecklist,
        employerExitDocuments: documents.employerExitDocuments,
        complianceChecklist: documents.complianceChecklist,
        dataRetentionPeriod: documents.dataRetentionPeriod,
        dataRetentionPeriodLabel: documents.dataRetentionPeriodLabel,
        terminationTypes: Object.values(TerminationType),
        form: this.requestService.getRequestForm(
          RequestType.EMPLOYEE_TERMINATION,
        ),
        workflows: workflows.map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
          isDefault: workflow.isDefault,
          stepCount: workflow.steps.length,
        })),
        defaultWorkflowId: defaultWorkflow?.id ?? null,
        defaultWorkflowName: defaultWorkflow?.name ?? null,
      };
    } catch (error: unknown) {
      this.handleError(error, this.getFormOptions.name);
    }
  }

  async listRequests(
    organizationId: string,
    query: ListExitRequestQueryDto,
  ) {
    try {
      const batch = query.batch ?? 1;
      const limit = query.limit ?? 10;
      const where = await this.buildRequestWhere(organizationId, query);

      const { items, total } =
        await this.requestRepository.paginatedQuery(
          where,
          { createdAt: -1 },
          batch,
          limit,
        );

      const requestIds = items.map((request) => String(request._id));
      const trackings = await this.exitTrackingRepository.findByRequestIds(
        organizationId,
        requestIds,
      );
      const trackingMap = new Map(
        trackings.map((tracking) => [tracking.requestId, tracking]),
      );

      return {
        data: items.map((request) =>
          this.toExitListItem(request, trackingMap.get(String(request._id))),
        ),
        count: total,
      };
    } catch (error: unknown) {
      this.handleError(error, this.listRequests.name);
    }
  }

  async retrieveRequest(
    organizationId: string,
    dto: RetrieveExitRequestDto,
  ) {
    try {
      const request = (await this.requestService.getRequest(
        organizationId,
        dto.requestId,
      )) as Record<string, any>;

      const tracking =
        (await this.exitTrackingRepository.findByRequestId(
          organizationId,
          dto.requestId,
        )) ??
        (await this.buildDefaultTracking(
          organizationId,
          dto.requestId,
          request.employee?.employeeId ?? request.employeeId,
        ));

      return this.toExitDetailView(request, tracking);
    } catch (error: unknown) {
      this.handleError(error, this.retrieveRequest.name);
    }
  }

  async initiateRequest(
    organizationId: string,
    user: ICurrentUser,
    dto: InitiateExitRequestDto,
  ) {
    try {
      const employee =
        (await this.employeeRepository.findById(dto.employeeId)) ??
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

      const [settings, documents] = await Promise.all([
        this.getOffboardingSettings(organizationId),
        this.getOffboardingDocumentsSettings(organizationId),
      ]);

      const offboardingType = this.findOffboardingType(
        settings.offboardingTypes,
        dto.offboardingTypeId,
      );
      const exitReason = this.findExitReason(
        settings.exitReasons,
        dto.exitReasonId,
      );
      const terminationType = this.deriveTerminationType(
        offboardingType.label,
        dto.terminationType,
      );
      const reasonForTermination =
        this.normaliseOptionalString(dto.reasonForTermination) ??
        exitReason.label;

      const request = (await this.requestService.addRequest(
        organizationId,
        user,
        {
          requestType: RequestType.EMPLOYEE_TERMINATION,
          employeeId: dto.employeeId,
          workflowId: dto.workflowId,
          effectiveDate: dto.lastWorkingDay,
          endDate: dto.lastWorkingDay,
          reason: reasonForTermination,
          terminationDate: dto.lastWorkingDay,
          terminationType,
          reasonForTermination,
          exitInterviewDate: dto.exitInterviewDate,
          attachmentUrls: dto.attachmentUrls ?? [],
        } as AddEmployeeRequestDto,
      )) as Record<string, any>;

      const requestId = String(request.id);
      const trackingData = this.buildTrackingSnapshot({
        organizationId,
        requestId,
        employeeId: dto.employeeId,
        settings,
        documents,
        exitType: offboardingType,
        exitReason,
        checklistItemIds: dto.checklistItemIds,
        complianceChecklistItemIds: dto.complianceChecklistItemIds,
      });

      const tracking = await this.exitTrackingRepository.create(trackingData);

      this.logger.log(
        `Initiated exit request ${requestId} for employee ${dto.employeeId} in org ${organizationId}`,
      );

      return this.toExitDetailView(request, tracking);
    } catch (error: unknown) {
      this.handleError(error, this.initiateRequest.name);
    }
  }

  async updateRequest(
    organizationId: string,
    dto: UpdateExitRequestDto,
  ) {
    try {
      const request = await this.findRequestOrFail(
        organizationId,
        dto.requestId,
      );

      if (request.status !== EmployeeRequestStatus.PENDING) {
        AppResponse.error({
          message: 'Only pending exit requests can be updated',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const changes: UpdateEmployeeRequestDto = {};
      const details: Record<string, unknown> = {};
      const [settings, documents] = await Promise.all([
        this.getOffboardingSettings(organizationId),
        this.getOffboardingDocumentsSettings(organizationId),
      ]);

      let exitType: OffboardingTypeView | null = null;
      let exitReason: ExitReasonView | null = null;

      if (dto.offboardingTypeId !== undefined) {
        exitType = this.findOffboardingType(
          settings.offboardingTypes,
          dto.offboardingTypeId,
        );
        const derivedType = this.deriveTerminationType(
          exitType.label,
          dto.terminationType,
        );
        details.terminationType = derivedType;
      } else if (dto.terminationType !== undefined) {
        details.terminationType = dto.terminationType;
      }

      if (dto.exitReasonId !== undefined) {
        exitReason = this.findExitReason(
          settings.exitReasons,
          dto.exitReasonId,
        );
      }

      if (dto.lastWorkingDay !== undefined) {
        details.terminationDate = dto.lastWorkingDay;
        changes.effectiveDate = dto.lastWorkingDay;
        changes.endDate = dto.lastWorkingDay;
      }
      if (dto.reasonForTermination !== undefined) {
        const reason = this.normaliseOptionalString(dto.reasonForTermination);
        if (!reason) {
          AppResponse.error({
            message: 'Reason for termination is required',
            status: HttpStatus.BAD_REQUEST,
          });
        }
        details.reasonForTermination = reason;
        changes.reason = reason!;
      }
      if (dto.exitInterviewDate !== undefined) {
        details.exitInterviewDate = dto.exitInterviewDate;
      }
      if (Object.keys(details).length > 0) {
        changes.details = details;
      }
      if (dto.workflowId !== undefined) {
        changes.workflowId = dto.workflowId;
      }
      if (dto.attachmentUrls !== undefined) {
        changes.attachmentUrls = dto.attachmentUrls;
      }

      if (Object.keys(changes).length > 0) {
        await this.requestService.updateRequest(
          organizationId,
          dto.requestId,
          changes,
        );
      }

      const needsTrackingUpdate =
        dto.offboardingTypeId !== undefined ||
        dto.exitReasonId !== undefined ||
        dto.checklistItemIds !== undefined ||
        dto.complianceChecklistItemIds !== undefined;

      if (needsTrackingUpdate) {
        const currentTracking =
          (await this.exitTrackingRepository.findByRequestId(
            organizationId,
            dto.requestId,
          )) ??
          this.buildTrackingSnapshot({
            organizationId,
            requestId: dto.requestId,
            employeeId: request.employeeId,
            settings,
            documents,
            exitType: null,
            exitReason: null,
          });

        const data = this.toTrackingUpdateData(currentTracking);

        if (exitType) {
          data.exitType = { id: exitType.id, label: exitType.label };
        }
        if (exitReason) {
          data.exitReason = { id: exitReason.id, label: exitReason.label };
        }
        if (dto.checklistItemIds !== undefined) {
          data.exitChecklist = this.mergeChecklistSelection(
            settings.exitChecklist,
            dto.checklistItemIds,
            data.exitChecklist,
            'Exit checklist item',
          );
        }
        if (dto.complianceChecklistItemIds !== undefined) {
          data.complianceChecklist = this.mergeChecklistSelection(
            documents.complianceChecklist,
            dto.complianceChecklistItemIds,
            data.complianceChecklist,
            'Compliance checklist item',
          );
        }

        await this.exitTrackingRepository.upsertByRequestId(
          organizationId,
          dto.requestId,
          data,
        );
      }

      return this.retrieveRequest(organizationId, {
        requestId: dto.requestId,
      });
    } catch (error: unknown) {
      this.handleError(error, this.updateRequest.name);
    }
  }

  async updateRequestStep(
    organizationId: string,
    user: ICurrentUser,
    dto: UpdateExitRequestStepDto,
  ) {
    try {
      await this.findRequestOrFail(organizationId, dto.requestId);
      await this.requestService.updateRequestStep(
        organizationId,
        user,
        dto.requestId,
        {
          stepId: dto.stepId,
          action: dto.action as EmployeeRequestStepAction,
          comment: dto.comment,
        },
      );

      return this.retrieveRequest(organizationId, {
        requestId: dto.requestId,
      });
    } catch (error: unknown) {
      this.handleError(error, this.updateRequestStep.name);
    }
  }

  async cancelRequest(
    organizationId: string,
    dto: CancelExitRequestDto,
  ) {
    try {
      await this.findRequestOrFail(organizationId, dto.requestId);
      await this.requestService.cancelRequest(organizationId, dto.requestId, {
        reason: dto.reason,
      });

      return this.retrieveRequest(organizationId, {
        requestId: dto.requestId,
      });
    } catch (error: unknown) {
      this.handleError(error, this.cancelRequest.name);
    }
  }

  async updateChecklist(
    organizationId: string,
    user: ICurrentUser,
    dto: UpdateExitChecklistDto,
  ) {
    try {
      const request = await this.findRequestOrFail(
        organizationId,
        dto.requestId,
      );
      const tracking = await this.resolveTracking(organizationId, request);

      if (tracking.completedAt) {
        AppResponse.error({
          message: 'Completed exits can no longer be updated',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const key =
        dto.kind === ExitChecklistKind.COMPLIANCE
          ? 'complianceChecklist'
          : 'exitChecklist';
      const checklist = this.toChecklistProgress(tracking[key] ?? []);
      const index = checklist.findIndex((item) => item.id === dto.itemId);
      if (index === -1) {
        AppResponse.error({
          message: 'Checklist item not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const now = new Date();
      checklist[index] = {
        ...checklist[index],
        completed: dto.completed,
        completedAt: dto.completed ? now : null,
        completedByUserId: dto.completed ? user.userId : null,
        completedByName: dto.completed ? user.email : null,
      };

      const updated = await this.exitTrackingRepository.upsertByRequestId(
        organizationId,
        dto.requestId,
        { [key]: checklist },
      );

      return this.toExitDetailView(
        await this.requestService.getRequest(organizationId, dto.requestId),
        updated,
      );
    } catch (error: unknown) {
      this.handleError(error, this.updateChecklist.name);
    }
  }

  async updateDocument(
    organizationId: string,
    dto: UpdateExitDocumentDto,
  ) {
    try {
      const request = await this.findRequestOrFail(
        organizationId,
        dto.requestId,
      );
      const tracking = await this.resolveTracking(organizationId, request);

      if (tracking.completedAt) {
        AppResponse.error({
          message: 'Completed exits can no longer be updated',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const documents = this.toDocumentProgress(
        tracking.employerDocuments ?? [],
      );
      const index = documents.findIndex(
        (document) => document.id === dto.documentId,
      );
      if (index === -1) {
        AppResponse.error({
          message: 'Exit document not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const document = documents[index];
      const completed =
        dto.completed !== undefined ? dto.completed : document.completed;
      const updatedDocument = {
        ...document,
        completed,
        completedAt:
          completed && !document.completed ? new Date() : document.completedAt,
        attachmentUrl:
          dto.attachmentUrl !== undefined
            ? dto.attachmentUrl
            : document.attachmentUrl,
        signed: dto.signed !== undefined ? dto.signed : document.signed,
      };

      if (!completed) {
        updatedDocument.completedAt = null;
      }

      documents[index] = updatedDocument;

      const updated = await this.exitTrackingRepository.upsertByRequestId(
        organizationId,
        dto.requestId,
        { employerDocuments: documents },
      );

      return this.toExitDetailView(
        await this.requestService.getRequest(organizationId, dto.requestId),
        updated,
      );
    } catch (error: unknown) {
      this.handleError(error, this.updateDocument.name);
    }
  }

  async completeRequest(
    organizationId: string,
    user: ICurrentUser,
    dto: CompleteExitRequestDto,
  ) {
    try {
      const request = await this.findRequestOrFail(
        organizationId,
        dto.requestId,
      );

      if (request.status !== EmployeeRequestStatus.APPROVED) {
        AppResponse.error({
          message: 'Only approved exit requests can be completed',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const tracking = await this.resolveTracking(organizationId, request);
      if (!tracking.completedAt) {
        this.assertExitReadyToComplete(tracking);

        const completedAt = new Date();
        tracking.completedAt = completedAt;
        tracking.completedByUserId = user.userId;
        tracking.completedByName = user.email;

        await this.exitTrackingRepository.upsertByRequestId(
          organizationId,
          dto.requestId,
          this.toTrackingUpdateData(tracking),
        );
      }

      await this.terminateEmployee(organizationId, request.employeeId);

      this.logger.log(
        `Completed exit request ${dto.requestId} in org ${organizationId}`,
      );

      return this.retrieveRequest(organizationId, {
        requestId: dto.requestId,
      });
    } catch (error: unknown) {
      this.handleError(error, this.completeRequest.name);
    }
  }

  async getSummary(
    organizationId: string,
    query: ExitSummaryQueryDto,
  ) {
    try {
      const upcomingDays = query.upcomingDays ?? 30;
      const requests = await this.requestRepository.findAll(
        {
          organizationId,
          requestType: RequestType.EMPLOYEE_TERMINATION,
        },
        { createdAt: -1 },
      );
      const requestIds = requests.map((request) => String(request._id));
      const trackings = await this.exitTrackingRepository.findByRequestIds(
        organizationId,
        requestIds,
      );
      const trackingMap = new Map(
        trackings.map((tracking) => [tracking.requestId, tracking]),
      );

      const counts = EXIT_REQUEST_STATUSES.reduce(
        (acc, status) => {
          acc[status] = 0;
          return acc;
        },
        {} as Record<ExitRequestStatus, number>,
      );

      const typeCounts = new Map<string, number>();
      const reasonCounts = new Map<string, number>();
      const today = this.startOfDay(new Date());
      const upcomingEnd = this.addDays(today, upcomingDays);
      const upcoming: Record<string, any>[] = [];

      for (const request of requests) {
        const tracking = trackingMap.get(String(request._id));
        const status = this.toExitStatus(request.status, tracking);
        counts[status] += 1;

        const type = this.resolveExitType(request, tracking);
        const reason = this.resolveExitReason(request, tracking);
        typeCounts.set(
          type?.label ?? 'Unspecified',
          (typeCounts.get(type?.label ?? 'Unspecified') ?? 0) + 1,
        );
        reasonCounts.set(
          reason?.label ?? 'Unspecified',
          (reasonCounts.get(reason?.label ?? 'Unspecified') ?? 0) + 1,
        );

        const lastWorkingDay = this.getLastWorkingDay(request);
        if (!lastWorkingDay) {
          continue;
        }

        const lastWorkingDate = this.parseDate(lastWorkingDay);
        if (
          !lastWorkingDate ||
          status === ExitRequestStatus.COMPLETED ||
          status === ExitRequestStatus.CANCELLED ||
          status === ExitRequestStatus.REJECTED ||
          lastWorkingDate < today ||
          lastWorkingDate > upcomingEnd
        ) {
          continue;
        }

        upcoming.push({
          id: String(request._id),
          employee: this.toEmployeeView(
            request.employee,
            request.employeeId,
          ),
          exitType: type,
          exitReason: reason,
          lastWorkingDay,
          daysUntil: this.daysBetween(today, lastWorkingDate),
          status,
        });
      }

      upcoming.sort((a, b) =>
        String(a.lastWorkingDay).localeCompare(String(b.lastWorkingDay)),
      );

      const total = requests.length;
      const onExit =
        counts[ExitRequestStatus.PENDING] +
        counts[ExitRequestStatus.IN_PROGRESS];

      return {
        total,
        pending: counts[ExitRequestStatus.PENDING],
        inProgress: counts[ExitRequestStatus.IN_PROGRESS],
        completed: counts[ExitRequestStatus.COMPLETED],
        cancelled: counts[ExitRequestStatus.CANCELLED],
        rejected: counts[ExitRequestStatus.REJECTED],
        onExit,
        upcomingDays,
        upcomingExits: upcoming,
        byExitType: this.toCountList(typeCounts),
        byExitReason: this.toCountList(reasonCounts),
      };
    } catch (error: unknown) {
      this.handleError(error, this.getSummary.name);
    }
  }

  private async buildRequestWhere(
    organizationId: string,
    query: ListExitRequestQueryDto,
  ): Promise<MongoFilter> {
    const conditions: Record<string, unknown>[] = [
      { organizationId },
      { requestType: RequestType.EMPLOYEE_TERMINATION },
    ];

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

    if (query.status) {
      const completedIds =
        await this.exitTrackingRepository.findCompletedRequestIds(
          organizationId,
        );

      switch (query.status) {
        case ExitRequestStatus.PENDING:
          conditions.push({ status: EmployeeRequestStatus.PENDING });
          break;
        case ExitRequestStatus.IN_PROGRESS: {
          conditions.push({
            status: {
              $in: [
                EmployeeRequestStatus.IN_PROGRESS,
                EmployeeRequestStatus.APPROVED,
              ],
            },
          });
          if (completedIds.length > 0) {
            conditions.push({ _id: { $nin: completedIds } });
          }
          break;
        }
        case ExitRequestStatus.COMPLETED:
          conditions.push({ _id: { $in: completedIds } });
          break;
        case ExitRequestStatus.CANCELLED:
          conditions.push({ status: EmployeeRequestStatus.CANCELLED });
          break;
        case ExitRequestStatus.REJECTED:
          conditions.push({ status: EmployeeRequestStatus.REJECTED });
          break;
      }
    }

    const lastWorkingDay: Record<string, string> = {};
    if (query.lastWorkingDayFrom) {
      lastWorkingDay.$gte = query.lastWorkingDayFrom;
    }
    if (query.lastWorkingDayTo) {
      lastWorkingDay.$lte = query.lastWorkingDayTo;
    }
    if (Object.keys(lastWorkingDay).length > 0) {
      conditions.push({ 'details.terminationDate': lastWorkingDay });
    }

    const createdAt: Record<string, Date> = {};
    const requestedFrom = this.parseDate(query.requestedFrom);
    const requestedTo = this.parseDate(query.requestedTo, true);
    if (requestedFrom) createdAt.$gte = requestedFrom;
    if (requestedTo) createdAt.$lte = requestedTo;
    if (Object.keys(createdAt).length > 0) {
      conditions.push({ createdAt });
    }

    return { $and: conditions } as MongoFilter;
  }

  private toExitListItem(
    request: EmployeeRequestDocument,
    tracking?: ExitTrackingDocument,
  ) {
    const details = (request.details ?? {}) as Record<string, unknown>;
    const steps = [...(request.steps ?? [])].sort((a, b) => a.order - b.order);
    const approvedSteps = steps.filter(
      (step) => step.status === EmployeeRequestStepStatus.APPROVED,
    ).length;
    const activeIndex = this.findActiveStepIndex(steps);
    const activeStep = activeIndex === -1 ? null : steps[activeIndex];
    const isTerminal =
      request.status === EmployeeRequestStatus.APPROVED ||
      request.status === EmployeeRequestStatus.REJECTED ||
      request.status === EmployeeRequestStatus.CANCELLED;

    return {
      id: String(request._id),
      employee: this.toEmployeeView(request.employee, request.employeeId),
      exitType: this.resolveExitType(request, tracking),
      exitReason: this.resolveExitReason(request, tracking),
      lastWorkingDay:
        this.detailString(details, 'terminationDate') ??
        this.formatDate(request.effectiveDate),
      terminationType: this.detailString(details, 'terminationType'),
      exitInterviewDate: this.detailString(details, 'exitInterviewDate'),
      status: this.toExitStatus(request.status, tracking),
      requestStatus: request.status,
      workflow: {
        id: request.workflowId,
        name: request.workflowName,
      },
      currentStep:
        activeStep && !isTerminal
          ? {
              stepId: activeStep.stepId,
              responsibleParty: activeStep.responsibleParty ?? null,
              number: activeIndex + 1,
              order: activeStep.order,
              total: steps.length,
            }
          : null,
      progress:
        steps.length === 0
          ? 0
          : Math.round((approvedSteps / steps.length) * 100),
      checklistProgress: tracking
        ? this.progressPercent(tracking.exitChecklist)
        : null,
      complianceProgress: tracking
        ? this.progressPercent(tracking.complianceChecklist)
        : null,
      documentsProgress: tracking
        ? this.progressPercent(tracking.employerDocuments)
        : null,
      requestedAt: this.formatDateTime(request.createdAt),
      submittedAt: this.formatDateTime(request.submittedAt),
      completedAt: this.formatDateTime(tracking?.completedAt),
      updatedAt: this.formatDateTime(request.updatedAt),
    };
  }

  private toExitDetailView(
    request: Record<string, any>,
    tracking?: ExitTrackingDocument | Record<string, any>,
  ) {
    const details = (request.details ?? {}) as Record<string, unknown>;
    const exitType =
      tracking?.exitType ?? this.resolveExitTypeFromDetails(details);
    const exitReason =
      tracking?.exitReason ?? this.resolveExitReasonFromDetails(details);
    const exitChecklist = this.toChecklistProgress(
      tracking?.exitChecklist ?? [],
    );
    const complianceChecklist = this.toChecklistProgress(
      tracking?.complianceChecklist ?? [],
    );
    const employerDocuments = this.toDocumentProgress(
      tracking?.employerDocuments ?? [],
    );

    return {
      ...request,
      status: this.toExitStatus(request.status, tracking),
      requestStatus: request.status,
      requestCompletedAt: request.completedAt ?? null,
      exitType,
      exitReason,
      lastWorkingDay:
        this.detailString(details, 'terminationDate') ??
        request.effectiveDate ??
        null,
      terminationType: this.detailString(details, 'terminationType'),
      reasonForTermination:
        this.detailString(details, 'reasonForTermination') ??
        request.reason ??
        null,
      exitInterviewDate: this.detailString(details, 'exitInterviewDate'),
      exitChecklist,
      complianceChecklist,
      employerDocuments,
      checklistProgress: this.progressPercent(exitChecklist),
      complianceProgress: this.progressPercent(complianceChecklist),
      documentsProgress: this.progressPercent(employerDocuments),
      completedAt: this.formatDateTime(tracking?.completedAt),
      completedByUserId: tracking?.completedByUserId ?? null,
      completedByName: tracking?.completedByName ?? null,
      canComplete:
        request.status === EmployeeRequestStatus.APPROVED &&
        !tracking?.completedAt,
    };
  }

  private async buildDefaultTracking(
    organizationId: string,
    requestId: string,
    employeeId: string,
  ) {
    const [settings, documents] = await Promise.all([
      this.getOffboardingSettings(organizationId),
      this.getOffboardingDocumentsSettings(organizationId),
    ]);

    return this.buildTrackingSnapshot({
      organizationId,
      requestId,
      employeeId,
      settings,
      documents,
      exitType: null,
      exitReason: null,
    });
  }

  private buildTrackingSnapshot(input: {
    organizationId: string;
    requestId: string;
    employeeId: string;
    settings: OffboardingSettingsView;
    documents: OffboardingDocumentsSettingsView;
    exitType: OffboardingTypeView | null;
    exitReason: ExitReasonView | null;
    checklistItemIds?: string[];
    complianceChecklistItemIds?: string[];
  }): Record<string, any> {
    const exitChecklist = this.selectChecklistItems(
      input.settings.exitChecklist,
      input.checklistItemIds,
      'Exit checklist item',
    );
    const complianceChecklist = this.selectChecklistItems(
      input.documents.complianceChecklist,
      input.complianceChecklistItemIds,
      'Compliance checklist item',
    );

    return {
      organizationId: input.organizationId,
      requestId: input.requestId,
      employeeId: input.employeeId,
      exitType: input.exitType
        ? { id: input.exitType.id, label: input.exitType.label }
        : null,
      exitReason: input.exitReason
        ? { id: input.exitReason.id, label: input.exitReason.label }
        : null,
      exitChecklist: exitChecklist.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description ?? null,
        completed: false,
        completedAt: null,
        completedByUserId: null,
        completedByName: null,
      })),
      complianceChecklist: complianceChecklist.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description ?? null,
        completed: false,
        completedAt: null,
        completedByUserId: null,
        completedByName: null,
      })),
      employerDocuments: input.documents.employerExitDocuments.map(
        (document) => ({
          id: document.id,
          name: document.name,
          url: document.url ?? null,
          fileType: document.fileType ?? null,
          requiresSignature: document.requiresSignature ?? false,
          completed: false,
          attachmentUrl: null,
          signed: false,
          completedAt: null,
        }),
      ),
      completedAt: null,
      completedByUserId: null,
      completedByName: null,
    };
  }

  private async resolveTracking(
    organizationId: string,
    request: EmployeeRequestDocument,
  ) {
    return (
      (await this.exitTrackingRepository.findByRequestId(
        organizationId,
        String(request._id),
      )) ??
      (await this.buildDefaultTracking(
        organizationId,
        String(request._id),
        request.employeeId,
      ))
    );
  }

  private toTrackingUpdateData(tracking: Record<string, any>) {
    return {
      exitType: tracking.exitType ?? null,
      exitReason: tracking.exitReason ?? null,
      exitChecklist: this.toChecklistProgress(tracking.exitChecklist ?? []),
      complianceChecklist: this.toChecklistProgress(
        tracking.complianceChecklist ?? [],
      ),
      employerDocuments: this.toDocumentProgress(
        tracking.employerDocuments ?? [],
      ),
      completedAt: tracking.completedAt ?? null,
      completedByUserId: tracking.completedByUserId ?? null,
      completedByName: tracking.completedByName ?? null,
    };
  }

  private toChecklistProgress(items: any[]) {
    return (items ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description ?? null,
      completed: item.completed ?? false,
      completedAt: item.completedAt ?? null,
      completedByUserId: item.completedByUserId ?? null,
      completedByName: item.completedByName ?? null,
    }));
  }

  private toDocumentProgress(items: any[]) {
    return (items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      url: item.url ?? null,
      fileType: item.fileType ?? null,
      requiresSignature: item.requiresSignature ?? false,
      completed: item.completed ?? false,
      attachmentUrl: item.attachmentUrl ?? null,
      signed: item.signed ?? false,
      completedAt: item.completedAt ?? null,
    }));
  }

  private mergeChecklistSelection(
    items: ExitChecklistView[],
    ids: string[] | undefined,
    existing: any[],
    label: string,
  ) {
    const previous = new Map((existing ?? []).map((item) => [item.id, item]));
    return this.selectChecklistItems(items, ids, label).map((item) => {
      const previousItem = previous.get(item.id);
      return {
        id: item.id,
        label: item.label,
        description: item.description ?? null,
        completed: previousItem?.completed ?? false,
        completedAt: previousItem?.completedAt ?? null,
        completedByUserId: previousItem?.completedByUserId ?? null,
        completedByName: previousItem?.completedByName ?? null,
      };
    });
  }

  private selectChecklistItems(
    items: ExitChecklistView[],
    ids: string[] | undefined,
    label: string,
  ): ExitChecklistView[] {
    if (!ids || ids.length === 0) {
      return (items ?? []).filter((item) => item.selected !== false);
    }

    const itemMap = new Map((items ?? []).map((item) => [item.id, item]));
    return ids.map((id) => {
      const item = itemMap.get(id);
      if (!item) {
        AppResponse.error({
          message: `${label} not found`,
          status: HttpStatus.NOT_FOUND,
        });
      }
      return item!;
    });
  }

  private assertExitReadyToComplete(tracking: Record<string, any>) {
    const checklistItems = [
      ...(tracking.exitChecklist ?? []),
      ...(tracking.complianceChecklist ?? []),
    ];
    const incompleteChecklist = checklistItems.some(
      (item) => !item.completed,
    );
    const incompleteDocuments = (tracking.employerDocuments ?? []).some(
      (document: any) =>
        !document.completed ||
        (document.requiresSignature && !document.signed),
    );

    if (incompleteChecklist || incompleteDocuments) {
      AppResponse.error({
        message:
          'Complete all exit checklist items and required documents before completing this exit',
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  private async terminateEmployee(
    organizationId: string,
    employeeId: string,
  ) {
    const employee =
      (await this.employeeRepository.findById(employeeId)) ??
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

    await this.employeeRepository.updateById(employeeId, {
      status: EmployeeStatus.TERMINATED,
    });
  }

  private toExitStatus(
    requestStatus: EmployeeRequestStatus | string,
    tracking?: ExitTrackingDocument | Record<string, any> | null,
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
    tracking?: ExitTrackingDocument,
  ) {
    if (tracking?.exitType) {
      return {
        id: tracking.exitType.id ?? null,
        label: tracking.exitType.label,
      };
    }

    return this.resolveExitTypeFromDetails(
      (request.details ?? {}) as Record<string, unknown>,
    );
  }

  private resolveExitReason(
    request: EmployeeRequestDocument,
    tracking?: ExitTrackingDocument,
  ) {
    if (tracking?.exitReason) {
      return {
        id: tracking.exitReason.id ?? null,
        label: tracking.exitReason.label,
      };
    }

    return this.resolveExitReasonFromDetails(
      (request.details ?? {}) as Record<string, unknown>,
    );
  }

  private resolveExitTypeFromDetails(details: Record<string, unknown>) {
    const terminationType = this.detailString(details, 'terminationType');
    if (!terminationType) {
      return null;
    }

    return {
      id: terminationType,
      label: this.humanize(terminationType),
    };
  }

  private resolveExitReasonFromDetails(details: Record<string, unknown>) {
    const reason = this.detailString(details, 'reasonForTermination');
    if (!reason) {
      return null;
    }

    return { id: null, label: reason };
  }

  private getLastWorkingDay(request: EmployeeRequestDocument) {
    return (
      this.detailString(
        (request.details ?? {}) as Record<string, unknown>,
        'terminationDate',
      ) ?? this.formatDate(request.effectiveDate)
    );
  }

  private toEmployeeView(employee: any, employeeId: string) {
    return {
      employeeId: employee?.employeeId ?? employeeId,
      employeeUniqueId: employee?.employeeUniqueId ?? null,
      employeeName: employee?.employeeName ?? null,
      email: employee?.email ?? null,
      avatarUrl: employee?.avatarUrl ?? null,
      jobTitle: employee?.jobTitle ?? null,
      departmentCode: employee?.departmentCode ?? null,
      department: employee?.department ?? null,
      lineManagerId: employee?.lineManagerId ?? null,
      lineManager: employee?.lineManager ?? null,
      employmentDate: this.formatDate(employee?.employmentDate),
    };
  }

  private findActiveStepIndex(steps: any[]): number {
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

  private progressPercent(items: any[]): number {
    if (!items || items.length === 0) {
      return 0;
    }

    const completed = items.filter((item) => item.completed).length;
    return Math.round((completed / items.length) * 100);
  }

  private async findRequestOrFail(
    organizationId: string,
    requestId: string,
  ): Promise<EmployeeRequestDocument> {
    if (!Types.ObjectId.isValid(requestId)) {
      AppResponse.error({
        message: 'Exit request not found',
        status: HttpStatus.NOT_FOUND,
      });
    }

    const request =
      (await this.requestRepository.findById(requestId)) ??
      AppResponse.error({
        message: 'Exit request not found',
        status: HttpStatus.NOT_FOUND,
      });

    if (request!.organizationId !== organizationId) {
      AppResponse.error({
        message: 'Exit request does not belong to this organization',
        status: HttpStatus.FORBIDDEN,
      });
    }

    if (request!.requestType !== RequestType.EMPLOYEE_TERMINATION) {
      AppResponse.error({
        message: 'Request is not an exit request',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return request!;
  }

  private async getOffboardingSettings(
    organizationId: string,
  ): Promise<OffboardingSettingsView> {
    return (await this.settingsDomainOrganisationService.getOffboardingSettings(
      organizationId,
    )) as unknown as OffboardingSettingsView;
  }

  private async getOffboardingDocumentsSettings(
    organizationId: string,
  ): Promise<OffboardingDocumentsSettingsView> {
    return (await this.settingsDomainOrganisationService.getOffboardingDocumentsSettings(
      organizationId,
    )) as unknown as OffboardingDocumentsSettingsView;
  }

  private findOffboardingType(
    types: OffboardingTypeView[],
    id: string,
  ): OffboardingTypeView {
    const type = (types ?? []).find((item) => item.id === id);
    if (!type) {
      AppResponse.error({
        message: 'Off-boarding type not found',
        status: HttpStatus.NOT_FOUND,
      });
    }

    return type!;
  }

  private findExitReason(
    reasons: ExitReasonView[],
    id: string,
  ): ExitReasonView {
    const reason = (reasons ?? []).find((item) => item.id === id);
    if (!reason) {
      AppResponse.error({
        message: 'Exit reason not found',
        status: HttpStatus.NOT_FOUND,
      });
    }

    return reason!;
  }

  private deriveTerminationType(
    offboardingTypeLabel: string,
    provided?: TerminationType,
  ): TerminationType {
    if (provided) {
      return provided;
    }

    const normalized = this.normaliseKey(offboardingTypeLabel);
    const match = (Object.values(TerminationType) as TerminationType[]).find(
      (type) => this.normaliseKey(type) === normalized,
    );

    if (!match) {
      AppResponse.error({
        message:
          'Termination type is required for this off-boarding type',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return match!;
  }

  private normaliseKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private humanize(value: string): string {
    const text = value.replace(/_/g, ' ').trim();
    return text
      ? `${text.charAt(0).toUpperCase()}${text.slice(1)}`
      : 'Unspecified';
  }

  private toCountList(counts: Map<string, number>) {
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private addDays(value: Date, days: number): Date {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
  }

  private daysBetween(from: Date, to: Date): number {
    return Math.round(
      (this.startOfDay(to).getTime() - this.startOfDay(from).getTime()) /
        86400000,
    );
  }

  private detailString(
    details: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = details?.[key];
    return typeof value === 'string' && value.trim() ? value : null;
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

  private formatDate(value?: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
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

  private formatDateTime(value?: Date | string | null): string | null {
    return value ? new Date(value).toISOString() : null;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private handleError(error: unknown, method: string): never {
    const err = error as Error & { location?: string };
    err.location = `OffboardingService.${method}`;
    AppResponse.error(err);
    throw error;
  }
}
