import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
export class EmploymentAgreementExtensionDetailsDto {
  @IsString({ message: 'Reason for extension must be a string.' })
  @Matches(/\S/, { message: 'Reason for extension is required.' })
  @MaxLength(2000, {
    message: 'Reason for extension must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'Reason for extension is required.' })
  @IsOptional()
  reasonForExtension?: string;

  @IsDateString({}, { message: 'New extension date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'New extension date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'New extension date is required.' })
  @IsOptional()
  newExtensionDate?: string;

  @IsDateString({}, { message: 'Current agreement ends must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Current agreement ends must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Current agreement ends is required.' })
  @IsOptional()
  currentAgreementEnds?: string;

  @IsString({ message: 'Extend by months must be a string.' })
  @Matches(/\S/, { message: 'Extend by months is required.' })
  @MaxLength(2000, {
    message: 'Extend by months must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'Extend by months is required.' })
  @IsOptional()
  extendByMonths?: string;

  @IsDateString({}, { message: 'New end date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'New end date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'New end date is required.' })
  @IsOptional()
  newEndDate?: string;
}
