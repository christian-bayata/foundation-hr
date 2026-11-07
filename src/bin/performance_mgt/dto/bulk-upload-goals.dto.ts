import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { GoalLevel } from '../enums/goal.enums';

export class GoalSummaryQueryDto {
  @IsNotEmpty({ message: 'Cycle id is required.' })
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId: string;

  @IsOptional()
  @IsString({ message: 'Department id must be a string.' })
  departmentId?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  batch?: number;

  @IsOptional()
  limit?: number;
}

export class BulkUploadGoalsDto {
  @IsNotEmpty({ message: 'Cycle id is required.' })
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId: string;

  @IsNotEmpty({ message: 'Level is required.' })
  @IsEnum(GoalLevel, { message: 'Level is not valid.' })
  level: GoalLevel;

  @IsOptional()
  @IsString({ message: 'Goal plan id must be a string.' })
  goalPlanId?: string;

  @IsOptional()
  @IsString({ message: 'Department id must be a string.' })
  departmentId?: string;

  @IsOptional()
  @IsString({ message: 'Employee id must be a string.' })
  employeeId?: string;
}
