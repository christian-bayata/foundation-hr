import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AppraisalStage } from '../enums/appraisal.enums';

export class ListAppraisalCommentsQueryDto {
  @IsNotEmpty({ message: 'Appraisal id is required.' })
  @IsString({ message: 'Appraisal id must be a string.' })
  appraisalId: string;

  @IsOptional()
  @IsString({ message: 'Goal id must be a string.' })
  goalId?: string;

  @IsOptional()
  @IsString({ message: 'Perspective must be a string.' })
  perspective?: string;

  @IsOptional()
  @IsEnum(AppraisalStage, {
    message: 'Stage must be self, manager or final.',
  })
  stage?: AppraisalStage;
}
