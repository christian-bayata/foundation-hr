import { RequestType } from '../../../../generic/setting/request-management/enum/request-management.enum';
import { RightToWorkDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class RightToWorkCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(RightToWorkDetailsDto, RequestType.RIGHT_TO_WORK),
) {}
