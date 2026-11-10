import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { AppraisalStage } from '../enums/appraisal.enums';
import { BehaviouralRatingItemDto } from './appraisal-review-item.dto';

export class SubmitBehaviouralDto {
  @IsEnum(AppraisalStage, {
    message: 'Stage must be self, manager or final.',
  })
  stage: AppraisalStage;

  @IsArray({ message: 'Ratings must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => BehaviouralRatingItemDto)
  ratings: BehaviouralRatingItemDto[];

  @IsOptional()
  @IsBoolean({ message: 'Submit must be a boolean.' })
  submit?: boolean;
}
