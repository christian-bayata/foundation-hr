import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AddLeaveCategoryDto {
  @IsString({ message: 'Leave category must be a string.' })
  @IsNotEmpty({ message: 'Leave category is required.' })
  @MaxLength(120, {
    message: 'Leave category must be at most 120 characters.',
  })
  label: string;

  @IsNumber({}, { message: 'Entitlement days must be a number.' })
  @Min(0, { message: 'Entitlement days cannot be negative.' })
  @IsOptional()
  entitlementDays?: number;
}
