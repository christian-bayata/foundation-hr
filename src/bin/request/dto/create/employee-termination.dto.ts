import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import { EmployeeTerminationDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class EmployeeTerminationCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    EmployeeTerminationDetailsDto,
    RequestType.EMPLOYEE_TERMINATION,
  ),
) {}
