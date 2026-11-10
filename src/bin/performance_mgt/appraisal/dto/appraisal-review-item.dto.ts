import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GoalActualItemDto {
  @IsNotEmpty({ message: 'Goal id is required.' })
  @IsString({ message: 'Goal id must be a string.' })
  goalId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Actual must be a number.' })
  actual?: number;

  @IsOptional()
  @IsString({ message: 'Comment must be a string.' })
  @MaxLength(2000, { message: 'Comment must be at most 2000 characters.' })
  comment?: string;

  @IsOptional()
  @IsString({ message: 'Label must be a string.' })
  @MaxLength(160, { message: 'Label must be at most 160 characters.' })
  label?: string;
}

export class BehaviouralRatingItemDto {
  @IsNotEmpty({ message: 'Competency id is required.' })
  @IsString({ message: 'Competency id must be a string.' })
  competencyId: string;

  @IsOptional()
  @IsString({ message: 'Competency name must be a string.' })
  @MaxLength(160, { message: 'Competency name must be at most 160 characters.' })
  competencyName?: string;

  @IsOptional()
  @IsString({ message: 'Framework name must be a string.' })
  @MaxLength(160, { message: 'Framework name must be at most 160 characters.' })
  frameworkName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Weight must be a number.' })
  @Min(0, { message: 'Weight must be at least 0.' })
  @Max(100, { message: 'Weight must be at most 100.' })
  weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Rating must be a number.' })
  @Min(0, { message: 'Rating must be at least 0.' })
  @Max(100, { message: 'Rating must be at most 100.' })
  rating?: number;

  @IsOptional()
  @IsString({ message: 'Comment must be a string.' })
  @MaxLength(2000, { message: 'Comment must be at most 2000 characters.' })
  comment?: string;
}
