import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { EmploymentLetterType } from './form-option.enums';

export class EmploymentLetterRequestDetailsDto {
  @IsEnum(EmploymentLetterType, {
    message: 'Letter type is not valid.',
  })
  @IsNotEmpty({ message: 'Letter type is required.' })
  letterType: EmploymentLetterType;

  @IsString({ message: 'Addressed to must be a string.' })
  @IsNotEmpty({ message: 'Addressed to is required.' })
  @Matches(/\S/, { message: 'Addressed to is required.' })
  @MaxLength(2000, { message: 'Addressed to must be at most 2000 characters.' })
  addressedTo: string;

  @IsString({ message: 'Purpose must be a string.' })
  @IsNotEmpty({ message: 'Purpose is required.' })
  @Matches(/\S/, { message: 'Purpose is required.' })
  @MaxLength(2000, { message: 'Purpose must be at most 2000 characters.' })
  purpose: string;

  @IsDateString({}, { message: 'Needed by must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Needed by must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Needed by is required.' })
  neededBy: string;

  @IsString({ message: 'Note from employee must be a string.' })
  @MaxLength(2000, {
    message: 'Note from employee must be at most 2000 characters.',
  })
  @IsOptional()
  noteFromEmployee?: string;
}
