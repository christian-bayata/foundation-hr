import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import { EmploymentAgreementExtensionDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class EmploymentAgreementExtensionCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    EmploymentAgreementExtensionDetailsDto,
    RequestType.EMPLOYMENT_AGREEMENT_EXTENSION,
  ),
) {}
