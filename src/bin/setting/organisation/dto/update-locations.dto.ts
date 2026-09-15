import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLocationDto {
  @IsString()
  @IsNotEmpty({
    message: 'Location name is required.',
  })
  @MaxLength(120, {
    message: 'Location name must be at most 120 characters.',
  })
  name: string;

  @IsString()
  @IsNotEmpty({
    message: 'Location address is required.',
  })
  @MaxLength(500, {
    message: 'Location address must be at most 500 characters.',
  })
  address: string;

  @IsString()
  @IsOptional()
  @MaxLength(30, {
    message: 'Phone number must be at most 30 characters.',
  })
  phoneNumber?: string;

  @IsEmail({}, { message: 'Location email must be a valid email address.' })
  @IsOptional()
  email?: string;
}

export class UpdateLocationsDto {
  @IsArray({
    message: 'Locations must be an array.',
  })
  @ValidateNested({ each: true })
  @Type(() => UpdateLocationDto)
  @IsOptional()
  locations?: UpdateLocationDto[];
}