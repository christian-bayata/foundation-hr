import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddDepartmentDto {
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

export class AddDepartmentsDto {
  @IsArray({
    message: 'Departments must be an array.',
  })
  @ArrayMinSize(1, {
    message: 'At least one department is required.',
  })
  @ValidateNested({ each: true })
  @Type(() => AddDepartmentDto)
  departments: AddDepartmentDto[];
}

/**
 * Single-department variant for `POST /departments/add` convenience.
 * Allows clients to send `{ name, headOfDepartmentId, parentCode }` directly
 * without wrapping in a `departments` array.
 */
export class AddSingleDepartmentDto extends AddDepartmentDto {}
