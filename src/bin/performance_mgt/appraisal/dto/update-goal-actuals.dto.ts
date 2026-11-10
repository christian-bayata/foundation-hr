import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { AppraisalStage } from '../enums/appraisal.enums';
import { GoalActualItemDto } from './appraisal-review-item.dto';

export class UpdateGoalActualsDto {
  @IsEnum(AppraisalStage, {
    message: 'Stage must be self, manager or final.',
  })
  stage: AppraisalStage;

  @IsArray({ message: 'Goals must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => GoalActualItemDto)
  goals: GoalActualItemDto[];

  @IsOptional()
  @IsBoolean({ message: 'Submit must be a boolean.' })
  submit?: boolean;
}
