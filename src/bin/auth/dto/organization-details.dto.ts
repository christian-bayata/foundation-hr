import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { IRequest } from '../../../common';

export class OrganizationDetailsDto {
  @IsString()
  @IsNotEmpty({ message: 'Organisation name is required.' })
  organisationName: string;

  @IsString()
  @IsNotEmpty({ message: 'Organisation size is required.' })
  organisationSize: string;

  @IsString()
  @IsNotEmpty({ message: 'Country is required.' })
  country: string;

  @IsBoolean({ message: 'You must accept the Terms of Service to continue.' })
  acceptTerms: boolean;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  req?: IRequest;
}
