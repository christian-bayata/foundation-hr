import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOnboardingDocumentDto {
  @IsString({ message: 'Document label must be a string.' })
  @MaxLength(160, {
    message: 'Document label must be at most 160 characters.',
  })
  @IsOptional()
  label?: string;

  @IsBoolean({ message: 'Document selected flag must be a boolean.' })
  @IsOptional()
  selected?: boolean;

  @IsBoolean({ message: 'Document optional flag must be a boolean.' })
  @IsOptional()
  optional?: boolean;
}
