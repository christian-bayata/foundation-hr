import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestType } from '../enum/request-management.enum';
import { RequestWorkflowStepDto } from './request-workflow-step.dto';

export class AddRequestWorkflowDto {
  @IsEnum(RequestType, { message: 'Request type is not valid.' })
  @IsNotEmpty({ message: 'Request type is required.' })
  requestType: RequestType;

  @IsString({ message: 'Workflow name must be a string.' })
  @MaxLength(160, {
    message: 'Workflow name must be at most 160 characters.',
  })
  @IsOptional()
  name?: string;

  @IsArray({ message: 'Steps must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => RequestWorkflowStepDto)
  @IsOptional()
  steps?: RequestWorkflowStepDto[];
}
