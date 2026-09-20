import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IRequest } from '../../../common';
import { VoluntaryContribution } from '../enum/employee.enum';

export class BankDetailsDto {
  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  bvn?: string;
}

export class PensionDetailsDto {
  @IsOptional()
  @IsString()
  pensionProvider?: string;

  @IsOptional()
  @IsString()
  rsa?: string;

  @IsOptional()
  @IsEnum(VoluntaryContribution, {
    message: 'Invalid voluntary contribution selection.',
  })
  voluntaryContribution?: VoluntaryContribution;

  @IsOptional()
  @IsNumber()
  voluntaryContributionAmount?: number;
}

export class TaxDetailsDto {
  @IsOptional()
  @IsString()
  tin?: string;

  @IsOptional()
  @IsString()
  stateOfResidence?: string;
}

export class OnboardingFinanceInformationDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PensionDetailsDto)
  pensionDetails?: PensionDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TaxDetailsDto)
  taxDetails?: TaxDetailsDto;

  req?: IRequest;
}