import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { IRequest } from '../../../common';
import {
  ContractDuration,
  Department,
  JobType,
  WorkMode,
} from '../enum/employee.enum';

export class StepTwoDto {
  @IsEnum(ContractDuration, { message: 'Invalid contract duration.' })
  @IsNotEmpty({ message: 'Contract duration is required.' })
  contractDuration: ContractDuration;

  @IsEnum(JobType, { message: 'Invalid employment type.' })
  @IsNotEmpty({ message: 'Employment type is required.' })
  jobType: JobType;

  @IsEnum(WorkMode, { message: 'Invalid work mode.' })
  @IsNotEmpty({ message: 'Work mode is required.' })
  workMode: WorkMode;

  @IsOptional()
  @IsString()
  probationPeriod?: string;

  @IsEnum(Department, { message: 'Invalid department.' })
  @IsNotEmpty({ message: 'Department is required.' })
  department: Department;

  @IsString()
  @IsNotEmpty({ message: 'Job title is required.' })
  jobTitle: string;

  @IsOptional()
  @IsString()
  supervisor?: string;

  @IsOptional()
  @IsNumber()
  salary?: number;

  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  req?: IRequest;
}
