import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AppraisalRatingTag } from '../enums/appraisal.enums';

export class SubmitFinalReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Final rating must be a number.' })
  @Min(0, { message: 'Final rating must be at least 0.' })
  @Max(100, { message: 'Final rating must be at most 100.' })
  finalRating?: number;

  @IsOptional()
  @IsEnum(AppraisalRatingTag, { message: 'Rating tag is not valid.' })
  ratingTag?: AppraisalRatingTag;

  @IsOptional()
  @IsString({ message: 'Comment must be a string.' })
  @MaxLength(4000, { message: 'Comment must be at most 4000 characters.' })
  comment?: string;

  @IsOptional()
  @IsBoolean({ message: 'Submit must be a boolean.' })
  submit?: boolean;
}
