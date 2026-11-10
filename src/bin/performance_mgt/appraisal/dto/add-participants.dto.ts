import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { AppraisalTargetPopulation } from '../enums/appraisal.enums';

export class AddParticipantsDto {
  @IsOptional()
  @IsArray({ message: 'Employee ids must be an array.' })
  @ArrayUnique({ message: 'Employee ids must be unique.' })
  @IsString({ each: true, message: 'Each employee id must be a string.' })
  employeeIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Department ids must be an array.' })
  @ArrayUnique({ message: 'Department ids must be unique.' })
  @IsString({ each: true, message: 'Each department id must be a string.' })
  departmentIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Department codes must be an array.' })
  @ArrayUnique({ message: 'Department codes must be unique.' })
  @IsString({ each: true, message: 'Each department code must be a string.' })
  departmentCodes?: string[];

  @IsOptional()
  @IsArray({ message: 'Job title codes must be an array.' })
  @ArrayUnique({ message: 'Job title codes must be unique.' })
  @IsString({ each: true, message: 'Each job title code must be a string.' })
  jobTitleCodes?: string[];

  @IsOptional()
  @IsBoolean({ message: 'Include all departments must be a boolean.' })
  includeAllDepartments?: boolean;

  @IsOptional()
  @IsEnum(AppraisalTargetPopulation, {
    message: 'Target population is not valid.',
  })
  targetPopulation?: AppraisalTargetPopulation;
}
