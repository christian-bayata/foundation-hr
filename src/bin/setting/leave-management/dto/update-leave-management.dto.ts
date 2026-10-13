import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ApprovalDeadline } from '../enum/leave-management.enum';

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
}
