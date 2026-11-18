import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
export class CancelHireBeforeStartDateDetailsDto {
  @IsString({ message: 'Reason for canceling hire must be a string.' })
  @Matches(/\S/, { message: 'Reason for canceling hire is required.' })
  @MaxLength(2000, {
    message: 'Reason for canceling hire must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'Reason for canceling hire is required.' })
  @IsOptional()
  reasonForCancelingHire?: string;

  @IsDateString({}, { message: 'Agreed start date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Agreed start date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Agreed start date is required.' })
  @IsOptional()
  agreedStartDate?: string;

  @IsString({ message: 'Reason must be a string.' })
  @Matches(/\S/, { message: 'Reason is required.' })
  @MaxLength(2000, { message: 'Reason must be at most 2000 characters.' })
  @IsNotEmpty({ message: 'Reason is required.' })
  @IsOptional()
  reason?: string;

  @IsDateString({}, { message: 'Offer withdrawn on must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Offer withdrawn on must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Offer withdrawn on is required.' })
  @IsOptional()
  offerWithdrawnOn?: string;

  @IsString({ message: 'Background must be a string.' })
  @MaxLength(2000, { message: 'Background must be at most 2000 characters.' })
  @IsOptional()
  background?: string;
}
