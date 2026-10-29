import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import { EmploymentAgreementRenewalDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class EmploymentAgreementRenewalCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    EmploymentAgreementRenewalDetailsDto,
    RequestType.EMPLOYMENT_AGREEMENT_RENEWAL,
  ),
) {}
