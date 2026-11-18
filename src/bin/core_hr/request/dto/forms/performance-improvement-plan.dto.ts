import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AreaOfConcern, PerformanceIssue } from './form-option.enums';
export class PerformanceImprovementPlanDetailsDto {
  @IsEnum(PerformanceIssue, { message: 'Performance issue is not valid.' })
  @IsNotEmpty({ message: 'Performance issue is required.' })
  @IsOptional()
  performanceIssue?: PerformanceIssue;

  @IsString({ message: 'Improvement action plan must be a string.' })
  @Matches(/\S/, { message: 'Improvement action plan is required.' })
  @MaxLength(2000, {
    message: 'Improvement action plan must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'Improvement action plan is required.' })
  @IsOptional()
  improvementActionPlan?: string;

  @IsDateString(
    {},
    { message: 'Timeline for completion must be a valid date.' },
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Timeline for completion must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Timeline for completion is required.' })
  @IsOptional()
  completionTimeline?: string;

  @IsEnum(AreaOfConcern, { message: 'Area of concern is not valid.' })
  @IsNotEmpty({ message: 'Area of concern is required.' })
  @IsOptional()
  areaOfConcern?: AreaOfConcern;

  @IsString({ message: 'Objectives must be a string.' })
  @Matches(/\S/, { message: 'Objectives is required.' })
  @MaxLength(2000, { message: 'Objectives must be at most 2000 characters.' })
  @IsNotEmpty({ message: 'Objectives is required.' })
  @IsOptional()
  objectives?: string;

  @IsString({ message: 'Support provided must be a string.' })
  @Matches(/\S/, { message: 'Support provided is required.' })
  @MaxLength(2000, {
    message: 'Support provided must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'Support provided is required.' })
  @IsOptional()
  supportProvided?: string;

  @IsDateString({}, { message: 'Review date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Review date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Review date is required.' })
  @IsOptional()
  reviewDate?: string;

  @IsString({ message: 'Background must be a string.' })
  @MaxLength(2000, { message: 'Background must be at most 2000 characters.' })
  @IsOptional()
  background?: string;
}
