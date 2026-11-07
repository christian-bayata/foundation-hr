import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  GoalFrequency,
  GoalLevel,
  GoalPerspective,
  KpiType,
} from '../enums/goal.enums';

export class CreateGoalDto {
  @IsNotEmpty({ message: 'Cycle id is required.' })
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId: string;

  @IsOptional()
  @IsString({ message: 'Goal plan id must be a string.' })
  goalPlanId?: string;

  @IsNotEmpty({ message: 'Level is required.' })
  @IsEnum(GoalLevel, { message: 'Level is not valid.' })
  level: GoalLevel;

  @IsOptional()
  @IsString({ message: 'Department id must be a string.' })
  departmentId?: string;

  @IsOptional()
  @IsString({ message: 'Employee id must be a string.' })
  employeeId?: string;

  @IsNotEmpty({ message: 'Perspective is required.' })
  @IsEnum(GoalPerspective, { message: 'Perspective is not valid.' })
  perspective: GoalPerspective;

  @IsNotEmpty({ message: 'Goal title is required.' })
  @IsString({ message: 'Goal title must be a string.' })
  @MaxLength(160, { message: 'Goal title must be at most 160 characters.' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @MaxLength(2000, { message: 'Description must be at most 2000 characters.' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Key measures must be a string.' })
  @MaxLength(2000, { message: 'Key measures must be at most 2000 characters.' })
  keyMeasures?: string;

  @IsOptional()
  @IsString({ message: 'KPI metric id must be a string.' })
  kpiMetricId?: string;

  @IsOptional()
  @IsString({ message: 'KPI metric must be a string.' })
  @MaxLength(160, { message: 'KPI metric must be at most 160 characters.' })
  kpiMetric?: string;

  @IsOptional()
  @IsEnum(KpiType, { message: 'KPI type is not valid.' })
  kpiType?: KpiType;

  @IsNotEmpty({ message: 'Target is required.' })
  @IsString({ message: 'Target must be a string.' })
  @MaxLength(120, { message: 'Target must be at most 120 characters.' })
  target: string;

  @IsOptional()
  @IsString({ message: 'Target unit must be a string.' })
  @MaxLength(40, { message: 'Target unit must be at most 40 characters.' })
  targetUnit?: string;

  @IsNotEmpty({ message: 'Weightage is required.' })
  @Min(0, { message: 'Weightage must be at least 0.' })
  @Max(100, { message: 'Weightage must be at most 100.' })
  weightage: number;

  @IsNotEmpty({ message: 'Frequency is required.' })
  @IsEnum(GoalFrequency, { message: 'Frequency is not valid.' })
  frequency: GoalFrequency;

  @IsOptional()
  @IsString({ message: 'Aligned organisation goal id must be a string.' })
  alignedOrganisationGoalId?: string;

  @IsOptional()
  @IsString({ message: 'Aligned department goal id must be a string.' })
  alignedDepartmentGoalId?: string;
}
