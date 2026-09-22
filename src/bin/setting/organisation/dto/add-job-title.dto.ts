import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddJobTitleDto {
  @IsString()
  @IsNotEmpty({
    message: 'Job title name is required.',
  })
  @MaxLength(120, {
    message: 'Job title name must be at most 120 characters.',
  })
  name: string;
}
