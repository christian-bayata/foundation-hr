import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OnboardingStatus } from '../../onboarding/enum/onboarding-status.enum';
import {
  DashboardActivityType,
  DashboardDistributionDimension,
  DashboardInterval,
} from '../enum/dashboard.enum';

export class DashboardSummaryQueryDto {
  @IsOptional()
  @IsEnum(DashboardInterval, { message: 'Interval is not valid.' })
  interval?: DashboardInterval;
}

export class DashboardOnboardingProgressQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Batch must be an integer.' })
  @Min(1, { message: 'Batch must be at least 1.' })
  batch?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  @Max(50, { message: 'Limit must be at most 50.' })
  limit?: number;

  @IsOptional()
  @IsEnum(OnboardingStatus, { message: 'Status is not valid.' })
  status?: OnboardingStatus;
}

export class DashboardEmployeeDistributionQueryDto {
  @IsOptional()
  @IsEnum(DashboardDistributionDimension, {
    message: 'Distribution dimension is not valid.',
  })
  dimension?: DashboardDistributionDimension;
}

export class DashboardRecentActivitiesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Batch must be an integer.' })
  @Min(1, { message: 'Batch must be at least 1.' })
  batch?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  @Max(50, { message: 'Limit must be at most 50.' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Days must be an integer.' })
  @Min(1, { message: 'Days must be at least 1.' })
  @Max(365, { message: 'Days must be at most 365.' })
  days?: number;

  @IsOptional()
  @IsEnum(DashboardActivityType, { message: 'Activity type is not valid.' })
  type?: DashboardActivityType;
}
