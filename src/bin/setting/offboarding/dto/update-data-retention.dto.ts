import { IsEnum, IsOptional } from 'class-validator';
import { DataRetentionPeriod } from '../enum/offboarding.enum';

export class UpdateDataRetentionDto {
  @IsEnum(DataRetentionPeriod, {
    message: 'Data retention period is not valid.',
  })
  @IsOptional()
  dataRetentionPeriod?: DataRetentionPeriod | null;
}
