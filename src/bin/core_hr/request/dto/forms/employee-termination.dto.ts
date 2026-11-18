import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { FinalSettlementOption, TerminationType } from './form-option.enums';
export class EmployeeTerminationDetailsDto {
  @IsDateString({}, { message: 'Termination date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Termination date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Termination date is required.' })
  @IsOptional()
  terminationDate?: string;

  @IsEnum(TerminationType, { message: 'Type of termination is not valid.' })
  @IsNotEmpty({ message: 'Type of termination is required.' })
  @IsOptional()
  terminationType?: TerminationType;

  @IsString({ message: 'Reason for termination must be a string.' })
  @Matches(/\S/, { message: 'Reason for termination is required.' })
  @MaxLength(2000, {
    message: 'Reason for termination must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'Reason for termination is required.' })
  @IsOptional()
  reasonForTermination?: string;

  @IsDateString({}, { message: 'Exit interview date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Exit interview date must be in YYYY-MM-DD format.',
  })
  @IsOptional()
  exitInterviewDate?: string;

  @IsString({ message: 'Reason must be a string.' })
  @Matches(/\S/, { message: 'Reason is required.' })
  @MaxLength(2000, { message: 'Reason must be at most 2000 characters.' })
  @IsNotEmpty({ message: 'Reason is required.' })
  @IsOptional()
  reason?: string;

  @IsDateString({}, { message: 'Last working day must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Last working day must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Last working day is required.' })
  @IsOptional()
  lastWorkingDay?: string;

  @IsString({ message: 'Notice period must be a string.' })
  @Matches(/\S/, { message: 'Notice period is required.' })
  @MaxLength(2000, {
    message: 'Notice period must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'Notice period is required.' })
  @IsOptional()
  noticePeriod?: string;

  @IsEnum(FinalSettlementOption, { message: 'Final settlement is not valid.' })
  @IsNotEmpty({ message: 'Final settlement is required.' })
  @IsOptional()
  finalSettlement?: FinalSettlementOption;

  @IsString({ message: 'Background must be a string.' })
  @MaxLength(2000, { message: 'Background must be at most 2000 characters.' })
  @IsOptional()
  background?: string;
}
