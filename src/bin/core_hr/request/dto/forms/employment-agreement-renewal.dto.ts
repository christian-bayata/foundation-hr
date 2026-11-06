import {
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class EmploymentAgreementRenewalDetailsDto {
  @IsString({ message: 'Reason for renewal must be a string.' })
  @IsNotEmpty({ message: 'Reason for renewal is required.' })
  @Matches(/\S/, { message: 'Reason for renewal is required.' })
  @MaxLength(2000, {
    message: 'Reason for renewal must be at most 2000 characters.',
  })
  reasonForRenewal: string;

  @IsDateString({}, { message: 'Renewal date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Renewal date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Renewal date is required.' })
  renewalDate: string;
}
