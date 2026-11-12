import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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
  FeedbackCycleStatus,
  RespondentType,
} from '../enums/360-feedback.enums';

export class Create360FeedbackCycleDto {
  @IsNotEmpty({ message: 'Session name is required.' })
  @IsString({ message: 'Session name must be a string.' })
  @MaxLength(160, { message: 'Session name must be at most 160 characters.' })
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

  @IsOptional()
  @IsString({ message: 'Business unit must be a string.' })
  @MaxLength(160, { message: 'Business unit must be at most 160 characters.' })
  businessUnit?: string;

  @IsOptional()
  @IsString({ message: 'Session owner must be a string.' })
  @MaxLength(160, { message: 'Session owner must be at most 160 characters.' })
  sessionOwner?: string;

  @IsNotEmpty({ message: 'Start date is required.' })
  @IsDateString({}, { message: 'Start date must be a valid date.' })
  startDate: string;

  @IsNotEmpty({ message: 'End date is required.' })
  @IsDateString({}, { message: 'End date must be a valid date.' })
  endDate: string;

  @IsNotEmpty({ message: 'Nomination due date is required.' })
  @IsDateString({}, { message: 'Nomination due date must be valid.' })
  nominationDueDate: string;

  @IsNotEmpty({ message: 'Feedback due date is required.' })
  @IsDateString({}, { message: 'Feedback due date must be valid.' })
  feedbackDueDate: string;

  @IsNotEmpty({ message: 'Results publication date is required.' })
  @IsDateString({}, { message: 'Results publication date must be valid.' })
  resultsPublicationDate: string;

  @IsOptional()
  @IsEnum(FeedbackCycleStatus, { message: 'Cycle status is not valid.' })
  status?: FeedbackCycleStatus;

  @IsOptional()
  @IsEnum(RespondentType, { message: 'Primary respondent type is not valid.' })
  primaryRespondentType?: RespondentType;

  @IsOptional()
  @IsArray({ message: 'Respondent types must be an array.' })
  @ArrayMinSize(1, { message: 'At least one respondent type is required.' })
  @ArrayMaxSize(20, { message: 'At most 20 respondent types are allowed.' })
  @ArrayUnique({ message: 'Respondent types must be unique.' })
  @IsEnum(RespondentType, { each: true, message: 'Each respondent type is not valid.' })
  respondentTypes?: RespondentType[];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Max nominations must be an integer.' })
  @Min(1, { message: 'Max nominations must be at least 1.' })
  @Max(20, { message: 'Max nominations must be at most 20.' })
  maxNominations?: number;

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
  @IsBoolean({ message: 'Save as draft must be a boolean.' })
  saveAsDraft?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Activate must be a boolean.' })
  activate?: boolean;
}
