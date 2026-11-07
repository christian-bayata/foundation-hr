import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { GoalPlanStatus, GoalPlanType, TargetPopulation } from '../enums/goal.enums';

export class GoalPlanDto {
  @IsNotEmpty({ message: 'Plan name is required.' })
  @IsString({ message: 'Plan name must be a string.' })
  @MaxLength(160, { message: 'Plan name must be at most 160 characters.' })
  name: string;

  @IsNotEmpty({ message: 'Plan code is required.' })
  @IsString({ message: 'Plan code must be a string.' })
  @MaxLength(60, { message: 'Plan code must be at most 60 characters.' })
  code: string;

  @IsNotEmpty({ message: 'Goal type is required.' })
  @IsEnum(GoalPlanType, { message: 'Goal type is not valid.' })
  goalType: GoalPlanType;

  @IsNotEmpty({ message: 'Performance year is required.' })
  @IsNumber({}, { message: 'Performance year must be a number.' })
  performanceYear: number;

  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @MaxLength(1000, { message: 'Description must be at most 1000 characters.' })
  description?: string;

  @IsNotEmpty({ message: 'Target population is required.' })
  @IsEnum(TargetPopulation, { message: 'Target population is not valid.' })
  targetPopulation: TargetPopulation;

  @IsOptional()
  departmentIds?: string[];

  @IsOptional()
  framework?: string[];

  @IsOptional()
  @IsString({ message: 'Approval workflow must be a string.' })
  approvalWorkflow?: string;

  @IsOptional()
  @IsEnum(GoalPlanStatus, { message: 'Status is not valid.' })
  status?: GoalPlanStatus;
}
