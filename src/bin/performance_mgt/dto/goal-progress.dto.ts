import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GoalProgressDto {
  @IsNotEmpty({ message: 'Progress is required.' })
  @IsNumber({}, { message: 'Progress must be a number.' })
  @Min(0, { message: 'Progress must be at least 0.' })
  @Max(100, { message: 'Progress must be at most 100.' })
  progress: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  attachments?: string[];
}

export class EndGoalPlanCycleDto {
  @IsOptional()
  @IsString({ message: 'Reason must be a string.' })
  reason?: string;
}
