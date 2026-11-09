import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Patch,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../../common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../../common/guards/role.guard';
import { RequiresSystemSettings } from '../../../../common/decorators/requires-system-settings.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { SystemRole } from '../../../generic/auth/enum/role.enum';
import { GoalSettingsService } from '../services/goal-settings.service';
import { CreateOrganisationGoalDto } from '../dto/create-organisation-goal.dto';
import { UpdateOrganisationGoalDto } from '../dto/update-organisation-goal.dto';
import { ListGoalsQueryDto } from '../dto/list-goals-query.dto';

@Controller('performance-management/goal-settings/organisation-goals')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class OrganisationGoalsController {
  constructor(private readonly goalSettingsService: GoalSettingsService) {}

  @Get('all')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async list(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListGoalsQueryDto,
  ) {
    return this.goalSettingsService.listOrganisationGoals(
      user.organizationId!,
      query,
    );
  }

  @Post('add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateOrganisationGoalDto,
  ) {
    return this.goalSettingsService.createOrganisationGoal(
      user.organizationId!,
      user,
      dto,
    );
  }

  @Get('retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async get(
    @CurrentUser() user: ICurrentUser,
    @Query('goalId') goalId: string,
  ) {
    return this.goalSettingsService.getOrganisationGoal(
      user.organizationId!,
      goalId,
    );
  }

  @Patch('update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: ICurrentUser,
    @Query('goalId') goalId: string,
    @Body() dto: UpdateOrganisationGoalDto,
  ) {
    return this.goalSettingsService.updateOrganisationGoal(
      user.organizationId!,
      user,
      goalId,
      dto,
    );
  }

  @Delete('remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: ICurrentUser,
    @Query('goalId') goalId: string,
  ) {
    return this.goalSettingsService.removeOrganisationGoal(
      user.organizationId!,
      goalId,
    );
  }
}
