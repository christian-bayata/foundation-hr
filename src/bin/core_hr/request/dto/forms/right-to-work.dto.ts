import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { RightToWorkDocumentType } from './form-option.enums';

export class RightToWorkDetailsDto {
  @IsEnum(RightToWorkDocumentType, {
    message: 'Document type is not valid.',
  })
  @IsNotEmpty({ message: 'Document type is required.' })
  documentType: RightToWorkDocumentType;

  @IsString({ message: 'Document number must be a string.' })
  @IsNotEmpty({ message: 'Document number is required.' })
  @Matches(/\S/, { message: 'Document number is required.' })
  @MaxLength(2000, {
    message: 'Document number must be at most 2000 characters.',
  })
  documentNumber: string;

  @IsDateString({}, { message: 'Issued on must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Issued on must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Issued on is required.' })
  issuedOn: string;

  @IsDateString({}, { message: 'Expires on must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Expires on must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Expires on is required.' })
  expiresOn: string;

  @IsString({ message: 'Note from employee must be a string.' })
  @MaxLength(2000, {
    message: 'Note from employee must be at most 2000 characters.',
  })
  @IsOptional()
  noteFromEmployee?: string;
}
