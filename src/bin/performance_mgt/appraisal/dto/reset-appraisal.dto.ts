import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AppraisalStage } from '../enums/appraisal.enums';

export class ResetAppraisalDto {
  @IsOptional()
  @IsArray({ message: 'Stages must be an array.' })
  @ArrayUnique({ message: 'Stages must be unique.' })
  @IsEnum(AppraisalStage, {
    each: true,
    message: 'Each stage must be self, manager or final.',
  })
  stages?: AppraisalStage[];

  @IsOptional()
  @IsString({ message: 'Reason must be a string.' })
  @MaxLength(500, { message: 'Reason must be at most 500 characters.' })
  reason?: string;
}
