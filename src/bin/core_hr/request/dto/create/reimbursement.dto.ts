import { RequestType } from '../../../../generic/setting/request-management/enum/request-management.enum';
import { ReimbursementDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class ReimbursementCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(ReimbursementDetailsDto, RequestType.REIMBURSEMENT),
) {}
