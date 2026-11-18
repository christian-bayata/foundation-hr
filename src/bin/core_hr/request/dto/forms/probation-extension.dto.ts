import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
export class ProbationExtensionDetailsDto {
  @IsDateString({}, { message: 'New probation date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'New probation date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'New probation date is required.' })
  @IsOptional()
  newProbationDate?: string;

  @IsString({ message: 'Reason for extension must be a string.' })
  @Matches(/\S/, { message: 'Reason for extension is required.' })
  @MaxLength(2000, {
    message: 'Reason for extension must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'Reason for extension is required.' })
  @IsOptional()
  reasonForExtension?: string;

  @IsDateString({}, { message: 'Current probation ends must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Current probation ends must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Current probation ends is required.' })
  @IsOptional()
  currentProbationEnds?: string;

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
