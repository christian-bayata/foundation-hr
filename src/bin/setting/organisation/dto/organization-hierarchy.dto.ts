import {
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHierarchyDto {
  @IsString()
  @IsNotEmpty({
    message: 'Employee id is required.',
  })
  employeeId: string;

  @IsString()
  @IsOptional()
  supervisorId?: string | null;
}

export class HierarchyQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  supervisorId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  batch?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}