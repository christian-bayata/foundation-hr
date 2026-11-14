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
  CalibrationParticipantTab,
  CalibrationPerformanceLevel,
  CalibrationPotential,
  CalibrationTimeInBox,
} from '../../appraisal/enums/appraisal.enums';

export class ListCalibrationParticipantsQueryDto {
  @IsString({ message: 'Session id is required.' })
  sessionId: string;

  @IsOptional()
  @IsEnum(CalibrationParticipantTab, { message: 'Tab is not valid.' })
  tab?: CalibrationParticipantTab;

  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'Department code must be a string.' })
  departmentCode?: string;

  @IsOptional()
  @IsString({ message: 'Manager id must be a string.' })
  managerId?: string;

  @IsOptional()
  @IsString({ message: 'Calibrated band must be a string.' })
  calibratedBand?: string;

  @IsOptional()
  @IsEnum(CalibrationPerformanceLevel, {
    message: 'Performance level is not valid.',
  })
  performanceLevel?: CalibrationPerformanceLevel;

  @IsOptional()
  @IsEnum(CalibrationPotential, { message: 'Potential is not valid.' })
  potential?: CalibrationPotential;

  @IsOptional()
  @IsString({ message: 'Box key must be a string.' })
  boxKey?: string;

  @IsOptional()
  @IsEnum(CalibrationTimeInBox, { message: 'Time in box is not valid.' })
  timeInBox?: CalibrationTimeInBox;

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
