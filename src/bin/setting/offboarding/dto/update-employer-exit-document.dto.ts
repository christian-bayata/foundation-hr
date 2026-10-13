import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEmployerExitDocumentDto {
  @IsString({ message: 'Document name must be a string.' })
  @MaxLength(160, {
    message: 'Document name must be at most 160 characters.',
  })
  @IsOptional()
  name?: string;

  @IsString({ message: 'File type must be a string.' })
  @MaxLength(40, { message: 'File type must be at most 40 characters.' })
  @IsOptional()
  fileType?: string;

  @IsBoolean({ message: 'Requires signature flag must be a boolean.' })
  @IsOptional()
  requiresSignature?: boolean;
}
