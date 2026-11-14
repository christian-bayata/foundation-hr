import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CalibrationModel,
  CalibrationSessionStatus,
} from '../../appraisal/enums/appraisal.enums';
import { CalibrationBandTargetDto } from './calibration-band-target.dto';

export class CreateCalibrationSessionDto {
  @IsNotEmpty({ message: 'Cycle id is required.' })
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId: string;

  @IsNotEmpty({ message: 'Session name is required.' })
  @IsString({ message: 'Session name must be a string.' })
  @MaxLength(160, { message: 'Session name must be at most 160 characters.' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @MaxLength(2000, {
    message: 'Description must be at most 2000 characters.',
  })
  description?: string;

  @IsOptional()
  @IsEnum(CalibrationModel, { message: 'Calibration model is not valid.' })
  model?: CalibrationModel;

  @IsOptional()
  @IsString({ message: 'Session owner id must be a string.' })
  sessionOwnerId?: string;

  @IsOptional()
  @IsString({ message: 'Session owner name must be a string.' })
  sessionOwnerName?: string;

  @IsOptional()
  @IsString({ message: 'Department code must be a string.' })
  departmentCode?: string;

  @IsOptional()
  @IsArray({ message: 'Department ids must be an array.' })
  @ArrayUnique({ message: 'Department ids must be unique.' })
  @IsString({ each: true, message: 'Department ids must be strings.' })
  departmentIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Department codes must be an array.' })
  @ArrayUnique({ message: 'Department codes must be unique.' })
  @IsString({ each: true, message: 'Department codes must be strings.' })
  departmentCodes?: string[];

  @IsOptional()
  @IsBoolean({ message: 'Include all departments must be a boolean.' })
  includeAllDepartments?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date.' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date.' })
  endsAt?: string;

  @IsOptional()
  @IsEnum(CalibrationSessionStatus, { message: 'Status is not valid.' })
  status?: CalibrationSessionStatus;

  @IsOptional()
  @IsBoolean({
    message: 'Guided distribution enabled must be a boolean.',
  })
  guidedDistributionEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tolerance percent must be a number.' })
  @Min(0, { message: 'Tolerance percent must be at least 0.' })
  @Max(100, { message: 'Tolerance percent must be at most 100.' })
  tolerancePercent?: number;

  @IsOptional()
  @IsArray({ message: 'Target distribution must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => CalibrationBandTargetDto)
  targetDistribution?: CalibrationBandTargetDto[];
}
