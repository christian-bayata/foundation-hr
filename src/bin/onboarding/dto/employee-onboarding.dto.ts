import { IsArray, IsBoolean, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CompletionRequirementTaskDto {
  @IsString({ message: 'Task step must be a string.' })
  @IsNotEmpty({ message: 'Task step is required.' })
  step: string;

  @IsBoolean({ message: 'isCompleted must be a boolean.' })
  isCompleted: boolean;
}

export class AddEmployeeOnboardingDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'Employee ID is required.' })
  employeeId: string;
}

export class UpdateEmployeeOnboardingStepDto {
  @IsString({ message: 'Step ID must be a string.' })
  @IsNotEmpty({ message: 'Step ID is required.' })
  stepId: string;

  @IsBoolean({ message: 'isCompleted must be a boolean.' })
  isCompleted: boolean;

  @IsArray({ message: 'Completion requirements must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => CompletionRequirementTaskDto)
  @IsNotEmpty({ message: 'Completion requirements are required.' })
  completionRequirements: CompletionRequirementTaskDto[];
}

export class RetrieveEmployeeOnboardingDto {
  @IsString({ message: 'Employee ID must be a string.' })
  @IsNotEmpty({ message: 'Employee ID is required.' })
  employeeId: string;
}
