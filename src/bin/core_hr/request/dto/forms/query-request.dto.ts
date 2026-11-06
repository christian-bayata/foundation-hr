import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AreaOfConcern } from './form-option.enums';

export class QueryRequestDetailsDto {
  @IsEnum(AreaOfConcern, {
    message: 'Area of concern is not valid.',
  })
  @IsNotEmpty({ message: 'Area of concern is required.' })
  areaOfConcern: AreaOfConcern;

  @IsString({ message: 'Incident description must be a string.' })
  @IsNotEmpty({ message: 'Incident description is required.' })
  @Matches(/\S/, { message: 'Incident description is required.' })
  @MaxLength(2000, {
    message: 'Incident description must be at most 2000 characters.',
  })
  incidentDescription: string;
}
