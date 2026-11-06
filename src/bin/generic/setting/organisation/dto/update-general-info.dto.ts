import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateGeneralInfoDto {
  @IsString()
  @IsNotEmpty({ message: 'Organisation name is required.' })
  @MaxLength(120, { message: 'Organisation name must be at most 120 characters.' })
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60, { message: 'Registration number must be at most 60 characters.' })
  registrationNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Website must be at most 255 characters.' })
  website?: string;

  @IsEmail({}, { message: 'Primary contact email must be a valid email address.' })
  @IsOptional()
  primaryContactEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30, { message: 'Phone number must be at most 30 characters.' })
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120, { message: 'Time zone must be at most 120 characters.' })
  timezone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60, { message: 'Language must be at most 60 characters.' })
  language?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30, { message: 'Fiscal year start date must be at most 30 characters.' })
  fiscalYearStartDate?: string;
}