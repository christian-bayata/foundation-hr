import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessType } from '../enum/organisation.enum';

export class UpdateTaxDetailsDto {
  @IsString()
  @IsOptional()
  @MaxLength(60, {
    message: 'Tax identification number must be at most 60 characters.',
  })
  taxIdentificationNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60, {
    message: 'VAT number must be at most 60 characters.',
  })
  vatNumber?: string;
}

export class UpdateBusinessDetailsDto {
  // @IsString()
  // @IsOptional()
  // @MaxLength(160, {
  //   message: 'Legal name must be at most 160 characters.',
  // })
  // legalName?: string;

  @IsEnum(BusinessType, {
    message: 'Company type must be a valid company type.',
  })
  @IsOptional()
  businessType?: BusinessType;

  @IsString()
  @IsOptional()
  @MaxLength(120, {
    message: 'Industry must be at most 120 characters.',
  })
  industry?: string;

  @IsString()
  @IsOptional()
  companySize?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10, {
    message: 'Currency must be at most 10 characters.',
  })
  currency?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60, {
    message: 'Tax identification number must be at most 60 characters',
  })
  tin?: string;

  // @IsObject()
  // @ValidateNested()
  // @Type(() => UpdateTaxDetailsDto)
  // @IsOptional()
  // tax?: UpdateTaxDetailsDto;
}
