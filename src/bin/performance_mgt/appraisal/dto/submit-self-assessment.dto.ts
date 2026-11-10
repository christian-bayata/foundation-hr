import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  BehaviouralRatingItemDto,
  GoalActualItemDto,
} from './appraisal-review-item.dto';

export class SubmitSelfAssessmentDto {
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
  @IsString({ message: 'Comment must be a string.' })
  @MaxLength(4000, { message: 'Comment must be at most 4000 characters.' })
  comment?: string;

  @IsOptional()
  @IsBoolean({ message: 'Submit must be a boolean.' })
  submit?: boolean;
}
