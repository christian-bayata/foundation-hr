import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AreaOfConcern, QueryNature } from './form-option.enums';
export class QueryRequestDetailsDto {
  @IsEnum(AreaOfConcern, { message: 'Area of concern is not valid.' })
  @IsNotEmpty({ message: 'Area of concern is required.' })
  @IsOptional()
  areaOfConcern?: AreaOfConcern;

  @IsString({ message: 'Incident description must be a string.' })
  @Matches(/\S/, { message: 'Incident description is required.' })
  @MaxLength(2000, {
    message: 'Incident description must be at most 2000 characters.',
  })
  @IsNotEmpty({ message: 'Incident description is required.' })
  @IsOptional()
  incidentDescription?: string;

  @IsEnum(QueryNature, { message: 'Nature of query is not valid.' })
  @IsNotEmpty({ message: 'Nature of query is required.' })
  @IsOptional()
  natureOfQuery?: QueryNature;

  @IsDateString({}, { message: 'Incident date must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Incident date must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Incident date is required.' })
  @IsOptional()
  incidentDate?: string;

  @IsDateString({}, { message: 'Response due must be a valid date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Response due must be in YYYY-MM-DD format.',
  })
  @IsNotEmpty({ message: 'Response due is required.' })
  @IsOptional()
  responseDue?: string;

  @IsString({ message: 'Query details must be a string.' })
  @Matches(/\S/, { message: 'Query details is required.' })
  @MaxLength(2000, { message: 'Query details must be at most 2000 characters.' })
  @IsNotEmpty({ message: 'Query details is required.' })
  @IsOptional()
  queryDetails?: string;
}
