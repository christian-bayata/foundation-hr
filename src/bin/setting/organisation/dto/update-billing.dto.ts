import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentMethodDto {
  @IsString({ message: 'Payment method brand must be a string.' })
  @MaxLength(32, {
    message: 'Payment method brand must be at most 32 characters.',
  })
  @IsOptional()
  brand?: string;

  @Matches(/^\d{4}$/, {
    message: 'Payment method last4 must be exactly 4 digits.',
  })
  @IsOptional()
  last4?: string;

  @Matches(/^(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Payment method expiry must be in the MM/YYYY format.',
  })
  @IsOptional()
  expiry?: string;
}

export class UpdateBillingDto {
  @ValidateIf(
    (object, value) => value !== null && value !== undefined,
  )
  @IsEmail({}, { message: 'Billing email must be a valid email address.' })
  @IsOptional()
  billingEmail?: string | null;

  @ValidateNested()
  @Type(() => PaymentMethodDto)
  @IsOptional()
  paymentMethod?: PaymentMethodDto;
}