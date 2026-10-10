import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class AddPolicyDto {
  @IsString()
  @IsNotEmpty({
    message: 'Document name is required.',
  })
  @MaxLength(120, {
    message: 'Document name must be at most 120 characters.',
  })
  name: string;

  @IsString()
  @IsNotEmpty({
    message: 'Document URL is required.',
  })
  @IsUrl(
    { require_protocol: true },
    { message: 'Document URL must be a valid URL.' },
  )
  url: string;
}
