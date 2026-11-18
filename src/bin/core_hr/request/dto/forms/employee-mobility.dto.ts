import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MobilityRequestType, TypeOfMove } from './form-option.enums';
export class EmployeeMobilityDetailsDto {
  @IsEnum(MobilityRequestType, {
    message: 'Mobility request type is not valid.',
  })
  @IsNotEmpty({ message: 'Mobility request type is required.' })
  @IsOptional()
  mobilityRequestType?: MobilityRequestType;

  @IsString({ message: 'Justification must be a string.' })
  @Matches(/\S/, { message: 'Justification is required.' })
  @MaxLength(2000, { message: 'Justification must be at most 2000 characters.' })
  @IsNotEmpty({ message: 'Justification is required.' })
  @IsOptional()
  justification?: string;

  @IsEnum(TypeOfMove, { message: 'Type of move is not valid.' })
  @IsNotEmpty({ message: 'Type of move is required.' })
  @IsOptional()
  typeOfMove?: TypeOfMove;

  @IsString({ message: 'New job title must be a string.' })
  @Matches(/\S/, { message: 'New job title is required.' })
  @MaxLength(2000, { message: 'New job title must be at most 2000 characters.' })
  @IsNotEmpty({ message: 'New job title is required.' })
  @IsOptional()
  newJobTitle?: string;

  @IsString({ message: 'New department must be a string.' })
  @Matches(/\S/, { message: 'New department is required.' })
  @MaxLength(2000, {
    message: 'New department must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'New department is required.' })
  @IsOptional()
  newDepartment?: string;

  @IsString({ message: 'New line manager must be a string.' })
  @Matches(/\S/, { message: 'New line manager is required.' })
  @MaxLength(2000, {
    message: 'New line manager must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'New line manager is required.' })
  @IsOptional()
  newLineManager?: string;

  @IsDateString({}, { message: 'Effective from must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Effective from must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Effective from is required.' })
  @IsOptional()
  effectiveFrom?: string;
}
