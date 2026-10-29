import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import { CancelHireBeforeStartDateDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class CancelHireBeforeStartDateCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    CancelHireBeforeStartDateDetailsDto,
    RequestType.CANCEL_HIRE_BEFORE_START_DATE,
  ),
) {}
