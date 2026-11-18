import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PerformanceRating } from './form-option.enums';

export class ProbationConfirmationLetterDetailsDto {
  @IsDateString({}, { message: 'Probation ended must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Probation ended must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Probation ended is required.' })
  probationEnded: string;

  @IsDateString({}, { message: 'Confirmed from must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Confirmed from must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Confirmed from is required.' })
  confirmedFrom: string;

  @IsEnum(PerformanceRating, {
    message: 'Performance rating is not valid.',
  })
  @IsNotEmpty({ message: 'Performance rating is required.' })
  performanceRating: PerformanceRating;

  @IsString({ message: 'Line manager summary must be a string.' })
  @IsNotEmpty({ message: 'Line manager summary is required.' })
  @Matches(/\S/, { message: 'Line manager summary is required.' })
  @MaxLength(2000, {
    message: 'Line manager summary must be at most 2000 characters.',
  })
  lineManagerSummary: string;
}
