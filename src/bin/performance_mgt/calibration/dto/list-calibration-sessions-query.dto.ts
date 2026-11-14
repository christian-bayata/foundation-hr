import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CalibrationModel,
  CalibrationSessionStatus,
} from '../../appraisal/enums/appraisal.enums';

export class ListCalibrationSessionsQueryDto {
  @IsOptional()
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  @IsEnum(CalibrationSessionStatus, { message: 'Status is not valid.' })
  status?: CalibrationSessionStatus;

  @IsOptional()
  @IsEnum(CalibrationModel, { message: 'Calibration model is not valid.' })
  model?: CalibrationModel;

  @IsOptional()
  @IsString({ message: 'Department code must be a string.' })
  departmentCode?: string;

  @IsOptional()
  @IsString({ message: 'Owner id must be a string.' })
  ownerId?: string;

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

  @IsOptional()
  @IsString({ message: 'Sort by must be a string.' })
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'Sort order must be asc or desc.' })
  sortOrder?: 'asc' | 'desc';
}
