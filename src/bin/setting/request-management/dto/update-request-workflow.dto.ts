import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestWorkflowStepDto } from './request-workflow-step.dto';

export class UpdateRequestWorkflowDto {
  @IsString({ message: 'Workflow name must be a string.' })
  @MaxLength(160, {
    message: 'Workflow name must be at most 160 characters.',
  })
  @IsOptional()
  name?: string;

  @IsBoolean({ message: 'Default flag must be a boolean.' })
  @IsOptional()
  isDefault?: boolean;

  @IsArray({ message: 'Steps must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => RequestWorkflowStepDto)
  @IsOptional()
  steps?: RequestWorkflowStepDto[];
}
