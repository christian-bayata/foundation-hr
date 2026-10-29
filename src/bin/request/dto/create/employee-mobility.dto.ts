import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import { EmployeeMobilityDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class EmployeeMobilityCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    EmployeeMobilityDetailsDto,
    RequestType.EMPLOYEE_MOBILITY,
  ),
) {}
