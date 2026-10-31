import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EmployeeRequestStepAction } from '../../request/enum/request.enum';
import { TerminationType } from '../../request/dto/forms/form-option.enums';
import {
  ExitChecklistKind,
  ExitRequestStatus,
} from '../enum/offboarding.enum';

export class ListExitRequestQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Batch must be an integer.' })
  @Min(1, { message: 'Batch must be at least 1.' })
  batch?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  @Max(100, { message: 'Limit must be at most 100.' })
  limit?: number;

  @IsOptional()
  @IsEnum(ExitRequestStatus, { message: 'Status is not valid.' })
  status?: ExitRequestStatus;

  @IsOptional()
  @IsString({ message: 'Employee id must be a string.' })
  employeeId?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Last working day from must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Last working day from must be in YYYY-MM-DD format.',
  })
  lastWorkingDayFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Last working day to must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Last working day to must be in YYYY-MM-DD format.',
  })
  lastWorkingDayTo?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Requested from must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Requested from must be in YYYY-MM-DD format.',
  })
  requestedFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Requested to must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Requested to must be in YYYY-MM-DD format.',
  })
  requestedTo?: string;
}

export class RetrieveExitRequestDto {
  @IsString({ message: 'Exit request id must be a string.' })
  @IsNotEmpty({ message: 'Exit request id is required.' })
  requestId: string;
}

export class InitiateExitRequestDto {
  @IsString({ message: 'Employee id must be a string.' })
  @IsNotEmpty({ message: 'Employee id is required.' })
  employeeId: string;

  @IsString({ message: 'Off-boarding type id must be a string.' })
  @IsNotEmpty({ message: 'Off-boarding type id is required.' })
  offboardingTypeId: string;

  @IsString({ message: 'Exit reason id must be a string.' })
  @IsNotEmpty({ message: 'Exit reason id is required.' })
  exitReasonId: string;

  @IsDateString({}, { message: 'Last working day must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Last working day must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Last working day is required.' })
  lastWorkingDay: string;

  @IsOptional()
  @IsEnum(TerminationType, { message: 'Termination type is not valid.' })
  terminationType?: TerminationType;

  @IsOptional()
  @IsString({ message: 'Reason for termination must be a string.' })
  @MaxLength(2000, {
    message: 'Reason for termination must be at most 2000 characters.',
  })
  reasonForTermination?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Exit interview date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Exit interview date must be in YYYY-MM-DD format.',
  })
  exitInterviewDate?: string;

  @IsOptional()
  @IsString({ message: 'Workflow id must be a string.' })
  workflowId?: string;

  @IsOptional()
  @IsArray({ message: 'Checklist item ids must be an array.' })
  @ArrayUnique({ message: 'Checklist item ids must not contain duplicates.' })
  @ArrayMaxSize(100, { message: 'At most 100 checklist items are allowed.' })
  @IsString({ each: true, message: 'One or more checklist item ids are invalid.' })
  checklistItemIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Compliance checklist item ids must be an array.' })
  @ArrayUnique({
    message: 'Compliance checklist item ids must not contain duplicates.',
  })
  @ArrayMaxSize(100, {
    message: 'At most 100 compliance checklist items are allowed.',
  })
  @IsString({
    each: true,
    message: 'One or more compliance checklist item ids are invalid.',
  })
  complianceChecklistItemIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Attachment URLs must be an array.' })
  @ArrayUnique({ message: 'Attachment URLs must not contain duplicates.' })
  @ArrayMaxSize(20, { message: 'At most 20 attachments are allowed.' })
  @IsUrl({}, { each: true, message: 'One or more attachment URLs are invalid.' })
  attachmentUrls?: string[];
}

export class UpdateExitRequestDto extends RetrieveExitRequestDto {
  @IsOptional()
  @IsString({ message: 'Off-boarding type id must be a string.' })
  offboardingTypeId?: string;

  @IsOptional()
  @IsString({ message: 'Exit reason id must be a string.' })
  exitReasonId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Last working day must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Last working day must be in YYYY-MM-DD format.',
  })
  lastWorkingDay?: string;

  @IsOptional()
  @IsEnum(TerminationType, { message: 'Termination type is not valid.' })
  terminationType?: TerminationType;

  @IsOptional()
  @IsString({ message: 'Reason for termination must be a string.' })
  @MaxLength(2000, {
    message: 'Reason for termination must be at most 2000 characters.',
  })
  reasonForTermination?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Exit interview date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Exit interview date must be in YYYY-MM-DD format.',
  })
  exitInterviewDate?: string;

  @IsOptional()
  @IsString({ message: 'Workflow id must be a string.' })
  workflowId?: string;

  @IsOptional()
  @IsArray({ message: 'Checklist item ids must be an array.' })
  @ArrayUnique({ message: 'Checklist item ids must not contain duplicates.' })
  @ArrayMaxSize(100, { message: 'At most 100 checklist items are allowed.' })
  @IsString({ each: true, message: 'One or more checklist item ids are invalid.' })
  checklistItemIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Compliance checklist item ids must be an array.' })
  @ArrayUnique({
    message: 'Compliance checklist item ids must not contain duplicates.',
  })
  @ArrayMaxSize(100, {
    message: 'At most 100 compliance checklist items are allowed.',
  })
  @IsString({
    each: true,
    message: 'One or more compliance checklist item ids are invalid.',
  })
  complianceChecklistItemIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Attachment URLs must be an array.' })
  @ArrayUnique({ message: 'Attachment URLs must not contain duplicates.' })
  @ArrayMaxSize(20, { message: 'At most 20 attachments are allowed.' })
  @IsUrl({}, { each: true, message: 'One or more attachment URLs are invalid.' })
  attachmentUrls?: string[];
}

export class UpdateExitRequestStepDto extends RetrieveExitRequestDto {
  @IsString({ message: 'Step id must be a string.' })
  @IsNotEmpty({ message: 'Step id is required.' })
  stepId: string;

  @IsEnum(EmployeeRequestStepAction, { message: 'Action is not valid.' })
  @IsNotEmpty({ message: 'Action is required.' })
  action: EmployeeRequestStepAction;

  @IsOptional()
  @IsString({ message: 'Comment must be a string.' })
  @MaxLength(2000, { message: 'Comment must be at most 2000 characters.' })
  comment?: string;
}

export class CancelExitRequestDto extends RetrieveExitRequestDto {
  @IsOptional()
  @IsString({ message: 'Cancellation reason must be a string.' })
  @MaxLength(2000, {
    message: 'Cancellation reason must be at most 2000 characters.',
  })
  reason?: string;
}

export class UpdateExitChecklistDto extends RetrieveExitRequestDto {
  @IsEnum(ExitChecklistKind, { message: 'Checklist kind is not valid.' })
  @IsNotEmpty({ message: 'Checklist kind is required.' })
  kind: ExitChecklistKind;

  @IsString({ message: 'Checklist item id must be a string.' })
  @IsNotEmpty({ message: 'Checklist item id is required.' })
  itemId: string;

  @IsBoolean({ message: 'Completed must be a boolean.' })
  completed: boolean;
}

export class UpdateExitDocumentDto extends RetrieveExitRequestDto {
  @IsString({ message: 'Document id must be a string.' })
  @IsNotEmpty({ message: 'Document id is required.' })
  documentId: string;

  @IsOptional()
  @IsBoolean({ message: 'Completed must be a boolean.' })
  completed?: boolean;

  @IsOptional()
  @IsUrl({}, { message: 'Attachment URL is invalid.' })
  attachmentUrl?: string;

  @IsOptional()
  @IsBoolean({ message: 'Signed must be a boolean.' })
  signed?: boolean;
}

export class CompleteExitRequestDto extends RetrieveExitRequestDto {}

export class ExitSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Upcoming days must be an integer.' })
  @Min(1, { message: 'Upcoming days must be at least 1.' })
  @Max(365, { message: 'Upcoming days must be at most 365.' })
  upcomingDays?: number;
}
