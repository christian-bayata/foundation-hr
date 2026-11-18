import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ChangeOfAddressDetailsDto {
  @IsString({ message: 'New address must be a string.' })
  @IsNotEmpty({ message: 'New address is required.' })
  @Matches(/\S/, { message: 'New address is required.' })
  @MaxLength(2000, { message: 'New address must be at most 2000 characters.' })
  newAddress: string;

  @IsString({ message: 'City must be a string.' })
  @IsNotEmpty({ message: 'City is required.' })
  @Matches(/\S/, { message: 'City is required.' })
  @MaxLength(2000, { message: 'City must be at most 2000 characters.' })
  city: string;

  @IsString({ message: 'State must be a string.' })
  @IsNotEmpty({ message: 'State is required.' })
  @Matches(/\S/, { message: 'State is required.' })
  @MaxLength(2000, { message: 'State must be at most 2000 characters.' })
  state: string;

  @IsDateString({}, { message: 'Effective from must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Effective from must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Effective from is required.' })
  effectiveFrom: string;

  @IsString({ message: 'Note from employee must be a string.' })
  @MaxLength(2000, {
    message: 'Note from employee must be at most 2000 characters.',
  })
  @IsOptional()
  noteFromEmployee?: string;
}
