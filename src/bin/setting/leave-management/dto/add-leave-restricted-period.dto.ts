import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AddLeaveRestrictedPeriodDto {
  @IsString({ message: 'Restricted period name must be a string.' })
  @IsNotEmpty({ message: 'Restricted period name is required.' })
  @MaxLength(120, {
    message: 'Restricted period name must be at most 120 characters.',
  })
  name: string;

  // @IsDateString({}, { message: 'Restricted period start date is not valid.' })
  @IsNotEmpty({ message: 'Restricted period start date is required.' })
  startDate: string;

  // @IsDateString({}, { message: 'Restricted period end date is not valid.' })
  @IsNotEmpty({ message: 'Restricted period end date is required.' })
  endDate: string;

  @IsArray({ message: 'Department codes must be an array.' })
  @IsString({ each: true, message: 'Department code must be a string.' })
  @IsOptional()
  departmentCodes?: string[];
}
