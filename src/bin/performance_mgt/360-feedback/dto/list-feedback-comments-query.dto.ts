import { Type } from 'class-transformer';
import { IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListFeedbackCommentsQueryDto {
  @IsOptional()
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId?: string;

  @IsOptional()
  @IsString({ message: 'Subject employee id must be a string.' })
  subjectEmployeeId?: string;

  @IsOptional()
  @IsString({ message: 'Feedback id must be a string.' })
  feedbackId?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsString({ message: 'Batch must be an integer.' })
  @Min(1, { message: 'Batch must be at least 1.' })
  batch?: number;

  @IsOptional()
  @Type(() => Number)
  @IsString({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  @Max(100, { message: 'Limit must be at most 100.' })
  limit?: number;
}
