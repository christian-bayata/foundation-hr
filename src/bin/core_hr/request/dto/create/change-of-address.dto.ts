import { RequestType } from '../../../../generic/setting/request-management/enum/request-management.enum';
import { ChangeOfAddressDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class ChangeOfAddressCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    ChangeOfAddressDetailsDto,
    RequestType.CHANGE_OF_ADDRESS,
  ),
) {}
