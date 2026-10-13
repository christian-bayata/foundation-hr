import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddEmployerExitDocumentDto {
  @IsString({ message: 'Document name must be a string.' })
  @IsNotEmpty({ message: 'Document name is required.' })
  @MaxLength(160, {
    message: 'Document name must be at most 160 characters.',
  })
  name: string;

  @IsString({ message: 'File type must be a string.' })
  @MaxLength(40, { message: 'File type must be at most 40 characters.' })
  @IsOptional()
  fileType?: string;
}
