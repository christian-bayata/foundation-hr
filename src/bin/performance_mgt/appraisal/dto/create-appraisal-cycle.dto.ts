import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AppraisalReviewType,
  AppraisalTargetPopulation,
} from '../enums/appraisal.enums';

export class CreateAppraisalCycleDto {
  @IsNotEmpty({ message: 'Cycle name is required.' })
  @IsString({ message: 'Cycle name must be a string.' })
  @MaxLength(160, { message: 'Cycle name must be at most 160 characters.' })
  name: string;

  @IsNotEmpty({ message: 'Cycle code is required.' })
  @IsString({ message: 'Cycle code must be a string.' })
  @MaxLength(60, { message: 'Cycle code must be at most 60 characters.' })
  code: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @MaxLength(2000, {
    message: 'Description must be at most 2000 characters.',
  })
  description?: string;

  @IsNotEmpty({ message: 'Review type is required.' })
  @IsEnum(AppraisalReviewType, { message: 'Review type is not valid.' })
  reviewType: AppraisalReviewType;

  @IsNotEmpty({ message: 'Performance year is required.' })
  @Type(() => Number)
  @IsInt({ message: 'Performance year must be an integer.' })
  @Min(2000, { message: 'Performance year must be at least 2000.' })
  @Max(2200, { message: 'Performance year must be at most 2200.' })
  performanceYear: number;

  @IsNotEmpty({ message: 'Start date is required.' })
  @IsDateString({}, { message: 'Start date must be a valid date.' })
  startDate: string;

  @IsNotEmpty({ message: 'End date is required.' })
  @IsDateString({}, { message: 'End date must be a valid date.' })
  endDate: string;

  @IsNotEmpty({ message: 'Self-assessment due date is required.' })
  @IsDateString({}, { message: 'Self-assessment due date must be valid.' })
  selfAssessmentDueDate: string;

  @IsNotEmpty({ message: 'Manager review due date is required.' })
  @IsDateString({}, { message: 'Manager review due date must be valid.' })
  managerReviewDueDate: string;

  @IsNotEmpty({ message: 'Final review due date is required.' })
  @IsDateString({}, { message: 'Final review due date must be valid.' })
  finalReviewDueDate: string;

  @IsNotEmpty({ message: 'Results publication date is required.' })
  @IsDateString({}, { message: 'Results publication date must be valid.' })
  resultsPublicationDate: string;

  @IsOptional()
  @IsEnum(AppraisalTargetPopulation, {
    message: 'Target population is not valid.',
  })
  targetPopulation?: AppraisalTargetPopulation;

  @IsOptional()
  @IsBoolean({ message: 'Include all departments must be a boolean.' })
  includeAllDepartments?: boolean;

  @IsOptional()
  @IsArray({ message: 'Department ids must be an array.' })
  @ArrayUnique({ message: 'Department ids must be unique.' })
  @IsString({ each: true, message: 'Each department id must be a string.' })
  departmentIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Department codes must be an array.' })
  @ArrayUnique({ message: 'Department codes must be unique.' })
  @IsString({ each: true, message: 'Each department code must be a string.' })
  departmentCodes?: string[];

  @IsOptional()
  @IsArray({ message: 'Job title codes must be an array.' })
  @ArrayUnique({ message: 'Job title codes must be unique.' })
  @IsString({ each: true, message: 'Each job title code must be a string.' })
  jobTitleCodes?: string[];

  @IsOptional()
  @IsArray({ message: 'Competency framework ids must be an array.' })
  @IsString({
    each: true,
    message: 'Each competency framework id must be a string.',
  })
  competencyFrameworkIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Competency framework names must be an array.' })
  @IsString({
    each: true,
    message: 'Each competency framework name must be a string.',
  })
  competencyFrameworkNames?: string[];

  @IsOptional()
  @IsString({ message: 'Workflow template id must be a string.' })
  workflowTemplateId?: string;

  @IsOptional()
  @IsString({ message: 'Workflow template name must be a string.' })
  workflowTemplateName?: string;

  @IsOptional()
  @IsBoolean({ message: 'Save as draft must be a boolean.' })
  saveAsDraft?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Activate must be a boolean.' })
  activate?: boolean;
}
