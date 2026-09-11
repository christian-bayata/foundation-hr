import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { IRequest } from '../../../common';
import { Department, EmployeeStatus, JobType } from '../enum/employee.enum';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName: string;

  @IsEmail()
  email: string;

  @IsEnum(Department, { message: 'Invalid department.' })
  department: Department;

  @IsString()
  @IsNotEmpty({ message: 'Role is required.' })
  role: string;

  @IsEnum(JobType, { message: 'Invalid job type.' })
  jobType: JobType;

  @IsOptional()
  @IsString()
  supervisor?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus, { message: 'Invalid status.' })
  status?: EmployeeStatus;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  req?: IRequest;
}
