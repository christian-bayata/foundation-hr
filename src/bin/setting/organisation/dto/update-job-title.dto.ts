import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateJobTitleDto {
  @IsString()
  @IsNotEmpty({
    message: 'Job title name must not be empty.',
  })
  @MaxLength(120, {
    message: 'Job title name must be at most 120 characters.',
  })
  @IsOptional()
  name?: string;
}

export class JobTitleCodeQueryDto {
  @IsString()
  @IsNotEmpty({
    message: 'Job title code is required.',
  })
  @MaxLength(50, {
    message: 'Job title code must be at most 50 characters.',
  })
  code: string;
}
