import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import { ProbationExtensionDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class ProbationExtensionCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    ProbationExtensionDetailsDto,
    RequestType.PROBATION_EXTENSION,
  ),
) {}
