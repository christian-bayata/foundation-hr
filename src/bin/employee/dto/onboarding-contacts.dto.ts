import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IRequest } from '../../../common';
import { ContactType } from '../enum/employee.enum';

export class EmployeeContactDto {
  @IsEnum(ContactType, { message: 'Invalid contact type.' })
  @IsNotEmpty({ message: 'Contact type is required.' })
  type: ContactType;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class OnboardingContactsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeContactDto)
  contacts?: EmployeeContactDto[];

  req?: IRequest;
}