import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import { QueryRequestDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class QueryRequestCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(QueryRequestDetailsDto, RequestType.QUERY_REQUEST),
) {}
