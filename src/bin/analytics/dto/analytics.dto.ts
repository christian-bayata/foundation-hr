import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  EmployeeStatus,
  EmployeeType,
  JobType,
  WorkMode,
} from '../../employee/enum/employee.enum';
import { OnboardingStatus } from '../../onboarding/enum/onboarding-status.enum';
import { LeaveRequestStatus } from '../../leave/enum/leave.enum';
import { ExitRequestStatus } from '../../offboarding/enum/offboarding.enum';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AnalyticsBaseQueryDto {
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

  @IsOptional()
  @IsString({ message: 'Job title code must be a string.' })
  jobTitleCode?: string;
}

export class AnalyticsDateRangeQueryDto extends AnalyticsBaseQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date.' })
  @Matches(DATE_PATTERN, {
    message: 'Start date must be in YYYY-MM-DD format.',
  })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date.' })
  @Matches(DATE_PATTERN, {
    message: 'End date must be in YYYY-MM-DD format.',
  })
  endDate?: string;
}

export class EmployeeAnalysisQueryDto extends AnalyticsDateRangeQueryDto {
  @IsOptional()
  @IsEnum(EmployeeStatus, { message: 'Status is not valid.' })
  status?: EmployeeStatus;

  @IsOptional()
  @IsEnum(EmployeeType, { message: 'Employee type is not valid.' })
  employeeType?: EmployeeType;

  @IsOptional()
  @IsEnum(JobType, { message: 'Job type is not valid.' })
  jobType?: JobType;

  @IsOptional()
  @IsEnum(WorkMode, { message: 'Work mode is not valid.' })
  workMode?: WorkMode;

  @IsOptional()
  @IsString({ message: 'Location must be a string.' })
  location?: string;
}

export class OnboardingAnalysisQueryDto extends AnalyticsDateRangeQueryDto {
  @IsOptional()
  @IsEnum(OnboardingStatus, { message: 'Status is not valid.' })
  status?: OnboardingStatus;
}

export class LeaveAnalysisQueryDto extends AnalyticsDateRangeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Year must be an integer.' })
  @Min(2000, { message: 'Year must be at least 2000.' })
  @Max(2100, { message: 'Year must be at most 2100.' })
  year?: number;

  @IsOptional()
  @IsString({ message: 'Leave category id must be a string.' })
  leaveCategoryId?: string;

  @IsOptional()
  @IsEnum(LeaveRequestStatus, { message: 'Status is not valid.' })
  status?: LeaveRequestStatus;
}

export class OffboardingAnalysisQueryDto extends AnalyticsDateRangeQueryDto {
  @IsOptional()
  @IsEnum(ExitRequestStatus, { message: 'Status is not valid.' })
  status?: ExitRequestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Upcoming days must be an integer.' })
  @Min(1, { message: 'Upcoming days must be at least 1.' })
  @Max(365, { message: 'Upcoming days must be at most 365.' })
  upcomingDays?: number;

  @IsOptional()
  @IsString({ message: 'Employee id must be a string.' })
  employeeId?: string;
}
