import { IsArray, IsNotEmpty, IsString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowType } from '../enum/employee-profile.enum';

export class WorkflowStepOrderDto {
  @IsString({ message: 'Step id must be a string.' })
  @IsNotEmpty({ message: 'Step id is required.' })
  stepId: string;
}

export class UpdateWorkflowOrderDto {
  @IsEnum(WorkflowType, { message: 'Workflow type is not valid.' })
  @IsNotEmpty({ message: 'Workflow type is required.' })
  type: WorkflowType;

  @IsArray({ message: 'Steps must be an array.' })
  @IsNotEmpty({ message: 'Steps are required.' })
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepOrderDto)
  steps: WorkflowStepOrderDto[];
}
