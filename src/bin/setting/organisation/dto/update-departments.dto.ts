import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DepartmentDto {
  @IsString()
  @IsNotEmpty({
    message: 'Department name is required.',
  })
  @MaxLength(120, {
    message: 'Department name must be at most 120 characters.',
  })
  name: string;

  @IsString()
  @IsOptional()
  headOfDepartmentId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50, {
    message: 'Parent department code must be at most 50 characters.',
  })
  parentCode?: string | null;
}

export class UpdateDepartmentsDto {
  @IsArray({
    message: 'Departments must be an array.',
  })
  @ValidateNested({ each: true })
  @Type(() => DepartmentDto)
  @IsOptional()
  departments?: DepartmentDto[];
}
