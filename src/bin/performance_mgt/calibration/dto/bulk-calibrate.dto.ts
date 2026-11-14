import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkCalibrationItemDto {
  @IsNotEmpty({ message: 'Appraisal id is required.' })
  @IsString({ message: 'Appraisal id must be a string.' })
  appraisalId: string;

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

export class BulkCalibrateDto {
  @IsArray({ message: 'Items must be an array.' })
  @ArrayMinSize(1, { message: 'At least one item is required.' })
  @ValidateNested({ each: true })
  @Type(() => BulkCalibrationItemDto)
  items: BulkCalibrationItemDto[];
}
