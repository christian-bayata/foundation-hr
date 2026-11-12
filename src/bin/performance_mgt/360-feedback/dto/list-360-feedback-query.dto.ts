import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FeedbackStatus } from '../enums/360-feedback.enums';

export class List360FeedbackQueryDto {
  @IsOptional()
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId?: string;

  @IsOptional()
  @IsString({ message: 'Subject employee id must be a string.' })
  subjectEmployeeId?: string;

  @IsOptional()
  @IsString({ message: 'Respondent id must be a string.' })
  respondentId?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  @IsEnum(FeedbackStatus, { message: 'Status is not valid.' })
  status?: FeedbackStatus;

  @IsOptional()
  @IsString({ message: 'Sort by must be a string.' })
  sortBy?: string;

  @IsOptional()
  @IsString({ message: 'Sort order must be a string.' })
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
