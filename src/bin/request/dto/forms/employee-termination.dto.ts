import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TerminationType } from './form-option.enums';

export class EmployeeTerminationDetailsDto {
  @IsDateString({}, { message: 'Termination date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Termination date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Termination date is required.' })
  terminationDate: string;

  @IsEnum(TerminationType, {
    message: 'Type of termination is not valid.',
  })
  @IsNotEmpty({ message: 'Type of termination is required.' })
  terminationType: TerminationType;

  @IsString({ message: 'Reason for termination must be a string.' })
  @IsNotEmpty({ message: 'Reason for termination is required.' })
  @Matches(/\S/, { message: 'Reason for termination is required.' })
  @MaxLength(2000, {
    message: 'Reason for termination must be at most 2000 characters.',
  })
  reasonForTermination: string;

  @IsDateString({}, { message: 'Exit interview date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Exit interview date must be in YYYY-MM-DD format.',
  })
  @IsOptional()
  exitInterviewDate?: string;
}
