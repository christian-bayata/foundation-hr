import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DueDate } from '../../setting/employee-profiles/enum/employee-profile.enum';
import { OnboardingStatus } from '../enum/onboarding-status.enum';

export class CompletionRequirementTaskDto {
  @IsString({ message: 'Task step must be a string.' })
  @IsNotEmpty({ message: 'Task step is required.' })
  step: string;

  @IsBoolean({ message: 'isCompleted must be a boolean.' })
  isCompleted: boolean;
}

export class AddEmployeeOnboardingDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'Employee ID is required.' })
  employeeId: string;
}

export class UpdateEmployeeOnboardingStepDto {
  @IsString({ message: 'Step ID must be a string.' })
  @IsNotEmpty({ message: 'Step ID is required.' })
  stepId: string;

  @IsBoolean({ message: 'isCompleted must be a boolean.' })
  isCompleted: boolean;

  @IsEnum(DueDate, { message: 'Due date is not valid.' })
  @IsOptional()
  dueDate?: DueDate;

  @IsArray({ message: 'Completion requirements must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => CompletionRequirementTaskDto)
  @IsNotEmpty({ message: 'Completion requirements are required.' })
  completionRequirements: CompletionRequirementTaskDto[];
}

export class RetrieveEmployeeOnboardingDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'Employee ID is required.' })
  employeeId: string;
}

export class ListEmployeeOnboardingQueryDto {
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
  @IsString({ message: 'Role must be a string.' })
  role?: string;

  @IsOptional()
  @IsEnum(OnboardingStatus, { message: 'Status is not valid.' })
  status?: OnboardingStatus;

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
