import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import {
  CompletionRequirement,
  DueDate,
  TaskType,
  WorkflowType,
} from '../enum/employee-profile.enum';

export class AddWorkflowStepDto {
  @IsEnum(WorkflowType, { message: 'Workflow type is not valid.' })
  @IsNotEmpty({ message: 'Workflow type is required.' })
  type: WorkflowType;

  @IsString({ message: 'Step name must be a string.' })
  @IsNotEmpty({ message: 'Step name is required.' })
  @MaxLength(120, { message: 'Step name must be at most 120 characters.' })
  stepName: string;

  @IsString({ message: 'Responsible party must be a string.' })
  @MaxLength(120, {
    message: 'Responsible party must be at most 120 characters.',
  })
  responsibleParty?: string;

  @IsEnum(TaskType, { message: 'Task type is not valid.' })
  taskType?: TaskType;

  @IsEnum(DueDate, { message: 'Due date is not valid.' })
  dueDate?: DueDate;

  @IsString({ message: 'Instructions must be a string.' })
  @MaxLength(2000, { message: 'Instructions must be at most 2000 characters.' })
  @IsOptional()
  instructions?: string;

  @IsArray({ message: 'Attachment URLs must be an array.' })
  @ArrayUnique({ message: 'Attachment URLs must not contain duplicates.' })
  @IsUrl(
    {},
    { each: true, message: 'One or more attachment URLs are invalid.' },
  )
  @IsOptional()
  attachmentUrls?: string[];

  @IsArray({ message: 'Completion requirements must be an array.' })
  @ArrayUnique({
    message: 'Completion requirements must not contain duplicates.',
  })
  @IsEnum(CompletionRequirement, {
    each: true,
    message: 'One or more completion requirements are not valid.',
  })
  @IsOptional()
  completionRequirements?: CompletionRequirement[];
}
