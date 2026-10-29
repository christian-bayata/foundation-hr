import {
  IsDateString,
  IsNotEmpty,
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
  newProbationDate: string;

  @IsString({ message: 'Reason for extension must be a string.' })
  @IsNotEmpty({ message: 'Reason for extension is required.' })
  @Matches(/\S/, { message: 'Reason for extension is required.' })
  @MaxLength(2000, {
    message: 'Reason for extension must be at most 2000 characters.',
  })
  reasonForExtension: string;
}
