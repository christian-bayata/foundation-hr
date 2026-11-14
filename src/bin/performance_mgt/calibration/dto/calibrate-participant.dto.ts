import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CalibrateParticipantDto {
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
