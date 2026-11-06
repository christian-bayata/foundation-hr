import { IsArray, IsBoolean, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CompletionRequirementTaskDto {
  @IsString({ message: 'Task step must be a string.' })
  @IsNotEmpty({ message: 'Task step is required.' })
  step: string;

  @IsBoolean({ message: 'isCompleted must be a boolean.' })
  isCompleted: boolean;
}

export class CompleteWorkflowStepDto {
  @IsArray({ message: 'Completion requirements must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => CompletionRequirementTaskDto)
  @IsNotEmpty({ message: 'Completion requirements are required.' })
  completionRequirements: CompletionRequirementTaskDto[];

  @IsBoolean({ message: 'isCompleted must be a boolean.' })
  @IsNotEmpty({ message: 'isCompleted is required.' })
  isCompleted: boolean;
}
