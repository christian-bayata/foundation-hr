import { IsOptional, IsString } from 'class-validator';

export class GoalSettingsQueryDto {
  @IsOptional()
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId?: string;
}
