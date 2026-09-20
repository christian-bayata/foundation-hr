import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IRequest } from '../../../common';
import {
  EducationLevel,
  MaritalStatus,
  Religion,
  Sex,
} from '../enum/employee.enum';

export class PersonalDetailsDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Sex, { message: 'Invalid sex.' })
  sex?: Sex;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  stateOfOrigin?: string;

  @IsOptional()
  @IsString()
  lga?: string;

  @IsOptional()
  @IsEnum(MaritalStatus, { message: 'Invalid marital status.' })
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsEnum(Religion, { message: 'Invalid religion.' })
  religion?: Religion;
}

export class HomeAddressDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class AcademicInfoDto {
  @IsOptional()
  @IsEnum(EducationLevel, { message: 'Invalid education level.' })
  educationLevel?: EducationLevel;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  qualification?: string;
}

export class OnboardingBasicInformationDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PersonalDetailsDto)
  personalDetails?: PersonalDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => HomeAddressDto)
  homeAddress?: HomeAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AcademicInfoDto)
  academicInfo?: AcademicInfoDto;

  req?: IRequest;
}
