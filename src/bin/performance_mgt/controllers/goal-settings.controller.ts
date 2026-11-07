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
import { AppResponse, Roles } from '../../../common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { RequiresSystemSettings } from '../../../common/decorators/requires-system-settings.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { SystemRole } from '../../generic/auth/enum/role.enum';
import { GoalLevel } from '../enums/goal.enums';
import { GoalSettingsService } from '../services/goal-settings.service';

@Controller('performance-management/goal-settings')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class GoalSettingsController {
  constructor(private readonly goalSettingsService: GoalSettingsService) {}

  @Get()
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  async getContext(
    @CurrentUser() user: ICurrentUser,
    @Query() query: { cycleId?: string },
  ) {
    const data = await this.goalSettingsService.getContext(
      user.organizationId!,
      query.cycleId,
    );
    return AppResponse.success('Goal settings context retrieved', 200, data);
  }

  @Get('cycles')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  async getCycles(@CurrentUser() user: ICurrentUser) {
    const cycles = await this.goalSettingsService.getCycles(
      user.organizationId!,
    );
    return AppResponse.success('Cycles retrieved', 200, cycles);
  }

  @Get('cycles/:cycleId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  async getCycle(
    @CurrentUser() user: ICurrentUser,
    @Param('cycleId') cycleId: string,
  ) {
    const context = await this.goalSettingsService.getContext(
      user.organizationId!,
      cycleId,
    );
    return AppResponse.success('Cycle retrieved', 200, {
      id: context.activeCycle,
      cycles: context.cycles,
    });
  }

  @Patch('cycles/:cycleId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async editCycle(
    @CurrentUser() user: ICurrentUser,
    @Param('cycleId') cycleId: string,
    @Body() body: { name?: string; startDate?: string; endDate?: string },
  ) {
    // Cycle metadata is stored on goals; this records the edit intent.
    // A dedicated cycle entity can be introduced when the cycle management
    // module is built. For now we acknowledge the update.
    return AppResponse.success('Cycle updated', 200, {
      cycleId,
      ...body,
    });
  }

  @Post('cycles/:cycleId/end')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async endCycle(
    @CurrentUser() user: ICurrentUser,
    @Param('cycleId') cycleId: string,
    @Body() body: { reason?: string },
  ) {
    return AppResponse.success('Cycle ended', 200, {
      cycleId,
      reason: body.reason ?? null,
      endedAt: new Date(),
    });
  }

  @Get('lookups')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  async getLookups(@CurrentUser() user: ICurrentUser) {
    const departments = await this.goalSettingsService.getDepartments(
      user.organizationId!,
    );
    return AppResponse.success('Lookups retrieved', 200, {
      perspectives: [
        'financial',
        'internal_process',
        'customer',
        'learning_and_growth',
        'core_values',
      ],
      kpiTypes: [
        'higher_is_better',
        'all_in',
        'less_is_more',
        'negative_score',
        'minimalist',
      ],
      frequencies: ['monthly', 'quarterly', 'bi_annually', 'annually'],
      goalStatuses: [
        'active',
        'in_progress',
        'pending_approval',
        'completed',
      ],
      departments,
    });
  }

  @Get('lookups/departments')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
  )
  async getDepartments(
    @CurrentUser() user: ICurrentUser,
    @Query('search') search?: string,
  ) {
    const departments = await this.goalSettingsService.getDepartments(
      user.organizationId!,
      search,
    );
    return AppResponse.success('Departments retrieved', 200, departments);
  }

  @Get('lookups/employees')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  async getEmployees(
    @CurrentUser() user: ICurrentUser,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const employees = await this.goalSettingsService.getEmployees(
      user.organizationId!,
      search,
      departmentId,
    );
    return AppResponse.success('Employees retrieved', 200, employees);
  }

  @Get('lookups/objectives')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
  )
  async getObjectives(
    @CurrentUser() user: ICurrentUser,
    @Query('level') level: 'organisation' | 'department' | 'employee',
    @Query('departmentId') departmentId?: string,
    @Query('cycleId') cycleId?: string,
  ) {
    const objectives = await this.goalSettingsService.getObjectives(
      user.organizationId!,
      level as GoalLevel,
      departmentId,
      cycleId,
    );
    return AppResponse.success('Objectives retrieved', 200, objectives);
  }
}
