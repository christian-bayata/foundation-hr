import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { IRequest } from '../../../../common';
import {
  ContactType,
  ContractDuration,
  EmployeeType,
  JobType,
  ProbationPeriod,
  WorkMode,
} from '../enum/employee.enum';
import {
  AcademicInfo,
  EmployeeUploadedDocument,
  FinanceInformation,
  HomeAddress,
  PersonalDetails,
} from '../entity/employee.schema';
import { EmployeeContactDto } from './onboarding-contacts.dto';

export interface SupervisorInput {
  id: string;
  name: string;
  avatar: string;
}

export class CreateEmployeeDto {
  @IsOptional()
  @IsEnum(EmployeeType, { message: 'Invalid employee type.' })
  employeeType?: EmployeeType;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  employmentDate?: string;

  @IsOptional()
  @IsString()
  inviteId?: string;

  @IsOptional()
  @IsEnum(ContractDuration, { message: 'Invalid contract duration.' })
  contractDuration?: ContractDuration;

  @IsOptional()
  @IsEnum(JobType, { message: 'Invalid employment type.' })
  jobType?: JobType;

  @IsOptional()
  @IsEnum(WorkMode, { message: 'Invalid work mode.' })
  workMode?: WorkMode;

  @IsOptional()
  probationPeriod?: ProbationPeriod;

  @IsOptional()
  @IsString()
  departmentCode?: string;

  @IsOptional()
  @IsString()
  jobTitleCode?: string;

  @IsOptional()
  @IsString()
  personalEmail?: string;

  @IsOptional()
  supervisorId?: string;

  @IsOptional()
  @IsNumber()
  salary?: number;

  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  req?: IRequest;
}

export class UpdateEmployeeDto extends CreateEmployeeDto {
  @IsOptional()
  personalDetails?: PersonalDetails;

  @IsOptional()
  homeAddress?: HomeAddress;

  @IsOptional()
  academicInfo?: AcademicInfo;

  @IsOptional()
  financeInformation?: FinanceInformation;

  @IsOptional()
  contacts?: EmployeeContactDto[];

  @IsOptional()
  documents: EmployeeUploadedDocument[];
}
