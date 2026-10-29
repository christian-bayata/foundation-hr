import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import { ConfirmationRequestDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class ConfirmationRequestCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    ConfirmationRequestDetailsDto,
    RequestType.CONFIRMATION_REQUEST,
  ),
) {}
