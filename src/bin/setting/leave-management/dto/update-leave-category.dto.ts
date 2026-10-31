import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateLeaveCategoryDto {
  @IsString({ message: 'Leave category id must be a string.' })
  @IsNotEmpty({ message: 'Leave category id is required.' })
  id: string;

  @IsString({ message: 'Leave category must be a string.' })
  @MaxLength(120, {
    message: 'Leave category must be at most 120 characters.',
  })
  @IsOptional()
  label?: string;

  @IsNumber({}, { message: 'Entitlement days must be a number.' })
  @Min(0, { message: 'Entitlement days cannot be negative.' })
  @IsOptional()
  entitlementDays?: number;
}
