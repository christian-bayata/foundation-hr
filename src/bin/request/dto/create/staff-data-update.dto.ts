import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import { StaffDataUpdateDetailsDto } from '../forms';
import { withCreateRequestMetadata } from './create-request-base.dto';

export class StaffDataUpdateCreateRequestDto extends withCreateRequestMetadata(
  StaffDataUpdateDetailsDto,
  RequestType.STAFF_DATA_UPDATE,
) {}
