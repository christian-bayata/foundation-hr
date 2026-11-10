import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BehaviouralRatingItemDto,
  GoalActualItemDto,
} from './appraisal-review-item.dto';

export class SubmitManagerReviewDto {
  @IsOptional()
  @IsArray({ message: 'Goals must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => GoalActualItemDto)
  goals?: GoalActualItemDto[];

  @IsOptional()
  @IsArray({ message: 'Behavioural ratings must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => BehaviouralRatingItemDto)
  behavioural?: BehaviouralRatingItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Manager rating must be a number.' })
  @Min(0, { message: 'Manager rating must be at least 0.' })
  @Max(100, { message: 'Manager rating must be at most 100.' })
  managerRating?: number;

  @IsOptional()
  @IsString({ message: 'Comment must be a string.' })
  @MaxLength(4000, { message: 'Comment must be at most 4000 characters.' })
  comment?: string;

  @IsOptional()
  @IsBoolean({ message: 'Submit must be a boolean.' })
  submit?: boolean;
}
