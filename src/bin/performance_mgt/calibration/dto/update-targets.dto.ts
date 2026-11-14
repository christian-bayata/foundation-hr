import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CalibrationBandTargetDto } from './calibration-band-target.dto';

export class UpdateCalibrationTargetsDto {
  @IsOptional()
  @IsArray({ message: 'Target distribution must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => CalibrationBandTargetDto)
  targetDistribution?: CalibrationBandTargetDto[];

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
}
