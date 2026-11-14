import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CalibrationPerformanceLevel,
  CalibrationPotential,
} from '../../appraisal/enums/appraisal.enums';

export class MoveNineBoxDto {
  @IsOptional()
  @IsEnum(CalibrationPerformanceLevel, {
    message: 'Performance level is not valid.',
  })
  performanceLevel?: CalibrationPerformanceLevel;

  @IsOptional()
  @IsEnum(CalibrationPotential, { message: 'Potential is not valid.' })
  potential?: CalibrationPotential;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Calibrated rating must be a number.' })
  @Min(0, { message: 'Calibrated rating must be at least 0.' })
  @Max(100, { message: 'Calibrated rating must be at most 100.' })
  calibratedRating?: number;

  @IsOptional()
  @IsString({ message: 'Calibrated band must be a string.' })
  @MaxLength(80, { message: 'Calibrated band must be at most 80 characters.' })
  calibratedBand?: string;

  @IsOptional()
  @IsString({ message: 'Justification must be a string.' })
  @MaxLength(1000, {
    message: 'Justification must be at most 1000 characters.',
  })
  justification?: string;
}
