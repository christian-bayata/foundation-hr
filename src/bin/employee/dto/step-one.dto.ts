import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { IRequest } from '../../../common';
import { EmployeeType } from '../enum/employee.enum';

export class StepOneDto {
  @IsEnum(EmployeeType, { message: 'Invalid employee type.' })
  @IsNotEmpty({ message: 'Employee type is required.' })
  employeeType: EmployeeType;

  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  @IsNotEmpty({ message: 'Employee ID is required.' })
  employeeId: string;

  @IsEmail()
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Employment date is required.' })
  employmentDate: string;

  req?: IRequest;
}
