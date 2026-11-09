import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { CreateEmployeeGoalDto } from '../dto/create-employee-goal.dto';
import { UpdateEmployeeGoalDto } from '../dto/update-employee-goal.dto';
import { ListGoalsQueryDto } from '../dto/list-goals-query.dto';

@Controller('performance-management/goal-settings/employees')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class EmployeeGoalsController {
  constructor(private readonly goalSettingsService: GoalSettingsService) {}

  @Get()
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  async listEmployees(
    @CurrentUser() user: ICurrentUser,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.goalSettingsService.listEmployees(
      user.organizationId!,
      search,
      departmentId,
    );
  }

  @Get(':employeeId/goals')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  async listEmployeeGoals(
    @CurrentUser() user: ICurrentUser,
    @Param('employeeId') employeeId: string,
    @Query() query: ListGoalsQueryDto,
  ) {
    return this.goalSettingsService.listEmployeeGoals(
      user.organizationId!,
      employeeId,
      query,
    );
  }

  @Post(':employeeId/goals')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.DEPT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createEmployeeGoal(
    @CurrentUser() user: ICurrentUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmployeeGoalDto,
  ) {
    return this.goalSettingsService.createEmployeeGoal(
      user.organizationId!,
      user,
      employeeId,
      dto,
    );
  }

  @Get(':employeeId/goals/:goalId')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  async getEmployeeGoal(
    @CurrentUser() user: ICurrentUser,
    @Param('employeeId') employeeId: string,
    @Param('goalId') goalId: string,
  ) {
    return this.goalSettingsService.getEmployeeGoal(
      user.organizationId!,
      employeeId,
      goalId,
    );
  }

  @Patch(':employeeId/goals/:goalId')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  @HttpCode(HttpStatus.OK)
  async updateEmployeeGoal(
    @CurrentUser() user: ICurrentUser,
    @Param('employeeId') employeeId: string,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateEmployeeGoalDto,
  ) {
    return this.goalSettingsService.updateEmployeeGoal(
      user.organizationId!,
      user,
      employeeId,
      goalId,
      dto,
    );
  }

  @Delete(':employeeId/goals/:goalId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.DEPT_MANAGER)
  @HttpCode(HttpStatus.OK)
  async removeEmployeeGoal(
    @CurrentUser() user: ICurrentUser,
    @Param('employeeId') employeeId: string,
    @Param('goalId') goalId: string,
  ) {
    return this.goalSettingsService.removeEmployeeGoal(
      user.organizationId!,
      employeeId,
      goalId,
    );
  }
}
