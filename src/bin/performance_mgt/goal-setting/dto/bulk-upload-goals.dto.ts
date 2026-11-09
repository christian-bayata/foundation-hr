import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { GoalLevel } from '../enums/goal.enums';

export class BulkUploadGoalsDto {
  @IsNotEmpty({ message: 'Cycle id is required.' })
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId: string;

  @IsNotEmpty({ message: 'Level is required.' })
  @IsEnum(GoalLevel, { message: 'Level is not valid.' })
  level: GoalLevel;

  @IsOptional()
  @IsString({ message: 'Department id must be a string.' })
  departmentId?: string;

  @IsOptional()
  @IsString({ message: 'Employee id must be a string.' })
  employeeId?: string;
}
