import { IsOptional, IsString } from 'class-validator';

export class RecomputeAppraisalDto {
  @IsOptional()
  @IsString({ message: 'Appraisal id must be a string.' })
  appraisalId?: string;

  @IsOptional()
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId?: string;
}
