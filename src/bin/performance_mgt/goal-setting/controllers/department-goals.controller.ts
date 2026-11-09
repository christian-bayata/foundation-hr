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
import { CreateDepartmentGoalDto } from '../dto/create-department-goal.dto';
import { UpdateDepartmentGoalDto } from '../dto/update-department-goal.dto';
import { ListGoalsQueryDto } from '../dto/list-goals-query.dto';

@Controller('performance-management/goal-settings/department-goals')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class DepartmentGoalsController {
  constructor(private readonly goalSettingsService: GoalSettingsService) {}

  @Get('departments/all')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
  )
  async listDepartments(
    @CurrentUser() user: ICurrentUser,
    @Query('search') search?: string,
  ) {
    return this.goalSettingsService.listDepartments(
      user.organizationId!,
      search,
    );
  }

  @Get('all')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
  )
  async listDepartmentGoals(
    @CurrentUser() user: ICurrentUser,
    @Query('departmentId') departmentId: string,
    @Query() query: ListGoalsQueryDto,
  ) {
    return this.goalSettingsService.listDepartmentGoals(
      user.organizationId!,
      departmentId,
      query,
    );
  }

  @Post('add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.DEPT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createDepartmentGoal(
    @CurrentUser() user: ICurrentUser,
    @Query('departmentId') departmentId: string,
    @Body() dto: CreateDepartmentGoalDto,
  ) {
    return this.goalSettingsService.createDepartmentGoal(
      user.organizationId!,
      user,
      departmentId,
      dto,
    );
  }

  @Get('retrieve')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
  )
  async getDepartmentGoal(
    @CurrentUser() user: ICurrentUser,
    @Query('departmentId') departmentId: string,
    @Query('goalId') goalId: string,
  ) {
    return this.goalSettingsService.getDepartmentGoal(
      user.organizationId!,
      departmentId,
      goalId,
    );
  }

  @Patch('update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.DEPT_MANAGER)
  @HttpCode(HttpStatus.OK)
  async updateDepartmentGoal(
    @CurrentUser() user: ICurrentUser,
    @Query('departmentId') departmentId: string,
    @Query('goalId') goalId: string,
    @Body() dto: UpdateDepartmentGoalDto,
  ) {
    return this.goalSettingsService.updateDepartmentGoal(
      user.organizationId!,
      user,
      departmentId,
      goalId,
      dto,
    );
  }

  @Delete('remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.DEPT_MANAGER)
  @HttpCode(HttpStatus.OK)
  async removeDepartmentGoal(
    @CurrentUser() user: ICurrentUser,
    @Query('departmentId') departmentId: string,
    @Query('goalId') goalId: string,
  ) {
    return this.goalSettingsService.removeDepartmentGoal(
      user.organizationId!,
      departmentId,
      goalId,
    );
  }
}
