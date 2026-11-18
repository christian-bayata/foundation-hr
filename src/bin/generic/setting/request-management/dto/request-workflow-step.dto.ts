import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { RequestStepActionKind } from '../../../../core_hr/request/enum/request-flow.enum';
import { SystemRole } from '../../../auth/enum/role.enum';

export class RequestWorkflowStepDto {
  @IsString({ message: 'Responsible party must be a string.' })
  @IsNotEmpty({ message: 'Responsible party is required.' })
  @MaxLength(120, {
    message: 'Responsible party must be at most 120 characters.',
  })
  responsibleParty: string;

  @IsInt({ message: 'Step order must be an integer.' })
  @Min(1, { message: 'Step order must be at least 1.' })
  @IsOptional()
  order?: number;

  @IsEnum(RequestStepActionKind)
  @IsOptional()
  action?: RequestStepActionKind;

  @IsString()
  @IsOptional()
  assigneeUserId?: string;

  @IsEnum(SystemRole)
  @IsOptional()
  assigneeRole?: SystemRole;

  @IsString()
  @IsOptional()
  assigneeEmployeeId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  dueHours?: number;

  @IsBoolean()
  @IsOptional()
  delegatable?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyRequester?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresDocument?: boolean;
}
