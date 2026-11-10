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
import {
  AppraisalRatingTag,
  AppraisalStatus,
} from '../enums/appraisal.enums';

export class ListAppraisalsQueryDto {
  @IsOptional()
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'Role must be a string.' })
  role?: string;

  @IsOptional()
  @IsString({ message: 'Department code must be a string.' })
  departmentCode?: string;

  @IsOptional()
  @IsString({ message: 'Department id must be a string.' })
  departmentId?: string;

  @IsOptional()
  @IsEnum(AppraisalStatus, { message: 'Status is not valid.' })
  status?: AppraisalStatus;

  @IsOptional()
  @IsEnum(AppraisalRatingTag, { message: 'Rating tag is not valid.' })
  ratingTag?: AppraisalRatingTag;

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
