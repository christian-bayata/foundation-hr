import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  PayrollPaymentMethod,
  ReimbursementCategory,
} from './form-option.enums';

export class ReimbursementDetailsDto {
  @IsEnum(ReimbursementCategory, {
    message: 'Category is not valid.',
  })
  @IsNotEmpty({ message: 'Category is required.' })
  category: ReimbursementCategory;

  @IsString({ message: 'Amount must be a string.' })
  @IsNotEmpty({ message: 'Amount is required.' })
  @Matches(/\S/, { message: 'Amount is required.' })
  @MaxLength(2000, { message: 'Amount must be at most 2000 characters.' })
  amount: string;

  @IsDateString({}, { message: 'Date incurred must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date incurred must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Date incurred is required.' })
  dateIncurred: string;

  @IsEnum(PayrollPaymentMethod, {
    message: 'Pay with is not valid.',
  })
  @IsNotEmpty({ message: 'Pay with is required.' })
  payWith: PayrollPaymentMethod;

  @IsString({ message: 'Purpose must be a string.' })
  @IsNotEmpty({ message: 'Purpose is required.' })
  @Matches(/\S/, { message: 'Purpose is required.' })
  @MaxLength(2000, { message: 'Purpose must be at most 2000 characters.' })
  purpose: string;
}
