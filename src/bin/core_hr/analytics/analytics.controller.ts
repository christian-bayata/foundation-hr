import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AppResponse, Roles } from '../../../common';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequiresSystemSettings } from '../../../common/decorators/requires-system-settings.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { SystemRole } from '../../generic/auth/enum/role.enum';
import { AnalyticsService } from './analytics.service';
import {
  EmployeeAnalysisQueryDto,
  LeaveAnalysisQueryDto,
  OffboardingAnalysisQueryDto,
  OnboardingAnalysisQueryDto,
} from './dto/analytics.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveOverview(@CurrentUser() user: ICurrentUser) {
    const data = await this.analyticsService.getOverview(user.organizationId!);
    return AppResponse.success(
      'Report overview retrieved successfully',
      200,
      data,
    );
  }

  @Get('employee-analysis/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveEmployeeAnalysis(
    @CurrentUser() user: ICurrentUser,
    @Query() query: EmployeeAnalysisQueryDto,
  ) {
    const data = await this.analyticsService.getEmployeeAnalysis(
      user.organizationId!,
      query,
    );
    return AppResponse.success(
      'Employee analysis retrieved successfully',
      200,
      data,
    );
  }

  @Get('onboarding-analysis/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveOnboardingAnalysis(
    @CurrentUser() user: ICurrentUser,
    @Query() query: OnboardingAnalysisQueryDto,
  ) {
    const data = await this.analyticsService.getOnboardingAnalysis(
      user.organizationId!,
      query,
    );
    return AppResponse.success(
      'Onboarding analysis retrieved successfully',
      200,
      data,
    );
  }

  @Get('leave-analysis/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveLeaveAnalysis(
    @CurrentUser() user: ICurrentUser,
    @Query() query: LeaveAnalysisQueryDto,
  ) {
    const data = await this.analyticsService.getLeaveAnalysis(
      user.organizationId!,
      query,
    );
    return AppResponse.success(
      'Leave analysis retrieved successfully',
      200,
      data,
    );
  }

  @Get('offboarding-analysis/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveOffboardingAnalysis(
    @CurrentUser() user: ICurrentUser,
    @Query() query: OffboardingAnalysisQueryDto,
  ) {
    const data = await this.analyticsService.getOffboardingAnalysis(
      user.organizationId!,
      query,
    );
    return AppResponse.success(
      'Offboarding analysis retrieved successfully',
      200,
      data,
    );
  }
}
