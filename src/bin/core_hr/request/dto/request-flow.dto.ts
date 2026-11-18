import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SystemRole } from '../../../generic/auth/enum/role.enum';
import { RequestType } from '../../../generic/setting/request-management/enum/request-management.enum';
import { RequestDirection, RequestStepActionKind } from '../enum/request-flow.enum';
import { EmployeeRequestStatus } from '../enum/request.enum';

export class RequestQueueQueryDto {
  @IsOptional()
  @IsString()
  scope?: 'your' | 'employee' | 'approvals';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  batch?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(RequestType)
  requestType?: RequestType;

  @IsOptional()
  @IsEnum(EmployeeRequestStatus)
  status?: EmployeeRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  waitingOn?: string;

  @IsOptional()
  @IsEnum(RequestDirection)
  direction?: RequestDirection;

  @IsOptional()
  @IsString()
  sentFrom?: string;

  @IsOptional()
  @IsString()
  sentTo?: string;

  @IsOptional()
  @IsBoolean()
  includeDrafts?: boolean;

  @IsOptional()
  @IsString()
  sort?: string;
}

export class RequestAttachmentDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class SaveRequestDraftDto {
  @IsOptional()
  @IsString()
  draftId?: string;

  @IsEnum(RequestType)
  requestType: RequestType;

  @IsEnum(RequestDirection)
  direction: RequestDirection;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsObject()
  details: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  attachments?: RequestAttachmentDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class SubmitRequestDto {
  @IsOptional()
  @IsString()
  draftId?: string;

  @IsEnum(RequestType)
  requestType: RequestType;

  @IsEnum(RequestDirection)
  direction: RequestDirection;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  workflowId?: string;

  @IsObject()
  details: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  attachments?: RequestAttachmentDto[];

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ApprovalChainPreviewDto {
  @IsEnum(RequestType)
  requestType: RequestType;

  @IsEnum(RequestDirection)
  direction: RequestDirection;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  workflowId?: string;
}

export class RetrieveRequestFlowDto {
  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  requestNumber?: string;
}

export class RequestActionDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsOptional()
  @IsString()
  stepId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsBoolean()
  notifyRequester?: boolean;

  @IsOptional()
  @IsBoolean()
  accepted?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  response?: string;

  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  queryTarget?: 'requester' | 'employee';

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  attachments?: RequestAttachmentDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  restartFromStep?: number;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceDocumentIds?: string[];

  @IsOptional()
  @IsString()
  delegateUserId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RegisterRequestAttachmentDto {
  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  draftId?: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class AddRequestDocumentDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;
}

export class IssueRequestDocumentDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsString()
  @IsNotEmpty()
  documentId: string;

  @IsObject()
  signature: Record<string, unknown>;
}

export class RetrieveRequestDocumentDto {
  @IsOptional()
  @IsString()
  requestId?: string;

  @IsString()
  @IsNotEmpty()
  documentId: string;
}

export class RequestTypeConfigDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  restricted?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(SystemRole, { each: true })
  whoMayRaise?: SystemRole[];

  @IsOptional()
  @IsString()
  formKey?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  attachmentsRequired?: boolean;

  @IsOptional()
  @IsString()
  defaultWorkflowId?: string;

  @IsOptional()
  @IsString()
  documentTemplateId?: string;
}

export class UpdateRequestTypeDto {
  @IsEnum(RequestType)
  requestType: RequestType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  restricted?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(SystemRole, { each: true })
  whoMayRaise?: SystemRole[];

  @IsOptional()
  @IsString()
  formKey?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  attachmentsRequired?: boolean;
}

export class ToggleRequestTypeDto {
  @IsEnum(RequestType)
  requestType: RequestType;

  @IsBoolean()
  enabled: boolean;
}

export class UpdateReminderPolicyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slaWorkingDays?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  remindersAfterDays?: number[];

  @IsOptional()
  @IsBoolean()
  escalateToNextApprover?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyRequester?: boolean;

  @IsOptional()
  @IsString()
  weeklyHrDigest?: string;
}

export class RunReminderDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class UpdateDelegationPolicyDto {
  @IsOptional()
  @IsBoolean()
  allowDelegation?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(SystemRole, { each: true })
  whoCanDelegate?: SystemRole[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxDays?: number;

  @IsOptional()
  @IsBoolean()
  autoDelegateOnLeave?: boolean;

  @IsOptional()
  @IsBoolean()
  recordOnRequest?: boolean;
}

export class AddRequestDelegationDto {
  @IsString()
  @IsNotEmpty()
  fromUserId: string;

  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  autoOnLeave?: boolean;
}

export class UpdateRequestDelegationDto {
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  status?: 'active' | 'expired' | 'cancelled';
}

export class RetrieveRequestDelegationDto {
  @IsString()
  @IsNotEmpty()
  delegationId: string;
}

export class RequestTemplateDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEnum(RequestType)
  requestType: RequestType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsBoolean()
  signatureRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  storeIssuedDocs?: boolean;
}

export class UpdateVisibilityPolicyDto {
  @IsOptional()
  @IsString()
  restrictedVisibility?: string;

  @IsOptional()
  @IsBoolean()
  hideFromDirectory?: boolean;

  @IsOptional()
  @IsBoolean()
  logEveryView?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  completedRetentionYears?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  withdrawnRetentionMonths?: number;

  @IsOptional()
  @IsBoolean()
  hrAdminOnlyExport?: boolean;
}

export class RequestLogQueryDto {
  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  batch?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class RequestExportQueryDto {
  @IsOptional()
  @IsEnum(RequestType)
  requestType?: RequestType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  format?: 'csv' | 'json' | 'xlsx';
}

export class RequestStepActionPreviewDto {
  @IsEnum(RequestStepActionKind)
  action: RequestStepActionKind;
}

export class RequestAutofillQueryDto {
  @IsEnum(RequestType)
  requestType: RequestType;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class RetrieveDraftDto {
  @IsString()
  @IsNotEmpty()
  draftId: string;
}

export class RequestIdQueryDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;
}

export class TemplateIdQueryDto {
  @IsString()
  @IsNotEmpty()
  templateId: string;
}
