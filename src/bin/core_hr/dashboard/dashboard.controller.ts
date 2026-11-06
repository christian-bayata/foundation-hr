import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AppResponse, Roles } from '../../../common';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequiresSystemSettings } from '../../../common/decorators/requires-system-settings.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { SystemRole } from '../../generic/auth/enum/role.enum';
import { DashboardService } from './dashboard.service';
import {
  DashboardEmployeeDistributionQueryDto,
  DashboardOnboardingProgressQueryDto,
  DashboardRecentActivitiesQueryDto,
  DashboardSummaryQueryDto,
} from './dto/dashboard.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveSummary(
    @CurrentUser() user: ICurrentUser,
    @Query() query: DashboardSummaryQueryDto,
  ) {
    const data = await this.dashboardService.getSummary(
      user.organizationId!,
      query,
    );

    return AppResponse.success(
      'Dashboard summary retrieved successfully',
      200,
      data,
    );
  }

  @Get('onboarding-progress/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveOnboardingProgress(
    @CurrentUser() user: ICurrentUser,
    @Query() query: DashboardOnboardingProgressQueryDto,
  ) {
    const data = await this.dashboardService.getOnboardingProgress(
      user.organizationId!,
      query,
    );

    return AppResponse.success(
      'Dashboard onboarding progress retrieved successfully',
      200,
      data,
    );
  }

  @Get('employee-distribution/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveEmployeeDistribution(
    @CurrentUser() user: ICurrentUser,
    @Query() query: DashboardEmployeeDistributionQueryDto,
  ) {
    const data = await this.dashboardService.getEmployeeDistribution(
      user.organizationId!,
      query,
    );

    return AppResponse.success(
      'Dashboard employee distribution retrieved successfully',
      200,
      data,
    );
  }

  @Get('recent-activities/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRecentActivities(
    @CurrentUser() user: ICurrentUser,
    @Query() query: DashboardRecentActivitiesQueryDto,
  ) {
    const data = await this.dashboardService.getRecentActivities(
      user.organizationId!,
      query,
    );

    return AppResponse.success(
      'Dashboard recent activities retrieved successfully',
      200,
      data,
    );
  }
}
