import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { GoalFrequency, GoalPerspective, GoalStatus, KpiType } from '../enums/goal.enums';

export class ListGoalsQueryDto {
  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  @IsEnum(GoalPerspective, { message: 'Perspective is not valid.' })
  perspective?: GoalPerspective;

  @IsOptional()
  @IsEnum(KpiType, { message: 'KPI type is not valid.' })
  kpiType?: KpiType;

  @IsOptional()
  @IsString({ message: 'KPI metric must be a string.' })
  kpiMetric?: string;

  @IsOptional()
  @IsEnum(GoalFrequency, { message: 'Frequency is not valid.' })
  frequency?: GoalFrequency;

  @IsOptional()
  @IsEnum(GoalStatus, { message: 'Status is not valid.' })
  status?: GoalStatus;

  @IsOptional()
  @IsString({ message: 'Sort by must be a string.' })
  sortBy?: string;

  @IsOptional()
  @IsString({ message: 'Sort order must be asc or desc.' })
  sortOrder?: string;

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
}
