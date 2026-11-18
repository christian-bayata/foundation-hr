import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AmendmentChangeType } from './form-option.enums';

export class EmploymentAgreementAmendmentDetailsDto {
  @IsEnum(AmendmentChangeType, {
    message: 'What is changing is not valid.',
  })
  @IsNotEmpty({ message: 'What is changing is required.' })
  whatsChanging: AmendmentChangeType;

  @IsString({ message: 'Current value must be a string.' })
  @IsNotEmpty({ message: 'Current value is required.' })
  @Matches(/\S/, { message: 'Current value is required.' })
  @MaxLength(2000, {
    message: 'Current value must be at most 2000 characters.',
  })
  currentValue: string;

  @IsString({ message: 'New value must be a string.' })
  @IsNotEmpty({ message: 'New value is required.' })
  @Matches(/\S/, { message: 'New value is required.' })
  @MaxLength(2000, { message: 'New value must be at most 2000 characters.' })
  newValue: string;

  @IsDateString({}, { message: 'Effective from must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Effective from must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Effective from is required.' })
  effectiveFrom: string;

  @IsString({ message: 'Reason for change must be a string.' })
  @IsNotEmpty({ message: 'Reason for change is required.' })
  @Matches(/\S/, { message: 'Reason for change is required.' })
  @MaxLength(2000, {
    message: 'Reason for change must be at most 2000 characters.',
  })
  reasonForChange: string;
}
