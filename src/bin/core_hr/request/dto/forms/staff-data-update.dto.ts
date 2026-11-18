import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { InformationToUpdate, StaffDataField } from './form-option.enums';
export class StaffDataUpdateDetailsDto {
  @IsEnum(InformationToUpdate, {
    message: 'Information to update is not valid.',
  })
  @IsNotEmpty({ message: 'Information to update is required.' })
  @IsOptional()
  informationToUpdate?: InformationToUpdate;

  @IsEnum(StaffDataField, { message: 'Field to update is not valid.' })
  @IsNotEmpty({ message: 'Field to update is required.' })
  @IsOptional()
  fieldToUpdate?: StaffDataField;

  @IsString({ message: 'Current value must be a string.' })
  @Matches(/\S/, { message: 'Current value is required.' })
  @MaxLength(2000, { message: 'Current value must be at most 2000 characters.' })
  @IsNotEmpty({ message: 'Current value is required.' })
  @IsOptional()
  currentValue?: string;

  @IsString({ message: 'New value must be a string.' })
  @Matches(/\S/, { message: 'New value is required.' })
  @MaxLength(2000, { message: 'New value must be at most 2000 characters.' })
  @IsNotEmpty({ message: 'New value is required.' })
  @IsOptional()
  newValue?: string;

  @IsDateString({}, { message: 'Effective from must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Effective from must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Effective from is required.' })
  @IsOptional()
  effectiveFrom?: string;

  @IsString({ message: 'Note from employee must be a string.' })
  @MaxLength(2000, {
    message: 'Note from employee must be at most 2000 characters.',
  })
  @IsOptional()
  noteFromEmployee?: string;
}
