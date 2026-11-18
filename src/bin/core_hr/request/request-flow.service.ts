import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { QueryFilter, Types } from 'mongoose';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { AppResponse } from '../../../common/response/app-response';
import {
  NotificationActionType,
  NotificationCategory,
  NotificationEntityType,
  NotificationResolution,
  NotificationType,
} from '../../generic/notification/enum/notification.enum';
import { NotificationService } from '../../generic/notification/notification.service';
import { SystemRole } from '../../generic/auth/enum/role.enum';
import {
  REQUEST_TYPE_LABELS,
  RequestType,
} from '../../generic/setting/request-management/enum/request-management.enum';
import { SettingsDomainOrganisationService } from '../../generic/setting/domain/settings.domain.organisation.service';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import {
  ApprovalChainPreviewDto,
  AddRequestDelegationDto,
  AddRequestDocumentDto,
  IssueRequestDocumentDto,
  RegisterRequestAttachmentDto,
  RequestActionDto,
  RequestAttachmentDto,
  RequestExportQueryDto,
  RequestLogQueryDto,
  RequestQueueQueryDto,
  RequestTemplateDto,
  RequestTypeConfigDto,
  RetrieveRequestDelegationDto,
  RetrieveRequestDocumentDto,
  RunReminderDto,
  SaveRequestDraftDto,
  SubmitRequestDto,
  ToggleRequestTypeDto,
  UpdateDelegationPolicyDto,
  UpdateReminderPolicyDto,
  UpdateRequestDelegationDto,
  UpdateRequestTypeDto,
  UpdateVisibilityPolicyDto,
} from './dto/request-flow.dto';
import {
  RequestPartySnapshot,
  RequestStepSnapshot,
  RequestWaitingOnSnapshot,
} from './entity/request.schema';
import {
  RequestActivity,
  RequestDelegationSettings,
  RequestDocumentDocument,
  RequestSettings,
} from './entity/request-flow.schema';
import {
  RequestActivityType,
  RequestDelegationStatus,
  RequestDirection,
  RequestDisplayState,
  RequestDocumentStatus,
  RequestStepActionKind,
} from './enum/request-flow.enum';
import {
  EmployeeRequestStatus,
  EmployeeRequestStepStatus,
} from './enum/request.enum';
import { getRequestFormDefinition } from './form/request-form.registry';
import { RequestFormValidatorService } from './form/request-form-validator.service';
import { EmployeeRequest, EmployeeRequestDocument } from './entity/request.schema';
import {
  RequestActivityRepository,
  RequestCounterRepository,
  RequestDelegationRepository,
  RequestDocumentRepository,
  RequestSettingsRepository,
  RequestTypeConfigRepository,
  RequestViewLogRepository,
} from './repository/request-flow.repository';
import { RequestRepository } from './repository/request.repository';

type FlowAction =
  | 'approve'
  | 'decline'
  | 'verify'
  | 'accept'
  | 'respond'
  | 'query'
  | 'resend'
  | 'withdraw'
  | 'nudge'
  | 'nudge-employee'
  | 'review-record'
  | 'close-plan'
  | 'delegate'
  | 'escalate';

type MongoFilter = QueryFilter<EmployeeRequestDocument>;

interface WorkflowStepView {
  id: string;
  order: number;
  responsibleParty: string | null;
  action?: RequestStepActionKind | string;
  assigneeUserId?: string | null;
  assigneeRole?: string | null;
  assigneeEmployeeId?: string | null;
  dueHours?: number | null;
  delegatable?: boolean;
  notifyRequester?: boolean;
  requiresDocument?: boolean;
}

interface WorkflowView {
  id: string;
  requestType: RequestType;
  name: string;
  isDefault: boolean;
  steps: WorkflowStepView[];
}

interface WorkflowGroupView {
  type: RequestType;
  label: string;
  workflows: WorkflowView[];
}

@Injectable()
export class RequestFlowService {
  private readonly logger = new Logger(RequestFlowService.name);

  constructor(
    @Inject(RequestRepository)
    private readonly requestRepository: RequestRepository,
    @Inject(RequestActivityRepository)
    private readonly activityRepository: RequestActivityRepository,
    @Inject(RequestDocumentRepository)
    private readonly documentRepository: RequestDocumentRepository,
    @Inject(RequestDelegationRepository)
    private readonly delegationRepository: RequestDelegationRepository,
    @Inject(RequestViewLogRepository)
    private readonly viewLogRepository: RequestViewLogRepository,
    @Inject(RequestTypeConfigRepository)
    private readonly typeConfigRepository: RequestTypeConfigRepository,
    @Inject(RequestSettingsRepository)
    private readonly settingsRepository: RequestSettingsRepository,
    @Inject(RequestCounterRepository)
    private readonly counterRepository: RequestCounterRepository,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(SettingsDomainOrganisationService)
    private readonly settingsDomain: SettingsDomainOrganisationService,
    @Inject(RequestFormValidatorService)
    private readonly requestFormValidator: RequestFormValidatorService,
    @Inject(NotificationService)
    private readonly notificationService: NotificationService,
  ) {}

  async saveDraft(
    organizationId: string,
    user: ICurrentUser,
    dto: SaveRequestDraftDto,
  ) {
    try {
      const employeeId = await this.resolveEmployeeId(
        organizationId,
        dto.employeeId ?? user.employeeId,
      );
      const employee = await this.getEmployeeSnapshot(employeeId);
      const now = new Date();
      const details = { ...dto.details };
      const attachments = this.buildAttachments(dto.attachments, user, now);
      const data: Record<string, unknown> = {
        organizationId,
        requestType: dto.requestType,
        direction: dto.direction,
        employeeId,
        employee,
        createdBy: this.toCreatorSnapshot(user),
        raisedBy: this.toPartySnapshot(user),
        details,
        attachments,
        attachmentUrls: attachments.map((attachment) => attachment.url),
        reason: this.normalise(dto.reason),
        effectiveDate: this.parseDate(dto.effectiveDate),
        endDate: this.parseDate(dto.endDate),
        status: EmployeeRequestStatus.DRAFT,
        isDraft: true,
        draftSavedAt: now,
        lastActivityAt: now,
        submittedAt: null,
        completedAt: null,
        closedAt: null,
        visibility: await this.buildVisibility(organizationId, dto.requestType),
      };

      let request: EmployeeRequestDocument;
      if (dto.draftId) {
        const existing = await this.getOwnDraftOrFail(
          organizationId,
          user,
          dto.draftId,
        );
        request = (await this.requestRepository.updateById(
          String(existing._id),
          data,
        ))!;
      } else {
        request = await this.requestRepository.create(
          data as Partial<EmployeeRequest>,
        );
      }

      await this.recordActivity(
        organizationId,
        String(request._id),
        RequestActivityType.DRAFT_SAVED,
        user,
        `${REQUEST_TYPE_LABELS[dto.requestType]} request draft saved`,
      );

      return await this.toFlowView(request);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.saveDraft.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async submitRequest(
    organizationId: string,
    user: ICurrentUser,
    dto: SubmitRequestDto,
  ) {
    try {
      const details = this.requestFormValidator.validate(
        dto.requestType,
        dto.details,
      );
      const employeeId = await this.resolveEmployeeId(
        organizationId,
        dto.employeeId ?? user.employeeId,
      );
      const employee = await this.getEmployeeSnapshot(employeeId);
      const settings = await this.settingsRepository.ensure(organizationId);
      const workflow = await this.selectWorkflow(
        organizationId,
        dto.requestType,
        dto.workflowId,
      );
      const now = new Date();
      const dueAt = this.addDays(now, settings.reminder?.slaWorkingDays ?? 3);
      const steps = this.buildSteps(workflow, employee, dto.direction, settings, now);
      const attachments = this.buildAttachments(dto.attachments, user, now);
      const requestNumber = await this.counterRepository.next(organizationId);
      const raisedBy = this.toPartySnapshot(user);
      const sentTo = this.buildSentTo(dto.direction, employee, raisedBy);
      const data: Record<string, unknown> = {
        organizationId,
        requestType: dto.requestType,
        requestNumber,
        direction: dto.direction,
        workflowId: workflow.id,
        workflowName: workflow.name,
        employeeId,
        employee,
        createdBy: raisedBy,
        raisedBy,
        sentTo,
        details,
        reason: this.normalise(dto.note),
        effectiveDate: this.parseDate(dto.effectiveDate),
        endDate: this.parseDate(dto.endDate),
        attachments,
        attachmentUrls: attachments.map((attachment) => attachment.url),
        status: EmployeeRequestStatus.PENDING,
        isDraft: false,
        draftSavedAt: null,
        submittedAt: now,
        sentAt: now,
        raisedAt: now,
        dueAt,
        lastActivityAt: now,
        currentStepOrder: steps[0]?.order ?? 1,
        steps,
        completedAt: null,
        closedAt: null,
        visibility: await this.buildVisibility(organizationId, dto.requestType),
        pipPlan:
          dto.requestType === RequestType.PERFORMANCE_IMPROVEMENT_PLAN
            ? {
                status: 'active',
                outcome: null,
                reviewDate: this.toDate(details.reviewDate),
                closedAt: null,
                objectives: details,
              }
            : null,
      };

      let request: EmployeeRequestDocument;
      if (dto.draftId) {
        const draft = await this.getOwnDraftOrFail(
          organizationId,
          user,
          dto.draftId,
        );
        request = (await this.requestRepository.updateById(
          String(draft._id),
          data,
        ))!;
      } else {
        request = await this.requestRepository.create(
          data as Partial<EmployeeRequest>,
        );
      }

      if (dto.templateId) {
        await this.createRequestDocument(
          organizationId,
          String(request._id),
          {
            requestId: String(request._id),
            templateId: dto.templateId,
            name: REQUEST_TYPE_LABELS[dto.requestType],
            url: dto.templateId,
          },
          user,
        );
      }

      await this.syncWaitingOn(request);
      await this.recordActivity(
        organizationId,
        String(request._id),
        RequestActivityType.SUBMITTED,
        user,
        `${REQUEST_TYPE_LABELS[dto.requestType]} request submitted`,
        { requestNumber },
      );
      await this.notify(
        request,
        NotificationType.REQUEST_SUBMITTED,
        NotificationActionType.APPROVE,
        NotificationResolution.PENDING,
        user,
        `${employee.employeeName ?? employeeId}'s ${REQUEST_TYPE_LABELS[dto.requestType]} request was submitted`,
      );

      return await this.toFlowView(request);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.submitRequest.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async previewApprovalChain(
    organizationId: string,
    dto: ApprovalChainPreviewDto,
  ) {
    try {
      const definition = getRequestFormDefinition(dto.requestType);
      const workflow = await this.selectWorkflow(
        organizationId,
        dto.requestType,
        dto.workflowId,
      );
      const employee = dto.employeeId
        ? await this.getEmployeeSnapshot(dto.employeeId)
        : null;
      const settings = await this.settingsRepository.ensure(organizationId);
      const steps = this.buildSteps(
        workflow,
        employee,
        dto.direction,
        settings,
        new Date(),
      );

      return {
        requestType: dto.requestType,
        label: REQUEST_TYPE_LABELS[dto.requestType],
        direction: dto.direction,
        workflow: {
          id: workflow.id,
          name: workflow.name,
        },
        steps: steps.map((step) => ({
          order: step.order,
          responsibleParty: step.responsibleParty,
          action: step.action,
          assigneeUserId: step.assigneeUserId,
          assigneeRole: step.assigneeRole,
          dueAt: this.formatDateTime(step.dueAt),
        })),
        preview:
          definition.approvalChainPreview ??
          steps.map((step) => step.responsibleParty ?? 'Approver'),
        attachments: definition.attachments ?? [],
        primaryActionLabel:
          definition.primaryActionLabel ??
          (dto.direction === RequestDirection.OUTGOING
            ? 'Send to employee'
            : 'Record request'),
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.previewApprovalChain.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async getFormAutofill(
    organizationId: string,
    user: ICurrentUser,
    requestType: RequestType,
    employeeId?: string,
  ) {
    try {
      const definition = getRequestFormDefinition(requestType);
      const resolvedEmployeeId = employeeId ?? user.employeeId;
      if (!resolvedEmployeeId) {
        return { fields: {}, employeeContext: definition.employeeContext };
      }
      const employee = await this.getEmployeeSnapshot(resolvedEmployeeId);
      const values: Record<string, unknown> = {};
      for (const key of definition.employeeContext) {
        if (employee[key as keyof typeof employee] !== undefined) {
          values[key] = employee[key as keyof typeof employee];
        }
      }
      return {
        fields: values,
        employeeContext: definition.employeeContext,
        employee,
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.getFormAutofill.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async listDrafts(
    organizationId: string,
    user: ICurrentUser,
    query: RequestQueueQueryDto,
  ) {
    try {
      const where: MongoFilter = {
        organizationId,
        isDraft: true,
        'createdBy.userId': user.userId,
        ...(query.requestType ? { requestType: query.requestType } : {}),
      } as MongoFilter;
      const { items, total } = await this.requestRepository.paginatedQuery(
        where,
        { draftSavedAt: -1, updatedAt: -1 },
        query.batch ?? 1,
        query.limit ?? 10,
      );

      return {
        data: await Promise.all(items.map((item) => this.toFlowView(item))),
        count: total,
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.listDrafts.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async getDraft(
    organizationId: string,
    user: ICurrentUser,
    draftId: string,
  ) {
    try {
      const draft = await this.getOwnDraftOrFail(
        organizationId,
        user,
        draftId,
      );
      return await this.toFlowView(draft);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.getDraft.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async deleteDraft(
    organizationId: string,
    user: ICurrentUser,
    draftId: string,
  ) {
    try {
      const draft = await this.getOwnDraftOrFail(
        organizationId,
        user,
        draftId,
      );
      await this.requestRepository.deleteById(String(draft._id));
      return 'Draft deleted';
    } catch (error: any) {
      error.location = `RequestFlowService.${this.deleteDraft.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async listQueue(
    organizationId: string,
    user: ICurrentUser,
    query: RequestQueueQueryDto,
  ) {
    try {
      const where = this.buildQueueFilter(organizationId, user, query);
      const { items, total } = await this.requestRepository.paginatedQuery(
        where,
        { createdAt: -1 },
        query.batch ?? 1,
        query.limit ?? 10,
      );

      return {
        data: await Promise.all(items.map((item) => this.toFlowView(item))),
        count: total,
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.listQueue.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async getRequestFlow(
    organizationId: string,
    user: ICurrentUser,
    requestId: string,
  ) {
    try {
      const request = await this.getRequestOrFail(organizationId, requestId);
      this.assertCanAccessRequest(request, user);
      const settings = await this.settingsRepository.ensure(organizationId);
      if (settings.visibility?.logEveryView !== false) {
        await this.viewLogRepository.create({
          organizationId,
          requestId: String(request._id),
          viewerUserId: user.userId,
          viewerEmail: user.email,
          reason: 'request_detail_view',
        });
        await this.recordActivity(
          organizationId,
          String(request._id),
          RequestActivityType.VIEWED,
          user,
          'Request viewed',
        );
      }

      return await this.toFlowView(request);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.getRequestFlow.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async listActivity(
    organizationId: string,
    user: ICurrentUser,
    requestId: string,
    query: RequestLogQueryDto,
  ) {
    try {
      const request = await this.getRequestOrFail(organizationId, requestId);
      this.assertCanAccessRequest(request, user);
      const activities = await this.activityRepository.findByRequest(
        String(request._id),
      );
      const page = query.batch ?? 1;
      const limit = query.limit ?? 20;
      const start = (page - 1) * limit;

      return {
        data: activities.slice(start, start + limit).map((activity) => ({
          id: String(activity._id),
          type: activity.type,
          message: activity.message,
          actorUserId: activity.actorUserId,
          actorName: activity.actorName,
          metadata: activity.metadata,
          createdAt: this.formatDateTime(activity.createdAt),
        })),
        count: activities.length,
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.listActivity.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async listAvailableActions(
    organizationId: string,
    user: ICurrentUser,
    requestId: string,
  ) {
    try {
      const request = await this.getRequestOrFail(organizationId, requestId);
      this.assertCanAccessRequest(request, user);
      return await this.toFlowView(request);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.listAvailableActions.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async logView(
    organizationId: string,
    user: ICurrentUser,
    requestId: string,
    reason?: string,
  ) {
    try {
      const request = await this.getRequestOrFail(organizationId, requestId);
      this.assertCanAccessRequest(request, user);
      const log = await this.viewLogRepository.create({
        organizationId,
        requestId: String(request._id),
        viewerUserId: user.userId,
        viewerEmail: user.email,
        reason: this.normalise(reason) ?? 'request_view',
      });
      await this.recordActivity(
        organizationId,
        String(request._id),
        RequestActivityType.VIEWED,
        user,
        reason ?? 'Request viewed',
      );
      return this.toViewLogView(log);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.logView.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async performAction(
    organizationId: string,
    user: ICurrentUser,
    action: FlowAction,
    dto: RequestActionDto,
  ) {
    try {
      const request = await this.getRequestOrFail(
        organizationId,
        dto.requestId,
      );
      this.assertCanAccessRequest(request, user);
      const handler = this.actionHandlers[action];
      if (!handler) {
        AppResponse.error({
          message: 'Request action is not supported',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const updated = await handler.call(this, organizationId, user, request, dto);
      return await this.toFlowView(updated);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.performAction.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async registerAttachment(
    organizationId: string,
    user: ICurrentUser,
    dto: RegisterRequestAttachmentDto,
  ) {
    try {
      const request = await this.getRequestOrFail(
        organizationId,
        dto.requestId ?? (dto.draftId as string),
      );
      const attachments = [
        ...(request.attachments ?? []),
        ...this.buildAttachments([dto as RequestAttachmentDto], user, new Date()),
      ];
      const updated = (await this.requestRepository.updateById(
        String(request._id),
        {
          attachments,
          attachmentUrls: attachments.map((attachment) => attachment.url),
          lastActivityAt: new Date(),
        },
      ))!;

      await this.recordActivity(
        organizationId,
        String(request._id),
        RequestActivityType.DOCUMENT_ADDED,
        user,
        dto.name ? `${dto.name} uploaded` : 'Attachment uploaded',
      );
      return await this.toFlowView(updated);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.registerAttachment.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async listDocuments(organizationId: string, requestId: string) {
    try {
      const request = await this.getRequestOrFail(organizationId, requestId);
      const documents = await this.documentRepository.findByRequest(
        String(request._id),
      );
      return {
        data: documents.map((document) => this.toDocumentView(document)),
        count: documents.length,
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.listDocuments.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async addDocument(
    organizationId: string,
    user: ICurrentUser,
    dto: AddRequestDocumentDto,
  ) {
    try {
      const document = await this.createRequestDocument(
        organizationId,
        dto.requestId,
        dto,
        user,
      );
      return this.toDocumentView(document);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.addDocument.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async issueDocument(
    organizationId: string,
    user: ICurrentUser,
    dto: IssueRequestDocumentDto,
  ) {
    try {
      const request = await this.getRequestOrFail(
        organizationId,
        dto.requestId,
      );
      const document = await this.documentRepository.findById(dto.documentId);
      if (
        !document ||
        document.organizationId !== organizationId ||
        document.requestId !== String(request._id)
      ) {
        AppResponse.error({
          message: 'Request document not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const issued = (await this.documentRepository.updateById(
        dto.documentId,
        {
          status: RequestDocumentStatus.ISSUED,
          isIssued: true,
          isSigned: true,
          signedAt: new Date(),
          issuedAt: new Date(),
          signature: dto.signature,
        },
      ))!;
      await this.recordActivity(
        organizationId,
        String(request._id),
        RequestActivityType.DOCUMENT_ISSUED,
        user,
        `${document!.name} issued`,
      );
      return this.toDocumentView(issued);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.issueDocument.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async getDocument(organizationId: string, dto: RetrieveRequestDocumentDto) {
    try {
      const document = await this.documentRepository.findById(dto.documentId);
      if (!document || document.organizationId !== organizationId) {
        AppResponse.error({
          message: 'Request document not found',
          status: HttpStatus.NOT_FOUND,
        });
      }
      if (dto.requestId) {
        const request = await this.getRequestOrFail(
          organizationId,
          dto.requestId,
        );
        if (document!.requestId !== String(request._id)) {
          AppResponse.error({
            message: 'Request document not found',
            status: HttpStatus.NOT_FOUND,
          });
        }
      }
      return this.toDocumentView(document!);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.getDocument.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async getTypeCatalog(organizationId: string) {
    try {
      const configs = await this.typeConfigRepository.findByOrganization(
        organizationId,
      );
      const configMap = new Map(configs.map((config) => [config.type, config]));

      return {
        requestTypes: Object.values(RequestType).map((type) => {
          const definition = getRequestFormDefinition(type);
          const config = configMap.get(type);
          return {
            type,
            label: REQUEST_TYPE_LABELS[type],
            category: definition.category ?? config?.category ?? 'general',
            direction: definition.direction ?? RequestDirection.OUTGOING,
            restricted: config?.restricted ?? definition.restricted ?? false,
            enabled: config?.enabled ?? true,
            whoMayRaise: config?.whoMayRaise ?? [],
            formKey: config?.formKey ?? type,
            description: config?.description ?? null,
            attachmentsRequired:
              config?.attachmentsRequired ??
              Boolean(definition.attachments?.some((item) => item.required)),
            primaryActionLabel: definition.primaryActionLabel ?? null,
            fields: definition.fields,
          };
        }),
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.getTypeCatalog.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async upsertTypeConfig(
    organizationId: string,
    dto: RequestTypeConfigDto,
  ) {
    try {
      const config = await this.typeConfigRepository.upsert(
        organizationId,
        dto.type,
        {
          label: dto.label ?? REQUEST_TYPE_LABELS[dto.type as RequestType] ?? dto.type,
          category: dto.category,
          enabled: dto.enabled,
          restricted: dto.restricted,
          whoMayRaise: dto.whoMayRaise,
          formKey: dto.formKey,
          description: dto.description,
          attachmentsRequired: dto.attachmentsRequired,
          defaultWorkflowId: dto.defaultWorkflowId,
          documentTemplateId: dto.documentTemplateId,
        },
      );
      return this.toTypeConfigView(config);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.upsertTypeConfig.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async updateType(organizationId: string, dto: UpdateRequestTypeDto) {
    try {
      const config = await this.typeConfigRepository.upsert(
        organizationId,
        dto.requestType,
        {
          label: REQUEST_TYPE_LABELS[dto.requestType],
          enabled: dto.enabled,
          restricted: dto.restricted,
          whoMayRaise: dto.whoMayRaise,
          formKey: dto.formKey,
          description: dto.description,
          attachmentsRequired: dto.attachmentsRequired,
        },
      );
      return this.toTypeConfigView(config);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.updateType.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async toggleType(organizationId: string, dto: ToggleRequestTypeDto) {
    try {
      const config = await this.typeConfigRepository.upsert(
        organizationId,
        dto.requestType,
        {
          label: REQUEST_TYPE_LABELS[dto.requestType],
          enabled: dto.enabled,
        },
      );
      return this.toTypeConfigView(config);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.toggleType.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async deleteTypeConfig(organizationId: string, requestType: RequestType) {
    try {
      await this.typeConfigRepository.deleteByType(organizationId, requestType);
      return 'Request type configuration deleted';
    } catch (error: any) {
      error.location = `RequestFlowService.${this.deleteTypeConfig.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async getSettings(organizationId: string) {
    try {
      const [settings, types] = await Promise.all([
        this.settingsRepository.ensure(organizationId),
        this.typeConfigRepository.findByOrganization(organizationId),
      ]);
      return {
        ...this.toSettingsView(settings),
        requestTypes: types.map((type) => this.toTypeConfigView(type)),
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.getSettings.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async updateReminderPolicy(
    organizationId: string,
    dto: UpdateReminderPolicyDto,
  ) {
    try {
      const current = this.toSettingsView(
        await this.settingsRepository.ensure(organizationId),
      );
      const settings = await this.settingsRepository.update(organizationId, {
        reminder: {
          ...current.reminder,
          ...Object.fromEntries(
            Object.entries(dto).filter(([, value]) => value !== undefined),
          ),
        },
      });
      return this.toSettingsView(settings).reminder;
    } catch (error: any) {
      error.location = `RequestFlowService.${this.updateReminderPolicy.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async updateDelegationPolicy(
    organizationId: string,
    dto: UpdateDelegationPolicyDto,
  ) {
    try {
      const current = this.toSettingsView(
        await this.settingsRepository.ensure(organizationId),
      );
      const settings = await this.settingsRepository.update(organizationId, {
        delegation: {
          ...current.delegation,
          ...Object.fromEntries(
            Object.entries(dto).filter(([, value]) => value !== undefined),
          ),
        },
      });
      return this.toSettingsView(settings).delegation;
    } catch (error: any) {
      error.location = `RequestFlowService.${this.updateDelegationPolicy.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async updateVisibilityPolicy(
    organizationId: string,
    dto: UpdateVisibilityPolicyDto,
  ) {
    try {
      const current = this.toSettingsView(
        await this.settingsRepository.ensure(organizationId),
      );
      const settings = await this.settingsRepository.update(organizationId, {
        visibility: {
          ...current.visibility,
          ...Object.fromEntries(
            Object.entries(dto).filter(([, value]) => value !== undefined),
          ),
        },
      });
      await Promise.all(
        (await this.requestRepository.findAll({ organizationId } as MongoFilter, {})).map(
          (request) =>
            this.requestRepository.updateById(String(request._id), {
              visibility: {
                restricted: settings.visibility.restrictedVisibility !== 'all',
                hiddenFromDirectory: settings.visibility.hideFromDirectory,
                logViews: settings.visibility.logEveryView,
                retentionUntil: null,
              },
            }),
        ),
      );
      return this.toSettingsView(settings).visibility;
    } catch (error: any) {
      error.location = `RequestFlowService.${this.updateVisibilityPolicy.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async runReminders(organizationId: string, dto: RunReminderDto) {
    try {
      const settings = await this.settingsRepository.ensure(organizationId);
      const now = new Date();
      const overdue = await this.requestRepository.findAll(
        {
          organizationId,
          isDraft: false,
          dueAt: { $lte: now },
          status: {
            $in: [
              EmployeeRequestStatus.PENDING,
              EmployeeRequestStatus.IN_PROGRESS,
              EmployeeRequestStatus.AWAITING_EMPLOYEE,
              EmployeeRequestStatus.AWAITING_RESPONSE,
              EmployeeRequestStatus.QUERIED,
            ],
          },
        } as MongoFilter,
        { dueAt: 1 },
      );

      for (const request of overdue) {
        if (!dto.dryRun) {
          await this.requestRepository.updateById(String(request._id), {
            lastReminderAt: now,
            $inc: { reminderCount: 1 },
          });
          await this.recordActivity(
            organizationId,
            String(request._id),
            RequestActivityType.REMINDED,
            null,
            `${REQUEST_TYPE_LABELS[request.requestType]} request reminder sent`,
          );
          if (settings.reminder?.notifyRequester !== false) {
            await this.notify(
              request,
              NotificationType.REQUEST_STEP_UPDATED,
              NotificationActionType.VIEW,
              NotificationResolution.PENDING,
              null,
              `${REQUEST_TYPE_LABELS[request.requestType]} request is due for review`,
              request.createdBy?.userId,
            );
          }
          if (settings.reminder?.escalateToNextApprover) {
            await this.escalateInternal(organizationId, request, null);
          }
        }
      }

      return { processed: overdue.length, dryRun: dto.dryRun === true };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.runReminders.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async addDelegation(
    organizationId: string,
    user: ICurrentUser,
    dto: AddRequestDelegationDto,
  ) {
    try {
      const settings = await this.settingsRepository.ensure(organizationId);
      if (settings.delegation?.allowDelegation === false) {
        AppResponse.error({
          message: 'Delegation is disabled for this organization',
          status: HttpStatus.BAD_REQUEST,
        });
      }
      const startsAt = new Date(dto.startsAt);
      const endsAt = new Date(dto.endsAt);
      if (endsAt <= startsAt) {
        AppResponse.error({
          message: 'Delegation end date must be after its start date',
          status: HttpStatus.BAD_REQUEST,
        });
      }
      const maxDays = settings.delegation?.maxDays ?? 30;
      const days = (endsAt.getTime() - startsAt.getTime()) / 86_400_000;
      if (days > maxDays) {
        AppResponse.error({
          message: `Delegation cannot exceed ${maxDays} days`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const delegation = await this.delegationRepository.create({
        organizationId,
        fromUserId: dto.fromUserId,
        toUserId: dto.toUserId,
        startsAt,
        endsAt,
        reason: this.normalise(dto.reason),
        status: RequestDelegationStatus.ACTIVE,
        autoOnLeave: dto.autoOnLeave ?? false,
        createdByUserId: user.userId,
      });
      return this.toDelegationView(delegation);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.addDelegation.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async listDelegations(organizationId: string) {
    try {
      const delegations =
        await this.delegationRepository.findByOrganization(organizationId);
      return {
        data: delegations.map((delegation) =>
          this.toDelegationView(delegation),
        ),
        count: delegations.length,
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.listDelegations.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async updateDelegation(
    organizationId: string,
    dto: UpdateRequestDelegationDto & RetrieveRequestDelegationDto,
  ) {
    try {
      const delegation = await this.getDelegationOrFail(
        organizationId,
        dto.delegationId,
      );
      const updated = await this.delegationRepository.updateById(
        dto.delegationId,
        {
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
          reason: dto.reason,
          status: dto.status as RequestDelegationStatus | undefined,
        },
      );
      return this.toDelegationView(updated ?? delegation);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.updateDelegation.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async deleteDelegation(organizationId: string, delegationId: string) {
    try {
      await this.getDelegationOrFail(organizationId, delegationId);
      await this.delegationRepository.deleteById(delegationId);
      return 'Delegation deleted';
    } catch (error: any) {
      error.location = `RequestFlowService.${this.deleteDelegation.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async upsertTemplate(
    organizationId: string,
    user: ICurrentUser,
    dto: RequestTemplateDto,
  ) {
    try {
      const settings = await this.settingsRepository.ensure(organizationId);
      const templates = [
        ...settings.templates.filter((template) => template.id !== dto.id),
        {
          id: dto.id,
          requestType: dto.requestType,
          name: dto.name,
          url: dto.url ?? null,
          signatureRequired: dto.signatureRequired ?? false,
          storeIssuedDocs: dto.storeIssuedDocs ?? true,
        },
      ];
      const updated = await this.settingsRepository.update(organizationId, {
        templates,
      });
      return updated.templates.find((template) => template.id === dto.id);
    } catch (error: any) {
      error.location = `RequestFlowService.${this.upsertTemplate.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async deleteTemplate(organizationId: string, templateId: string) {
    try {
      const settings = await this.settingsRepository.ensure(organizationId);
      await this.settingsRepository.update(organizationId, {
        templates: settings.templates.filter(
          (template) => template.id !== templateId,
        ),
      });
      return 'Template deleted';
    } catch (error: any) {
      error.location = `RequestFlowService.${this.deleteTemplate.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async listViewLogs(organizationId: string, query: RequestLogQueryDto) {
    try {
      const request = query.requestId
        ? await this.getRequestOrFail(organizationId, query.requestId)
        : null;
      const logs = await this.viewLogRepository.findByRequest(
        request ? String(request._id) : '',
      );
      const page = query.batch ?? 1;
      const limit = query.limit ?? 20;
      const start = (page - 1) * limit;
      return {
        data: logs.slice(start, start + limit).map((log) =>
          this.toViewLogView(log),
        ),
        count: logs.length,
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.listViewLogs.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  async exportRequests(organizationId: string, query: RequestExportQueryDto) {
    try {
      const where: MongoFilter = { organizationId, isDraft: false } as MongoFilter;
      if (query.requestType) where.requestType = query.requestType;
      const dateRange: Record<string, Date> = {};
      if (query.dateFrom) dateRange.$gte = new Date(query.dateFrom);
      if (query.dateTo) dateRange.$lte = new Date(query.dateTo);
      if (Object.keys(dateRange).length > 0) {
        (where as Record<string, unknown>).createdAt = dateRange;
      }

      const requests = await this.requestRepository.findAll(where, {
        createdAt: -1,
      });
      return {
        format: query.format ?? 'json',
        data: requests.map((request) => ({
          requestNumber: request.requestNumber,
          requestType: request.requestType,
          requestTypeLabel: REQUEST_TYPE_LABELS[request.requestType],
          employeeId: request.employeeId,
          employeeName: request.employee?.employeeName ?? null,
          status: request.status,
          direction: request.direction,
          submittedAt: this.formatDateTime(request.submittedAt),
          dueAt: this.formatDateTime(request.dueAt),
          completedAt: this.formatDateTime(request.completedAt),
        })),
        count: requests.length,
      };
    } catch (error: any) {
      error.location = `RequestFlowService.${this.exportRequests.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  private readonly actionHandlers: Record<
    FlowAction,
    (
      organizationId: string,
      user: ICurrentUser,
      request: EmployeeRequestDocument,
      dto: RequestActionDto,
    ) => Promise<EmployeeRequestDocument>
  > = {
    approve: this.approveRequest,
    decline: this.declineRequest,
    verify: this.verifyRequest,
    accept: this.acceptRequest,
    respond: this.respondRequest,
    query: this.queryRequest,
    resend: this.resendRequest,
    withdraw: this.withdrawRequest,
    nudge: this.nudgeRequest,
    'nudge-employee': this.nudgeEmployee,
    'review-record': this.recordReview,
    'close-plan': this.closePlan,
    delegate: this.delegateRequest,
    escalate: this.escalateRequest,
  };

  private async approveRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    return this.applyDecision(
      organizationId,
      user,
      request,
      dto,
      EmployeeRequestStepStatus.APPROVED,
      EmployeeRequestStatus.APPROVED,
      RequestActivityType.APPROVED,
      NotificationType.REQUEST_APPROVED,
      'approved',
    );
  }

  private async declineRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    return this.applyDecision(
      organizationId,
      user,
      request,
      dto,
      EmployeeRequestStepStatus.REJECTED,
      EmployeeRequestStatus.REJECTED,
      RequestActivityType.DECLINED,
      NotificationType.REQUEST_REJECTED,
      'declined',
      true,
    );
  }

  private async verifyRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    return this.applyDecision(
      organizationId,
      user,
      request,
      dto,
      EmployeeRequestStepStatus.VERIFIED,
      EmployeeRequestStatus.APPROVED,
      RequestActivityType.VERIFIED,
      NotificationType.REQUEST_APPROVED,
      'verified',
    );
  }

  private async acceptRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    return this.applyDecision(
      organizationId,
      user,
      request,
      dto,
      EmployeeRequestStepStatus.ACCEPTED,
      EmployeeRequestStatus.ACTIVE,
      RequestActivityType.ACCEPTED,
      NotificationType.REQUEST_STEP_UPDATED,
      'accepted',
    );
  }

  private async respondRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    const updated = await this.applyDecision(
      organizationId,
      user,
      request,
      dto,
      EmployeeRequestStepStatus.APPROVED,
      EmployeeRequestStatus.APPROVED,
      RequestActivityType.RESPONDED,
      NotificationType.REQUEST_APPROVED,
      'responded',
    );
    if (dto.details) {
      await this.requestRepository.updateById(String(updated._id), {
        details: { ...updated.details, ...dto.details },
      });
    }
    return updated;
  }

  private async queryRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    const steps = this.sortedSteps(request);
    const index = this.activeStepIndex(steps);
    const now = new Date();
    if (index === -1) {
      AppResponse.error({
        message: 'Request has no active step',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    steps[index] = {
      ...steps[index],
      status: EmployeeRequestStepStatus.QUERIED,
      actedByUserId: user.userId,
      actedByName: user.email,
      comment: this.normalise(dto.question ?? dto.note ?? dto.message),
      decisionMessage: this.normalise(dto.message),
      queriedAt: now,
    };
    const updated = (await this.requestRepository.updateById(
      String(request._id),
      {
        steps,
        status: EmployeeRequestStatus.QUERIED,
        lastActivityAt: now,
        waitingOn: this.toWaitingOnSnapshot(
          dto.queryTarget === 'employee'
            ? { name: request.employee?.employeeName ?? null }
            : request.createdBy,
          steps[index],
        ),
      },
    ))!;
    await this.recordActivity(
      organizationId,
      String(request._id),
      RequestActivityType.QUERIED,
      user,
      dto.question ?? 'Request queried',
      { queryTarget: dto.queryTarget ?? 'requester' },
    );
    await this.notify(
      updated,
      NotificationType.REQUEST_STEP_UPDATED,
      NotificationActionType.REVIEW,
      NotificationResolution.PENDING,
      user,
      dto.question ?? 'A question was raised on your request',
      request.createdBy?.userId,
    );
    return updated;
  }

  private async resendRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    if (
      request.status !== EmployeeRequestStatus.REJECTED &&
      request.status !== EmployeeRequestStatus.QUERIED
    ) {
      AppResponse.error({
        message: 'Only rejected or queried requests can be resent',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    const now = new Date();
    const steps = this.sortedSteps(request).map((step, index) => {
      if (step.status === EmployeeRequestStepStatus.APPROVED) return step;
      return {
        ...step,
        status:
          index === 0 || this.activeStepIndex(this.sortedSteps(request)) === index
            ? EmployeeRequestStepStatus.IN_PROGRESS
            : EmployeeRequestStepStatus.PENDING,
        actedByUserId: null,
        actedByName: null,
        comment: null,
        decisionReasonCode: null,
        decisionMessage: null,
        queriedAt: null,
        completedAt: null,
      };
    });
    const firstActive = steps.find(
      (step) => step.status === EmployeeRequestStepStatus.IN_PROGRESS,
    );
    const updated = (await this.requestRepository.updateById(
      String(request._id),
      {
        steps,
        status: EmployeeRequestStatus.PENDING,
        currentStepOrder: firstActive?.order ?? 1,
        resendCount: (request.resendCount ?? 0) + 1,
        lastActivityAt: now,
        closedAt: null,
        completedAt: null,
        details: dto.details
          ? { ...request.details, ...dto.details }
          : request.details,
      },
    ))!;
    await this.recordActivity(
      organizationId,
      String(request._id),
      RequestActivityType.RESENT,
      user,
      dto.note ?? 'Request edited and resent',
    );
    await this.notify(
      updated,
      NotificationType.REQUEST_STEP_UPDATED,
      NotificationActionType.APPROVE,
      NotificationResolution.PENDING,
      user,
      `${REQUEST_TYPE_LABELS[request.requestType]} request was resent`,
    );
    return updated;
  }

  private async withdrawRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    const now = new Date();
    const updated = (await this.requestRepository.updateById(
      String(request._id),
      {
        status: EmployeeRequestStatus.WITHDRAWN,
        closedAt: now,
        lastActivityAt: now,
        cancellationReason: this.normalise(dto.reason ?? dto.note),
        waitingOn: null,
      },
    ))!;
    await this.recordActivity(
      organizationId,
      String(request._id),
      RequestActivityType.WITHDRAWN,
      user,
      dto.reason ?? 'Request withdrawn',
    );
    await this.notify(
      updated,
      NotificationType.REQUEST_CANCELLED,
      NotificationActionType.VIEW,
      NotificationResolution.RESOLVED,
      user,
      `${REQUEST_TYPE_LABELS[request.requestType]} request was withdrawn`,
    );
    return updated;
  }

  private async nudgeRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    const now = new Date();
    const updated = (await this.requestRepository.updateById(
      String(request._id),
      { lastNudgedAt: now, lastActivityAt: now },
    ))!;
    await this.recordActivity(
      organizationId,
      String(request._id),
      RequestActivityType.NUDGED,
      user,
      dto.note ?? 'Approver nudged',
    );
    await this.notify(
      updated,
      NotificationType.REQUEST_STEP_UPDATED,
      NotificationActionType.APPROVE,
      NotificationResolution.PENDING,
      user,
      dto.note ?? `${REQUEST_TYPE_LABELS[request.requestType]} request needs attention`,
      request.waitingOn?.userId ?? undefined,
    );
    return updated;
  }

  private async nudgeEmployee(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    const now = new Date();
    const updated = (await this.requestRepository.updateById(
      String(request._id),
      { lastNudgedAt: now, lastActivityAt: now },
    ))!;
    await this.recordActivity(
      organizationId,
      String(request._id),
      RequestActivityType.NUDGED,
      user,
      dto.note ?? 'Employee nudged',
    );
    await this.notify(
      updated,
      NotificationType.REQUEST_STEP_UPDATED,
      NotificationActionType.REVIEW,
      NotificationResolution.PENDING,
      user,
      dto.note ?? `${REQUEST_TYPE_LABELS[request.requestType]} request needs your response`,
      request.createdBy?.userId,
      request.employee?.email ? [request.employee.email] : undefined,
    );
    return updated;
  }

  private async recordReview(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    const steps = this.sortedSteps(request);
    const index = this.activeStepIndex(steps);
    const now = new Date();
    if (index !== -1) {
      steps[index] = {
        ...steps[index],
        status: EmployeeRequestStepStatus.APPROVED,
        actedByUserId: user.userId,
        actedByName: user.email,
        comment: this.normalise(dto.note ?? dto.response),
        completedAt: now,
      };
    }
    const updated = (await this.requestRepository.updateById(
      String(request._id),
      {
        steps,
        details: dto.details
          ? { ...request.details, ...dto.details }
          : request.details,
        lastActivityAt: now,
      },
    ))!;
    await this.recordActivity(
      organizationId,
      String(request._id),
      RequestActivityType.REVIEWED,
      user,
      dto.note ?? 'Review recorded',
    );
    return updated;
  }

  private async closePlan(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    const now = new Date();
    const updated = (await this.requestRepository.updateById(
      String(request._id),
      {
        status: EmployeeRequestStatus.CLOSED,
        closedAt: now,
        completedAt: now,
        lastActivityAt: now,
        pipPlan: {
          status: 'closed',
          outcome: this.normalise(dto.outcome) ?? 'closed',
          reviewDate: request.pipPlan?.reviewDate ?? null,
          closedAt: now,
          objectives: request.pipPlan?.objectives ?? {},
        },
      },
    ))!;
    await this.recordActivity(
      organizationId,
      String(request._id),
      RequestActivityType.PLAN_CLOSED,
      user,
      dto.outcome ?? 'Performance plan closed',
    );
    return updated;
  }

  private async delegateRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    const delegateUserId = dto.delegateUserId;
    if (!delegateUserId) {
      AppResponse.error({
        message: 'Delegate user ID is required',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    const settings = await this.settingsRepository.ensure(organizationId);
    if (settings.delegation?.allowDelegation === false) {
      AppResponse.error({
        message: 'Delegation is disabled for this organization',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    const steps = this.sortedSteps(request);
    const index = this.activeStepIndex(steps);
    if (index === -1) {
      AppResponse.error({
        message: 'Request has no active step',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    const fromUserId = steps[index].assigneeUserId ?? user.userId;
    const delegation = await this.delegationRepository.create({
      organizationId,
      fromUserId,
      toUserId: delegateUserId,
      startsAt: dto.from ? new Date(dto.from) : new Date(),
      endsAt: dto.to ? new Date(dto.to) : this.addDays(new Date(), 7),
      reason: this.normalise(dto.reason ?? dto.note),
      status: RequestDelegationStatus.ACTIVE,
      createdByUserId: user.userId,
    });
    steps[index] = {
      ...steps[index],
      assigneeUserId: delegateUserId!,
      delegatedFromUserId: fromUserId,
      assigneeRole: steps[index].assigneeRole ?? null,
    };
    const updated = (await this.requestRepository.updateById(
      String(request._id),
      { steps, lastActivityAt: new Date() },
    ))!;
    await this.recordActivity(
      organizationId,
      String(request._id),
      RequestActivityType.DELEGATED,
      user,
      dto.note ?? 'Request delegated',
      { delegationId: String(delegation._id) },
    );
    return updated;
  }

  private async escalateRequest(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
  ) {
    const updated = await this.escalateInternal(organizationId, request, user);
    await this.recordActivity(
      organizationId,
      String(request._id),
      RequestActivityType.ESCALATED,
      user,
      dto.note ?? 'Request escalated',
    );
    return updated;
  }

  private async escalateInternal(
    organizationId: string,
    request: EmployeeRequestDocument,
    user: ICurrentUser | null,
  ) {
    const steps = this.sortedSteps(request);
    const index = this.activeStepIndex(steps);
    const now = new Date();
    if (index !== -1) {
      steps[index] = {
        ...steps[index],
        status: EmployeeRequestStepStatus.ESCALATED,
        escalatedAt: now,
      };
      const next = steps[index + 1];
      if (next) {
        next.status = EmployeeRequestStepStatus.IN_PROGRESS;
        next.startedAt = next.startedAt ?? now;
      } else {
        steps[index].status = EmployeeRequestStepStatus.IN_PROGRESS;
      }
    }
    const updated = (await this.requestRepository.updateById(
      String(request._id),
      {
        steps,
        lastEscalatedAt: now,
        lastActivityAt: now,
        escalationCount: (request.escalationCount ?? 0) + 1,
      },
    ))!;
    await this.notify(
      updated,
      NotificationType.REQUEST_STEP_UPDATED,
      NotificationActionType.APPROVE,
      NotificationResolution.PENDING,
      user,
      `${REQUEST_TYPE_LABELS[request.requestType]} request was escalated`,
    );
    return updated;
  }

  private async applyDecision(
    organizationId: string,
    user: ICurrentUser,
    request: EmployeeRequestDocument,
    dto: RequestActionDto,
    stepStatus: EmployeeRequestStepStatus,
    terminalStatus: EmployeeRequestStatus,
    activityType: RequestActivityType,
    notificationType: NotificationType,
    outcome: string,
    rejected = false,
  ) {
    const steps = this.sortedSteps(request);
    const index = this.activeStepIndex(steps);
    if (index === -1) {
      AppResponse.error({
        message: 'Request has no active step',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    if (dto.stepId && steps[index]?.stepId !== dto.stepId) {
      AppResponse.error({
        message: 'Step is not the current request step',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const now = new Date();
    const activeStep = steps[index];
    steps[index] = {
      ...activeStep,
      status: stepStatus,
      actedByUserId: user.userId,
      actedByName: user.email,
      comment: this.normalise(dto.note ?? dto.message),
      decisionReasonCode: this.normalise(dto.reasonCode),
      decisionMessage: this.normalise(dto.message),
      completedAt: now,
      acceptedAt: stepStatus === EmployeeRequestStepStatus.ACCEPTED ? now : null,
      verifiedAt: stepStatus === EmployeeRequestStepStatus.VERIFIED ? now : null,
    };

    let status = terminalStatus;
    let completedAt: Date | null = null;
    if (rejected) {
      completedAt = now;
    } else {
      const next = steps[index + 1];
      if (next) {
        next.status = EmployeeRequestStepStatus.IN_PROGRESS;
        next.startedAt = next.startedAt ?? now;
        status =
          stepStatus === EmployeeRequestStepStatus.ACCEPTED
            ? EmployeeRequestStatus.ACTIVE
            : EmployeeRequestStatus.IN_PROGRESS;
      } else {
        completedAt = now;
      }
    }

    const updated = (await this.requestRepository.updateById(
      String(request._id),
      {
        steps,
        status,
        currentStepOrder:
          steps.find((step) => step.status === EmployeeRequestStepStatus.IN_PROGRESS)
            ?.order ?? activeStep.order,
        completedAt,
        closedAt: rejected ? now : request.closedAt ?? null,
        lastActivityAt: now,
        waitingOn: rejected
          ? null
          : this.toWaitingOnSnapshot(request.createdBy, this.activeStep(steps)),
      },
    ))!;

    await this.recordActivity(
      organizationId,
      String(request._id),
      activityType,
      user,
      dto.note ?? `${REQUEST_TYPE_LABELS[request.requestType]} request ${outcome}`,
      {
        reasonCode: dto.reasonCode,
        message: dto.message,
        notifyRequester: dto.notifyRequester,
      },
    );
    await this.notify(
      updated,
      notificationType,
      rejected
        ? NotificationActionType.VIEW
        : completedAt
          ? NotificationActionType.VIEW
          : NotificationActionType.APPROVE,
      rejected || completedAt
        ? NotificationResolution.RESOLVED
        : NotificationResolution.PENDING,
      user,
      `${REQUEST_TYPE_LABELS[request.requestType]} request ${outcome}`,
      request.createdBy?.userId,
    );
    return updated;
  }

  private async createRequestDocument(
    organizationId: string,
    requestId: string,
    dto: AddRequestDocumentDto,
    user: ICurrentUser | null,
  ) {
    const request = await this.getRequestOrFail(organizationId, requestId);
    const document = await this.documentRepository.create({
      organizationId,
      requestId: String(request._id),
      templateId: this.normalise(dto.templateId),
      type: dto.type ?? 'generated',
      name: dto.name,
      url: dto.url,
      publicId: this.normalise(dto.publicId),
      status: RequestDocumentStatus.DRAFT,
      createdByUserId: user?.userId ?? null,
    });
    await this.requestRepository.updateById(String(request._id), {
      documentIds: [
        ...(request.documentIds ?? []),
        String(document._id),
      ],
      lastActivityAt: new Date(),
    });
    await this.recordActivity(
      organizationId,
      String(request._id),
      RequestActivityType.DOCUMENT_ADDED,
      user,
      `${dto.name} added`,
    );
    return document;
  }

  private async syncWaitingOn(request: EmployeeRequestDocument) {
    const steps = this.sortedSteps(request);
    await this.requestRepository.updateById(String(request._id), {
      waitingOn: this.toWaitingOnSnapshot(
        request.createdBy,
        this.activeStep(steps),
      ),
    });
  }

  private buildQueueFilter(
    organizationId: string,
    user: ICurrentUser,
    query: RequestQueueQueryDto,
  ): MongoFilter {
    const conditions: Record<string, unknown>[] = [
      { organizationId },
      { isDraft: false },
    ];
    const scope = query.scope ?? 'your';

    if (scope === 'your') {
      conditions.push({
        $or: [
          { 'createdBy.userId': user.userId },
          { 'raisedBy.userId': user.userId },
          ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
        ],
      });
    } else if (scope === 'employee') {
      conditions.push({
        $or: [
          { 'createdBy.userId': { $ne: user.userId } },
          {
            $and: [
              { employeeId: { $ne: user.employeeId ?? '' } },
              { direction: RequestDirection.OUTGOING },
            ],
          },
        ],
      });
    } else {
      conditions.push({
        $or: [
          { 'steps.assigneeUserId': user.userId },
          { 'waitingOn.userId': user.userId },
          { 'waitingOn.role': { $in: this.userRoleNames(user) } },
        ],
      });
    }

    if (query.requestType) conditions.push({ requestType: query.requestType });
    if (query.status) conditions.push({ status: query.status });
    if (query.direction) conditions.push({ direction: query.direction });
    if (query.waitingOn?.trim()) {
      const value = this.escapeRegex(query.waitingOn.trim());
      conditions.push({
        $or: [
          { 'waitingOn.name': { $regex: value, $options: 'i' } },
          { 'waitingOn.role': { $regex: value, $options: 'i' } },
          { 'steps.responsibleParty': { $regex: value, $options: 'i' } },
        ],
      });
    }

    const dateField =
      query.direction === RequestDirection.OUTGOING ? 'sentAt' : 'raisedAt';
    const sentRange: Record<string, Date> = {};
    if (query.sentFrom) sentRange.$gte = new Date(query.sentFrom);
    if (query.sentTo) sentRange.$lte = new Date(query.sentTo);
    if (Object.keys(sentRange).length > 0) {
      conditions.push({ [dateField]: sentRange });
    }

    if (query.search?.trim()) {
      const value = this.escapeRegex(query.search.trim());
      conditions.push({
        $or: [
          { requestNumber: { $regex: value, $options: 'i' } },
          { 'employee.employeeName': { $regex: value, $options: 'i' } },
          { 'employee.email': { $regex: value, $options: 'i' } },
          { 'employee.employeeUniqueId': { $regex: value, $options: 'i' } },
        ],
      });
    }

    return (conditions.length === 1
      ? conditions[0]
      : { $and: conditions }) as MongoFilter;
  }

  private async selectWorkflow(
    organizationId: string,
    requestType: RequestType,
    workflowId?: string,
  ): Promise<WorkflowView> {
    const response = (await this.settingsDomain.getRequestWorkflows(
      organizationId,
      requestType,
    )) as { requestTypes: WorkflowGroupView[] };
    const workflows = response.requestTypes[0]?.workflows ?? [];
    const workflow = workflowId
      ? workflows.find((item) => item.id === workflowId)
      : (workflows.find((item) => item.isDefault) ?? workflows[0]);
    if (!workflow) {
      AppResponse.error({
        message: 'No request workflow configured for this request type',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    return workflow!;
  }

  private buildSteps(
    workflow: WorkflowView,
    employee: Record<string, unknown> | null,
    direction: RequestDirection,
    settings: RequestSettings,
    startedAt: Date,
  ): RequestStepSnapshot[] {
    const definition = getRequestFormDefinition(workflow.requestType);
    const source: WorkflowStepView[] =
      workflow.steps.length > 0
        ? [...workflow.steps].sort((a, b) => a.order - b.order)
        : (definition.approvalChainPreview ?? ['HR admin']).map(
            (label, index) => ({
              id: `preview-${index + 1}`,
              order: index + 1,
              responsibleParty: label,
            }),
          );

    const dueDays = settings.reminder?.slaWorkingDays ?? 3;
    return source.map((step, index) => {
      const assignee = this.resolveStepAssignee(step, employee);
      return {
        stepId: step.id,
        order: step.order ?? index + 1,
        responsibleParty: step.responsibleParty ?? null,
        action: (step.action as RequestStepActionKind) ?? RequestStepActionKind.APPROVE,
        assigneeUserId: assignee.userId,
        assigneeRole: assignee.role ?? step.assigneeRole ?? null,
        assigneeEmployeeId: assignee.employeeId ?? step.assigneeEmployeeId ?? null,
        delegatedFromUserId: null,
        dueAt: step.dueHours
          ? new Date(startedAt.getTime() + step.dueHours * 3_600_000)
          : this.addDays(startedAt, dueDays),
        status:
          index === 0
            ? EmployeeRequestStepStatus.IN_PROGRESS
            : EmployeeRequestStepStatus.PENDING,
        startedAt: index === 0 ? startedAt : null,
        completedAt: null,
        actedByUserId: null,
        actedByName: null,
        comment: null,
        decisionReasonCode: null,
        decisionMessage: null,
        queriedAt: null,
        acceptedAt: null,
        verifiedAt: null,
        signedAt: null,
        escalatedAt: null,
      };
    });
  }

  private resolveStepAssignee(
    step: WorkflowStepView,
    employee: Record<string, unknown> | null,
  ): { userId: string | null; employeeId: string | null; role: string | null } {
    if (step.assigneeUserId || step.assigneeEmployeeId || step.assigneeRole) {
      return {
        userId: step.assigneeUserId ?? null,
        employeeId: step.assigneeEmployeeId ?? null,
        role: step.assigneeRole ?? null,
      };
    }
    const label = (step.responsibleParty ?? '').toLowerCase();
    if (label.includes('line manager')) {
      return {
        userId: null,
        employeeId: (employee?.lineManagerId as string | null) ?? null,
        role: SystemRole.DEPT_MANAGER,
      };
    }
    if (label.includes('employee') && directionIncludesEmployee(label)) {
      return {
        userId: null,
        employeeId: (employee?.employeeId as string | null) ?? null,
        role: SystemRole.EMPLOYEE,
      };
    }
    if (label.includes('finance')) {
      return { userId: null, employeeId: null, role: SystemRole.FINANCE };
    }
    if (label.includes('it')) {
      return { userId: null, employeeId: null, role: SystemRole.IT_ADMIN };
    }
    if (label.includes('hr')) {
      return { userId: null, employeeId: null, role: SystemRole.HR_ADMIN };
    }
    return { userId: null, employeeId: null, role: null };
  }

  private buildSentTo(
    direction: RequestDirection,
    employee: Record<string, unknown>,
    raisedBy: RequestPartySnapshot,
  ): RequestPartySnapshot {
    if (direction === RequestDirection.OUTGOING) {
      return {
        userId: null,
        employeeId: (employee.employeeId as string | null) ?? null,
        name: (employee.employeeName as string | null) ?? null,
        email: (employee.email as string | null) ?? null,
        role: SystemRole.EMPLOYEE,
      };
    }
    return raisedBy;
  }

  private toWaitingOnSnapshot(
    party: {
      userId?: string | null;
      employeeId?: string | null;
      name?: string | null;
      email?: string | null;
      role?: string | null;
    } | null,
    step: RequestStepSnapshot | null,
  ): RequestWaitingOnSnapshot | null {
    if (!step) return null;
    return {
      userId: step.assigneeUserId ?? party?.userId ?? null,
      employeeId: step.assigneeEmployeeId ?? party?.employeeId ?? null,
      name: party?.name ?? step.actedByName ?? null,
      role: step.assigneeRole ?? step.responsibleParty ?? null,
      stepId: step.stepId,
      stepOrder: step.order,
      delegatedFromUserId: step.delegatedFromUserId ?? null,
    };
  }

  private buildAttachments(
    attachments: RequestAttachmentDto[] | undefined,
    user: ICurrentUser,
    uploadedAt: Date,
  ) {
    return (attachments ?? []).map((attachment) => ({
      id: new Types.ObjectId().toHexString(),
      url: attachment.url,
      publicId: this.normalise(attachment.publicId),
      name: this.normalise(attachment.name),
      mimeType: this.normalise(attachment.mimeType),
      size: attachment.size ?? 0,
      category: attachment.category ?? 'general',
      required: attachment.required ?? false,
      uploadedByUserId: user.userId,
      uploadedAt,
    }));
  }

  private buildVisibility(organizationId: string, requestType: RequestType) {
    return this.settingsRepository.ensure(organizationId).then((settings) => ({
      restricted:
        settings.visibility?.restrictedVisibility !== 'all' ||
        getRequestFormDefinition(requestType).restricted === true,
      hiddenFromDirectory: settings.visibility?.hideFromDirectory ?? true,
      logViews: settings.visibility?.logEveryView ?? true,
      retentionUntil: null,
    }));
  }

  private async resolveEmployeeId(
    organizationId: string,
    employeeId?: string,
  ): Promise<string> {
    const resolved = employeeId?.trim();
    if (!resolved) {
      AppResponse.error({
        message: 'Employee ID is required',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    const employee = await this.employeeRepository.findById(resolved!);
    if (!employee || employee.organizationId !== organizationId) {
      AppResponse.error({
        message: 'Employee not found',
        status: HttpStatus.NOT_FOUND,
      });
    }
    return resolved!;
  }

  private async getEmployeeSnapshot(employeeId: string) {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      AppResponse.error({
        message: 'Employee not found',
        status: HttpStatus.NOT_FOUND,
      });
    }
    const jobTitle =
      employee!.jobTitleCode
        ? await this.employeeRepository
            .findOne({ employeeId })
            .then(() => null)
        : null;
    void jobTitle;
    return {
      employeeId: String(employee!._id),
      employeeUniqueId: this.normalise(employee!.employeeId),
      employeeName:
        `${employee!.firstName ?? ''} ${employee!.lastName ?? ''}`.trim() ||
        employee!.email,
      email: employee!.email,
      avatarUrl: this.normalise(employee!.avatarUrl),
      jobTitle: this.normalise(employee!.jobTitleCode),
      departmentCode: this.normalise(employee!.departmentCode),
      department: this.normalise(employee!.departmentCode),
      lineManagerId: this.normalise(employee!.supervisorId),
      lineManager: null,
      employmentDate: employee!.employmentDate ?? null,
    };
  }

  private toCreatorSnapshot(user: ICurrentUser) {
    return {
      userId: user.userId,
      email: user.email,
      employeeId: this.normalise(user.employeeId),
      name: user.email,
    };
  }

  private toPartySnapshot(user: ICurrentUser): RequestPartySnapshot {
    return {
      userId: user.userId,
      employeeId: this.normalise(user.employeeId),
      name: user.email,
      email: user.email,
      role: null,
    };
  }

  private async getRequestOrFail(
    organizationId: string,
    identifier: string,
  ): Promise<EmployeeRequestDocument> {
    const request =
      (await this.requestRepository.findById(identifier)) ??
      (await this.requestRepository
        .findAll(
          {
            organizationId,
            requestNumber: identifier,
          } as MongoFilter,
          {},
          1,
        )
        .then((items) => items[0] ?? null));
    if (!request || request.organizationId !== organizationId) {
      AppResponse.error({
        message: 'Request not found',
        status: HttpStatus.NOT_FOUND,
      });
    }
    return request!;
  }

  private async getOwnDraftOrFail(
    organizationId: string,
    user: ICurrentUser,
    draftId: string,
  ): Promise<EmployeeRequestDocument> {
    const draft = await this.getRequestOrFail(organizationId, draftId);
    if (!draft.isDraft || draft.createdBy?.userId !== user.userId) {
      AppResponse.error({
        message: 'Draft not found',
        status: HttpStatus.NOT_FOUND,
      });
    }
    return draft;
  }

  private async getDelegationOrFail(organizationId: string, delegationId: string) {
    const delegation = await this.delegationRepository.findById(delegationId);
    if (!delegation || delegation.organizationId !== organizationId) {
      AppResponse.error({
        message: 'Delegation not found',
        status: HttpStatus.NOT_FOUND,
      });
    }
    return delegation!;
  }

  private async recordActivity(
    organizationId: string,
    requestId: string,
    type: RequestActivityType,
    user: ICurrentUser | null,
    message: string,
    metadata: Record<string, unknown> = {},
  ): Promise<RequestActivity> {
    return this.activityRepository.create({
      organizationId,
      requestId,
      type,
      actorUserId: user?.userId ?? null,
      actorName: user?.email ?? 'System',
      message,
      metadata,
    });
  }

  private async notify(
    request: EmployeeRequestDocument,
    type: NotificationType,
    actionType: NotificationActionType,
    resolution: NotificationResolution,
    user: ICurrentUser | null,
    message: string,
    recipientUserId?: string | null,
    recipientEmails?: string[],
  ) {
    await this.notificationService.dispatch({
      organizationId: request.organizationId,
      type,
      category: NotificationCategory.REQUEST,
      message,
      createdByUserId: user?.userId ?? 'system',
      createdByEmail: user?.email ?? 'system',
      actor: {
        id: request.employeeId,
        name: request.employee?.employeeName ?? null,
        avatarUrl: request.employee?.avatarUrl ?? null,
      },
      entity: {
        type: NotificationEntityType.REQUEST,
        id: String(request._id),
      },
      action: { type: actionType, resolution },
      metadata: {
        requestId: String(request._id),
        requestNumber: request.requestNumber,
        requestType: request.requestType,
        status: request.status,
      },
      recipientUserIds: recipientUserId ? [recipientUserId] : [],
      recipientEmails,
      excludeUserIds: user ? [user.userId] : [],
    });
  }

  private sortedSteps(request: EmployeeRequestDocument): RequestStepSnapshot[] {
    return [...(request.steps ?? [])].sort((a, b) => a.order - b.order);
  }

  private activeStep(steps: RequestStepSnapshot[]): RequestStepSnapshot | null {
    const index = this.activeStepIndex(steps);
    return index === -1 ? null : steps[index];
  }

  private activeStepIndex(steps: RequestStepSnapshot[]): number {
    const inProgress = steps.findIndex(
      (step) => step.status === EmployeeRequestStepStatus.IN_PROGRESS,
    );
    if (inProgress !== -1) return inProgress;
    return steps.findIndex(
      (step) => step.status === EmployeeRequestStepStatus.PENDING,
    );
  }

  private toDisplayState(request: EmployeeRequestDocument): RequestDisplayState {
    if (request.isDraft) return RequestDisplayState.DRAFT;
    switch (request.status) {
      case EmployeeRequestStatus.PENDING:
      case EmployeeRequestStatus.IN_PROGRESS:
        return RequestDisplayState.IN_REVIEW;
      case EmployeeRequestStatus.AWAITING_EMPLOYEE:
        return RequestDisplayState.AWAITING_EMPLOYEE;
      case EmployeeRequestStatus.AWAITING_RESPONSE:
        return RequestDisplayState.AWAITING_RESPONSE;
      case EmployeeRequestStatus.QUERIED:
        return RequestDisplayState.QUERIED;
      case EmployeeRequestStatus.ACTIVE:
        return RequestDisplayState.ACTIVE;
      case EmployeeRequestStatus.APPROVED:
        return RequestDisplayState.COMPLETED;
      case EmployeeRequestStatus.REJECTED:
        return RequestDisplayState.REJECTED;
      case EmployeeRequestStatus.WITHDRAWN:
        return RequestDisplayState.WITHDRAWN;
      case EmployeeRequestStatus.CLOSED:
        return RequestDisplayState.CLOSED;
      default:
        return RequestDisplayState.IN_REVIEW;
    }
  }

  private toFlowView(request: EmployeeRequestDocument) {
    const steps = this.sortedSteps(request);
    const active = this.activeStep(steps);
    const completed = steps.filter(
      (step) =>
        step.status === EmployeeRequestStepStatus.APPROVED ||
        step.status === EmployeeRequestStepStatus.VERIFIED ||
        step.status === EmployeeRequestStepStatus.ACCEPTED,
    ).length;

    return {
      id: String(request._id),
      requestNumber: request.requestNumber ?? null,
      requestType: request.requestType,
      requestTypeLabel: REQUEST_TYPE_LABELS[request.requestType],
      title: `${REQUEST_TYPE_LABELS[request.requestType]} for ${request.employee?.employeeName ?? request.employeeId}`,
      status: request.status,
      displayState: this.toDisplayState(request),
      direction: request.direction,
      isDraft: request.isDraft,
      reason: request.reason ?? null,
      details: request.details ?? {},
      employee: request.employee ?? null,
      createdBy: request.createdBy ?? null,
      raisedBy: request.raisedBy ?? null,
      sentTo: request.sentTo ?? null,
      waitingOn: request.waitingOn ?? null,
      workflow: {
        id: request.workflowId ?? null,
        name: request.workflowName ?? null,
      },
      currentStep: active
        ? {
            stepId: active.stepId,
            order: active.order,
            responsibleParty: active.responsibleParty,
            action: active.action,
            assigneeUserId: active.assigneeUserId,
            assigneeEmployeeId: active.assigneeEmployeeId,
            assigneeRole: active.assigneeRole,
            dueAt: this.formatDateTime(active.dueAt),
          }
        : null,
      steps: steps.map((step) => ({
        stepId: step.stepId,
        order: step.order,
        responsibleParty: step.responsibleParty,
        action: step.action,
        status: step.status,
        assigneeUserId: step.assigneeUserId,
        assigneeRole: step.assigneeRole,
        assigneeEmployeeId: step.assigneeEmployeeId,
        delegatedFromUserId: step.delegatedFromUserId,
        dueAt: this.formatDateTime(step.dueAt),
        actedByUserId: step.actedByUserId,
        actedByName: step.actedByName,
        comment: step.comment,
        decisionReasonCode: step.decisionReasonCode,
        decisionMessage: step.decisionMessage,
        startedAt: this.formatDateTime(step.startedAt),
        completedAt: this.formatDateTime(step.completedAt),
        queriedAt: this.formatDateTime(step.queriedAt),
        verifiedAt: this.formatDateTime(step.verifiedAt),
        escalatedAt: this.formatDateTime(step.escalatedAt),
      })),
      progress:
        steps.length === 0 ? 0 : Math.round((completed / steps.length) * 100),
      completedSteps: completed,
      totalSteps: steps.length,
      attachments: request.attachments ?? [],
      attachmentUrls: request.attachmentUrls ?? [],
      documentIds: request.documentIds ?? [],
      pipPlan: request.pipPlan ?? null,
      visibility: request.visibility ?? null,
      effectiveDate: this.formatDate(request.effectiveDate),
      endDate: this.formatDate(request.endDate),
      sentAt: this.formatDateTime(request.sentAt),
      raisedAt: this.formatDateTime(request.raisedAt),
      dueAt: this.formatDateTime(request.dueAt),
      closedAt: this.formatDateTime(request.closedAt),
      lastActivityAt: this.formatDateTime(request.lastActivityAt),
      lastNudgedAt: this.formatDateTime(request.lastNudgedAt),
      lastReminderAt: this.formatDateTime(request.lastReminderAt),
      lastEscalatedAt: this.formatDateTime(request.lastEscalatedAt),
      reminderCount: request.reminderCount ?? 0,
      escalationCount: request.escalationCount ?? 0,
      resendCount: request.resendCount ?? 0,
      availableActions: this.availableActions(request, active),
      submittedAt: this.formatDateTime(request.submittedAt),
      completedAt: this.formatDateTime(request.completedAt),
      createdAt: this.formatDateTime(request.createdAt),
      updatedAt: this.formatDateTime(request.updatedAt),
    };
  }

  private availableActions(
    request: EmployeeRequestDocument,
    active: RequestStepSnapshot | null,
  ): string[] {
    if (request.isDraft) return ['save_draft', 'submit', 'delete_draft'];
    if (
      [
        EmployeeRequestStatus.APPROVED,
        EmployeeRequestStatus.REJECTED,
        EmployeeRequestStatus.WITHDRAWN,
        EmployeeRequestStatus.CLOSED,
      ].includes(request.status)
    ) {
      return ['view'];
    }
    const actions = ['view', 'withdraw', 'nudge', 'nudge_employee', 'delegate', 'escalate'];
    if (active?.action === RequestStepActionKind.VERIFY) actions.push('verify');
    else if (active?.action === RequestStepActionKind.ACCEPT)
      actions.push('accept', 'decline');
    else if (active?.action === RequestStepActionKind.RESPOND)
      actions.push('respond', 'query');
    else if (active?.action === RequestStepActionKind.REVIEW)
      actions.push('review_record');
    else if (active?.action === RequestStepActionKind.CLOSE_PLAN)
      actions.push('close_plan');
    else actions.push('approve', 'decline', 'query');
    return [...new Set(actions)];
  }

  private toDocumentView(document: RequestDocumentDocument) {
    return {
      id: String(document._id),
      requestId: document.requestId,
      templateId: document.templateId,
      type: document.type,
      name: document.name,
      url: document.url,
      publicId: document.publicId,
      status: document.status,
      isSigned: document.isSigned,
      isIssued: document.isIssued,
      signedAt: this.formatDateTime(document.signedAt),
      issuedAt: this.formatDateTime(document.issuedAt),
      version: document.version,
      createdAt: this.formatDateTime(document.createdAt),
    };
  }

  private toDelegationView(delegation: {
    _id: unknown;
    organizationId: string;
    fromUserId: string;
    toUserId: string;
    startsAt: Date;
    endsAt: Date;
    reason: string | null;
    status: RequestDelegationStatus;
    autoOnLeave: boolean;
    createdAt?: Date;
  }) {
    return {
      id: String(delegation._id),
      organizationId: delegation.organizationId,
      fromUserId: delegation.fromUserId,
      toUserId: delegation.toUserId,
      startsAt: this.formatDateTime(delegation.startsAt),
      endsAt: this.formatDateTime(delegation.endsAt),
      reason: delegation.reason,
      status: delegation.status,
      autoOnLeave: delegation.autoOnLeave,
      createdAt: this.formatDateTime(delegation.createdAt),
    };
  }

  private toTypeConfigView(config: {
    _id?: unknown;
    type: string;
    label: string;
    category: string;
    enabled: boolean;
    restricted: boolean;
    whoMayRaise: SystemRole[];
    formKey: string | null;
    description: string | null;
    attachmentsRequired: boolean;
    defaultWorkflowId: string | null;
    documentTemplateId: string | null;
  }) {
    return {
      id: config._id ? String(config._id) : null,
      type: config.type,
      label: config.label,
      category: config.category,
      enabled: config.enabled,
      restricted: config.restricted,
      whoMayRaise: config.whoMayRaise,
      formKey: config.formKey,
      description: config.description,
      attachmentsRequired: config.attachmentsRequired,
      defaultWorkflowId: config.defaultWorkflowId,
      documentTemplateId: config.documentTemplateId,
    };
  }

  private toSettingsView(settings: RequestSettings) {
    return {
      reminder: {
        slaWorkingDays: settings.reminder?.slaWorkingDays ?? 3,
        remindersAfterDays: settings.reminder?.remindersAfterDays ?? [1, 2],
        escalateToNextApprover:
          settings.reminder?.escalateToNextApprover ?? true,
        notifyRequester: settings.reminder?.notifyRequester ?? true,
        weeklyHrDigest: settings.reminder?.weeklyHrDigest ?? 'monday 08:00',
      },
      delegation: {
        allowDelegation: settings.delegation?.allowDelegation ?? true,
        whoCanDelegate: settings.delegation?.whoCanDelegate ?? [],
        maxDays: settings.delegation?.maxDays ?? 30,
        autoDelegateOnLeave:
          settings.delegation?.autoDelegateOnLeave ?? false,
        recordOnRequest: settings.delegation?.recordOnRequest ?? true,
      } satisfies RequestDelegationSettings,
      visibility: {
        restrictedVisibility:
          settings.visibility?.restrictedVisibility ?? 'raisers_approvers_hr',
        hideFromDirectory: settings.visibility?.hideFromDirectory ?? true,
        logEveryView: settings.visibility?.logEveryView ?? true,
        completedRetentionYears:
          settings.visibility?.completedRetentionYears ?? 7,
        withdrawnRetentionMonths:
          settings.visibility?.withdrawnRetentionMonths ?? 12,
        hrAdminOnlyExport: settings.visibility?.hrAdminOnlyExport ?? true,
      },
      templates: settings.templates ?? [],
    };
  }

  private toViewLogView(log: {
    _id: unknown;
    requestId: string;
    viewerUserId: string;
    viewerEmail: string | null;
    reason: string | null;
    createdAt?: Date;
  }) {
    return {
      id: String(log._id),
      requestId: log.requestId,
      viewerUserId: log.viewerUserId,
      viewerEmail: log.viewerEmail,
      reason: log.reason,
      createdAt: this.formatDateTime(log.createdAt),
    };
  }

  private assertCanAccessRequest(
    request: EmployeeRequestDocument,
    user: ICurrentUser,
  ): void {
    if (this.canAccessRequest(request, user)) return;

    AppResponse.error({
      message: 'You do not have access to this request',
      status: HttpStatus.FORBIDDEN,
    });
  }

  private canAccessRequest(
    request: EmployeeRequestDocument,
    user: ICurrentUser,
  ): boolean {
    if (
      request.createdBy?.userId === user.userId ||
      request.raisedBy?.userId === user.userId ||
      (!!user.employeeId && request.employeeId === user.employeeId)
    ) {
      return true;
    }

    const roles = this.userRoleNames(user);
    if (
      request.waitingOn?.userId === user.userId ||
      (!!user.employeeId && request.waitingOn?.employeeId === user.employeeId) ||
      (!!request.waitingOn?.role && roles.includes(request.waitingOn.role))
    ) {
      return true;
    }

    return this.sortedSteps(request).some(
      (step) =>
        step.assigneeUserId === user.userId ||
        (!!user.employeeId && step.assigneeEmployeeId === user.employeeId) ||
        (!!step.assigneeRole && roles.includes(step.assigneeRole)) ||
        step.actedByUserId === user.userId,
    );
  }

  private userRoleNames(user: ICurrentUser): string[] {
    return Object.values(SystemRole).filter((role) =>
      user.email?.toLowerCase().includes(role.split('_')[0]),
    );
  }

  private normalise(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  private toDate(value: unknown): Date | null {
    return typeof value === 'string' && value.trim()
      ? new Date(value)
      : null;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private formatDate(value?: Date | null): string | null {
    if (!value) return null;
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

function directionIncludesEmployee(label: string): boolean {
  return label.includes('employee');
}
