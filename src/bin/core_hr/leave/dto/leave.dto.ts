import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LeaveRequestStatus } from '../enum/leave.enum';

export class ListLeaveRequestQueryDto {
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
  @IsEnum(LeaveRequestStatus, { message: 'Status is not valid.' })
  status?: LeaveRequestStatus;

  @IsOptional()
  @IsString({ message: 'Leave category id must be a string.' })
  leaveCategoryId?: string;

  @IsOptional()
  @IsString({ message: 'Employee id must be a string.' })
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

export class RetrieveLeaveRequestDto {
  @IsString({ message: 'Leave request id must be a string.' })
  @IsNotEmpty({ message: 'Leave request id is required.' })
  leaveRequestId: string;
}

export class ApproveLeaveRequestDto extends RetrieveLeaveRequestDto {
  @IsString({ message: 'Comment must be a string.' })
  @MaxLength(2000, { message: 'Comment must be at most 2000 characters.' })
  @IsOptional()
  comment?: string;
}

export class RejectLeaveRequestDto extends RetrieveLeaveRequestDto {
  @IsString({ message: 'Rejection reason must be a string.' })
  @IsNotEmpty({ message: 'Rejection reason is required.' })
  @MaxLength(2000, {
    message: 'Rejection reason must be at most 2000 characters.',
  })
  reason: string;

  @IsString({ message: 'Comment must be a string.' })
  @MaxLength(2000, { message: 'Comment must be at most 2000 characters.' })
  @IsOptional()
  comment?: string;
}

export class LeaveSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Year must be an integer.' })
  @Min(2000, { message: 'Year must be at least 2000.' })
  @Max(2100, { message: 'Year must be at most 2100.' })
  year?: number;

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
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'Department code must be a string.' })
  departmentCode?: string;
}
