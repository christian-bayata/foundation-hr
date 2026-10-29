import {
  ArrayMaxSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { RequestType } from '../../../setting/request-management/enum/request-management.enum';

type Constructor<T = object> = new (...args: any[]) => T;

export function withCreateRequestMetadata<TBase extends Constructor>(
  Base: TBase,
  requestType: RequestType,
) {
  class CreateRequestMetadataDto extends Base {
    @Equals(requestType, { message: 'Request type is not valid.' })
    requestType: RequestType;

    @IsString({ message: 'Employee ID must be a string.' })
    @IsOptional()
    employeeId?: string;

    @IsString({ message: 'Department must be a string.' })
    @IsOptional()
    department?: string;

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

  return CreateRequestMetadataDto;
}

export function withFullEmployeeContext<TBase extends Constructor>(
  Base: TBase,
) {
  class FullEmployeeContextDto extends Base {
    @IsString({ message: 'Employee name must be a string.' })
    @IsOptional()
    employeeId?: string;

    @IsString({ message: 'Job title must be a string.' })
    @IsOptional()
    jobTitle?: string;

    @IsString({ message: 'Line manager ID must be a string.' })
    @IsOptional()
    lineManagerId?: string;
  }

  return FullEmployeeContextDto;
}
