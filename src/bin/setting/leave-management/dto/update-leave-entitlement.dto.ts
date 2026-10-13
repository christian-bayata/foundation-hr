import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { EmploymentType } from '../../employee-profiles/enum/employee-profile.enum';
import { LeaveAllocationMethod } from '../enum/leave-management.enum';

export class UpdateLeaveEntitlementDto {
  @IsEnum(LeaveAllocationMethod, {
    message: 'Leave allocation method is not valid.',
  })
  @IsOptional()
  allocationMethod?: LeaveAllocationMethod | null;

  @IsArray({ message: 'Employment types must be an array.' })
  @IsEnum(EmploymentType, {
    each: true,
    message: 'Employment type is not valid.',
  })
  @IsOptional()
  employmentTypes?: EmploymentType[];
}
