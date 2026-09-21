import {
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateBrandingDto {
  @IsString({ message: 'Logo URL must be a string.' })
  @MaxLength(2048, { message: 'Logo URL must be at most 2048 characters.' })
  @IsOptional()
  logoUrl?: string | null;

  @Matches(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'Navigation background color must be a valid hex color.',
  })
  @IsOptional()
  navigationBackgroundColor?: string;

  @Matches(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'Button color must be a valid hex color.',
  })
  @IsOptional()
  buttonColor?: string;

  @IsArray({ message: 'Custom domains must be an array.' })
  @IsString({ each: true, message: 'Each custom domain must be a string.' })
  @IsOptional()
  customDomains?: string[];

  @IsArray({ message: 'Login page images must be an array.' })
  @IsString({ each: true, message: 'Each login page image must be a string.' })
  @IsOptional()
  loginPageImages?: string[];
}
