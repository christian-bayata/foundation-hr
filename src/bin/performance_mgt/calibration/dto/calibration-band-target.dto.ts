import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CalibrationPerformanceLevel } from '../../appraisal/enums/appraisal.enums';

export class CalibrationBandTargetDto {
  @IsNotEmpty({ message: 'Band key is required.' })
  @IsString({ message: 'Band key must be a string.' })
  @MaxLength(80, { message: 'Band key must be at most 80 characters.' })
  key: string;

  @IsNotEmpty({ message: 'Band label is required.' })
  @IsString({ message: 'Band label must be a string.' })
  @MaxLength(120, { message: 'Band label must be at most 120 characters.' })
  label: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Band minimum score must be a number.' })
  @Min(0, { message: 'Band minimum score must be at least 0.' })
  @Max(100, { message: 'Band minimum score must be at most 100.' })
  minScore: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Band maximum score must be a number.' })
  @Min(0, { message: 'Band maximum score must be at least 0.' })
  @Max(100, { message: 'Band maximum score must be at most 100.' })
  maxScore: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Band target percent must be a number.' })
  @Min(0, { message: 'Band target percent must be at least 0.' })
  @Max(100, { message: 'Band target percent must be at most 100.' })
  targetPercent: number;

  @IsEnum(CalibrationPerformanceLevel, {
    message: 'Band performance level is not valid.',
  })
  performanceLevel: CalibrationPerformanceLevel;
}
