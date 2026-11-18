import { RequestType } from '../../../../generic/setting/request-management/enum/request-management.enum';
import { EmploymentAgreementAmendmentDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class EmploymentAgreementAmendmentCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    EmploymentAgreementAmendmentDetailsDto,
    RequestType.EMPLOYMENT_AGREEMENT_AMENDMENT,
  ),
) {}
