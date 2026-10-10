import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePolicyDto {
  @IsString()
  @IsOptional()
  @MaxLength(120, {
    message: 'Document name must be at most 120 characters.',
  })
  name?: string;
}
