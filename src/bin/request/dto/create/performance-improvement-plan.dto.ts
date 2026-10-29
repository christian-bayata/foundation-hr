import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import { PerformanceImprovementPlanDetailsDto } from '../forms';
import {
  withCreateRequestMetadata,
  withFullEmployeeContext,
} from './create-request-base.dto';

export class PerformanceImprovementPlanCreateRequestDto extends withFullEmployeeContext(
  withCreateRequestMetadata(
    PerformanceImprovementPlanDetailsDto,
    RequestType.PERFORMANCE_IMPROVEMENT_PLAN,
  ),
) {}
