import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PerformanceIssue } from './form-option.enums';

export class PerformanceImprovementPlanDetailsDto {
  @IsEnum(PerformanceIssue, {
    message: 'Performance issue is not valid.',
  })
  @IsNotEmpty({ message: 'Performance issue is required.' })
  performanceIssue: PerformanceIssue;

  @IsString({ message: 'Improvement action plan must be a string.' })
  @IsNotEmpty({ message: 'Improvement action plan is required.' })
  @Matches(/\S/, { message: 'Improvement action plan is required.' })
  @MaxLength(2000, {
    message: 'Improvement action plan must be at most 2000 characters.',
  })
  improvementActionPlan: string;

  @IsDateString(
    {},
    { message: 'Timeline for completion must be a valid date.' },
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Timeline for completion must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Timeline for completion is required.' })
  completionTimeline: string;
}
