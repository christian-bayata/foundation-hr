import { RequestType } from '../../../../generic/setting/request-management/enum/request-management.enum';
import { ProbationConfirmationLetterDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class ProbationConfirmationLetterCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    ProbationConfirmationLetterDetailsDto,
    RequestType.PROBATION_CONFIRMATION_LETTER,
  ),
) {}
