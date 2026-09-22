import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateDepartmentDto {
  @IsString()
  @IsNotEmpty({
    message: 'Department name must not be empty.',
  })
  @MaxLength(120, {
    message: 'Department name must be at most 120 characters.',
  })
  @IsOptional()
  name?: string;

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

export class DepartmentCodeQueryDto {
  @IsString()
  @IsNotEmpty({
    message: 'Department code is required.',
  })
  @MaxLength(50, {
    message: 'Department code must be at most 50 characters.',
  })
  code: string;
}