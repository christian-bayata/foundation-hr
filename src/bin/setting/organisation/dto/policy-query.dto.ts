import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class PolicyCodeQueryDto {
  @IsString()
  @IsNotEmpty({
    message: 'Policy document code is required.',
  })
  @MaxLength(50, {
    message: 'Policy document code must be at most 50 characters.',
  })
  code: string;
}

export class ListPolicyQueryDto {
  @IsString()
  @IsOptional()
  search?: string;
}
