import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApprovalDeadline, LeaveExpiry } from '../enum/leave-management.enum';

export class UpdateLeaveManagementDto {
  @IsBoolean({ message: 'Allow carryover must be a boolean.' })
  @IsOptional()
  allowCarryover?: boolean;

  @IsBoolean({ message: 'Auto-approval flag must be a boolean.' })
  @IsOptional()
  autoApprovalEnabled?: boolean;

  @IsEnum(ApprovalDeadline, { message: 'Approval deadline is not valid.' })
  @IsOptional()
  approvalDeadline?: ApprovalDeadline | null;

  @IsBoolean({ message: 'Holidays count as leave flag must be a boolean.' })
  @IsOptional()
  holidaysCountAsLeave?: boolean;

  @IsNumber({}, { message: 'Max carry over limit must be a number.' })
  @IsOptional()
  maxCarryOverLimit?: number | null;

  @IsEnum(LeaveExpiry, { message: 'Leave expiry is not valid.' })
  @IsOptional()
  leaveExpiry?: LeaveExpiry | null;

  @IsArray({ message: 'Auto approved leave types must be an array.' })
  @IsString({ each: true, message: 'Auto approved leave types must be strings.' })
  @IsOptional()
  autoApprovedLeaveTypes?: string[];
}
