import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { YesNo } from './form-option.enums';
export class EmploymentAgreementRenewalDetailsDto {
  @IsString({ message: 'Reason for renewal must be a string.' })
  @Matches(/\S/, { message: 'Reason for renewal is required.' })
  @MaxLength(2000, {
    message: 'Reason for renewal must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'Reason for renewal is required.' })
  @IsOptional()
  reasonForRenewal?: string;

  @IsDateString({}, { message: 'Renewal date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Renewal date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Renewal date is required.' })
  @IsOptional()
  renewalDate?: string;

  @IsDateString({}, { message: 'Current agreement ends must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Current agreement ends must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Current agreement ends is required.' })
  @IsOptional()
  currentAgreementEnds?: string;

  @IsDateString({}, { message: 'New start date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'New start date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'New start date is required.' })
  @IsOptional()
  newStartDate?: string;

  @IsDateString({}, { message: 'New end date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'New end date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'New end date is required.' })
  @IsOptional()
  newEndDate?: string;

  @IsEnum(YesNo, { message: 'Terms changing is not valid.' })
  @IsNotEmpty({ message: 'Terms changing is required.' })
  @IsOptional()
  termsChanging?: YesNo;
}
