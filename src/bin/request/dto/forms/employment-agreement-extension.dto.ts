import {
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class EmploymentAgreementExtensionDetailsDto {
  @IsString({ message: 'Reason for extension must be a string.' })
  @IsNotEmpty({ message: 'Reason for extension is required.' })
  @Matches(/\S/, { message: 'Reason for extension is required.' })
  @MaxLength(2000, {
    message: 'Reason for extension must be at most 2000 characters.',
  })
  reasonForExtension: string;

  @IsDateString({}, { message: 'New extension date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'New extension date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'New extension date is required.' })
  newExtensionDate: string;
}
