import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CalibrationSessionStatus } from '../enums/appraisal.enums';

export class CreateCalibrationSessionDto {
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
  @IsString({ message: 'Session owner id must be a string.' })
  sessionOwnerId?: string;

  @IsOptional()
  @IsString({ message: 'Session owner name must be a string.' })
  sessionOwnerName?: string;

  @IsOptional()
  @IsString({ message: 'Department code must be a string.' })
  departmentCode?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date.' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date.' })
  endsAt?: string;

  @IsOptional()
  @IsEnum(CalibrationSessionStatus, { message: 'Status is not valid.' })
  status?: CalibrationSessionStatus;
}
