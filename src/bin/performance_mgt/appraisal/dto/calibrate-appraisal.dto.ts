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
import { AppraisalRatingTag } from '../enums/appraisal.enums';

export class CalibrateAppraisalDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Manager rating must be a number.' })
  @Min(0, { message: 'Manager rating must be at least 0.' })
  @Max(100, { message: 'Manager rating must be at most 100.' })
  managerRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Calibrated rating must be a number.' })
  @Min(0, { message: 'Calibrated rating must be at least 0.' })
  @Max(100, { message: 'Calibrated rating must be at most 100.' })
  calibratedRating?: number;

  @IsOptional()
  @IsEnum(AppraisalRatingTag, { message: 'Rating tag is not valid.' })
  ratingTag?: AppraisalRatingTag;

  @IsOptional()
  @IsString({ message: 'Reason must be a string.' })
  @MaxLength(500, { message: 'Reason must be at most 500 characters.' })
  reason?: string;
}
