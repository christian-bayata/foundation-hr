import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { RequiresSystemSettings } from '../../../common/decorators/requires-system-settings.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { SystemRole } from '../../generic/auth/enum/role.enum';
import { GoalPlansService } from '../services/goal-plans.service';
import { GoalPlanDto } from '../dto/goal-plan.dto';
import { EndGoalPlanCycleDto } from '../dto/goal-progress.dto';

@Controller('performance-management/goal-plans')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class GoalPlansController {
  constructor(private readonly goalPlansService: GoalPlansService) {}

  @Get()
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async listGoalPlans(
    @CurrentUser() user: ICurrentUser,
    @Query() filters: Record<string, unknown>,
  ) {
    return this.goalPlansService.listGoalPlans(user.organizationId!, filters);
  }

  @Get(':goalPlanId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async getGoalPlanDetails(
    @CurrentUser() user: ICurrentUser,
    @Param('goalPlanId') goalPlanId: string,
  ) {
    return this.goalPlansService.getGoalPlanDetails(
      user.organizationId!,
      goalPlanId,
    );
  }

  @Patch(':goalPlanId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateGoalPlan(
    @CurrentUser() user: ICurrentUser,
    @Param('goalPlanId') goalPlanId: string,
    @Body() dto: GoalPlanDto,
  ) {
    return this.goalPlansService.updateGoalPlan(
      user.organizationId!,
      goalPlanId,
      dto,
    );
  }

  @Post(':goalPlanId/end-cycle')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async endGoalPlanCycle(
    @CurrentUser() user: ICurrentUser,
    @Param('goalPlanId') goalPlanId: string,
    @Body() dto: EndGoalPlanCycleDto,
  ) {
    return this.goalPlansService.endGoalPlanCycle(
      user.organizationId!,
      goalPlanId,
      dto,
    );
  }
}
