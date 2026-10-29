import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestType } from '../../setting/request-management/enum/request-management.enum';
import {
  CancelHireBeforeStartDateCreateRequestDto,
  ConfirmationRequestCreateRequestDto,
  EmployeeMobilityCreateRequestDto,
  EmployeeTerminationCreateRequestDto,
  EmploymentAgreementExtensionCreateRequestDto,
  EmploymentAgreementRenewalCreateRequestDto,
  PerformanceImprovementPlanCreateRequestDto,
  ProbationExtensionCreateRequestDto,
  QueryRequestCreateRequestDto,
  StaffDataUpdateCreateRequestDto,
} from './create';
import {
  EmployeeRequestStatus,
  EmployeeRequestStepAction,
} from '../enum/request.enum';

export type AddEmployeeRequestDto =
  | EmployeeTerminationCreateRequestDto
  | CancelHireBeforeStartDateCreateRequestDto
  | ConfirmationRequestCreateRequestDto
  | EmploymentAgreementExtensionCreateRequestDto
  | EmploymentAgreementRenewalCreateRequestDto
  | EmployeeMobilityCreateRequestDto
  | ProbationExtensionCreateRequestDto
  | StaffDataUpdateCreateRequestDto
  | PerformanceImprovementPlanCreateRequestDto
  | QueryRequestCreateRequestDto;

export class UpdateEmployeeRequestDto {
  @IsString({ message: 'Workflow ID must be a string.' })
  @IsOptional()
  workflowId?: string;

  @IsString({ message: 'Reason must be a string.' })
  @MaxLength(2000, { message: 'Reason must be at most 2000 characters.' })
  @IsOptional()
  reason?: string;

  @IsDateString({}, { message: 'Effective date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Effective date must be in YYYY-MM-DD format.',
  })
  @IsOptional()
  effectiveDate?: string;

  @IsDateString({}, { message: 'End date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'End date must be in YYYY-MM-DD format.',
  })
  @IsOptional()
  endDate?: string;

  @IsObject({ message: 'Details must be an object.' })
  @IsOptional()
  details?: Record<string, unknown>;

  @IsArray({ message: 'Attachment URLs must be an array.' })
  @ArrayUnique({ message: 'Attachment URLs must not contain duplicates.' })
  @ArrayMaxSize(20, { message: 'At most 20 attachments are allowed.' })
  @IsUrl(
    {},
    { each: true, message: 'One or more attachment URLs are invalid.' },
  )
  @IsOptional()
  attachmentUrls?: string[];
}

export class ListEmployeeRequestQueryDto {
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
  @IsEnum(RequestType, { message: 'Request type is not valid.' })
  requestType?: RequestType;

  @IsOptional()
  @IsEnum(EmployeeRequestStatus, { message: 'Status is not valid.' })
  status?: EmployeeRequestStatus;

  @IsOptional()
  @IsString({ message: 'Employee ID must be a string.' })
  employeeId?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Start date must be in YYYY-MM-DD format.',
  })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'End date must be in YYYY-MM-DD format.',
  })
  endDate?: string;
}

export class RetrieveEmployeeRequestDto {
  @IsString({ message: 'Request ID must be a string.' })
  @IsNotEmpty({ message: 'Request ID is required.' })
  requestId: string;
}

export class RetrieveRequestFormDto {
  @IsEnum(RequestType, { message: 'Request type is not valid.' })
  @IsNotEmpty({ message: 'Request type is required.' })
  requestType: RequestType;
}

export class CancelEmployeeRequestDto {
  @IsString({ message: 'Cancellation reason must be a string.' })
  @MaxLength(2000, {
    message: 'Cancellation reason must be at most 2000 characters.',
  })
  @IsOptional()
  reason?: string;
}

export class UpdateEmployeeRequestStepDto {
  @IsString({ message: 'Step ID must be a string.' })
  @IsNotEmpty({ message: 'Step ID is required.' })
  stepId: string;

  @IsEnum(EmployeeRequestStepAction, { message: 'Action is not valid.' })
  @IsNotEmpty({ message: 'Action is required.' })
  action: EmployeeRequestStepAction;

  @IsString({ message: 'Comment must be a string.' })
  @MaxLength(2000, { message: 'Comment must be at most 2000 characters.' })
  @IsOptional()
  comment?: string;
}
