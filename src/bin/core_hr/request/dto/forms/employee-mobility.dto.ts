import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MobilityRequestType } from './form-option.enums';

export class EmployeeMobilityDetailsDto {
  @IsEnum(MobilityRequestType, {
    message: 'Mobility request type is not valid.',
  })
  @IsNotEmpty({ message: 'Mobility request type is required.' })
  mobilityRequestType: MobilityRequestType;

  @IsString({ message: 'Justification must be a string.' })
  @IsNotEmpty({ message: 'Justification is required.' })
  @Matches(/\S/, { message: 'Justification is required.' })
  @MaxLength(2000, {
    message: 'Justification must be at most 2000 characters.',
  })
  justification: string;
}
