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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../../common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { RequiresSystemSettings } from '../../../common/decorators/requires-system-settings.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { SystemRole } from '../../generic/auth/enum/role.enum';
import { GoalsService } from '../services/goals.service';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { UpdateGoalDto } from '../dto/update-goal.dto';
import { ListGoalsQueryDto } from '../dto/list-goals-query.dto';
import { BulkUploadGoalsDto } from '../dto/bulk-upload-goals.dto';
import { GoalProgressDto } from '../dto/goal-progress.dto';

@Controller('performance-management/goals')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  async listGoals(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListGoalsQueryDto,
  ) {
    return this.goalsService.listGoals(user.organizationId!, query);
  }

  @Post()
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createGoal(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateGoalDto,
  ) {
    return this.goalsService.createGoal(user.organizationId!, user, dto);
  }

  @Get(':goalId')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  async getGoal(
    @CurrentUser() user: ICurrentUser,
    @Param('goalId') goalId: string,
  ) {
    return this.goalsService.getGoal(user.organizationId!, goalId);
  }

  @Patch(':goalId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateGoal(
    @CurrentUser() user: ICurrentUser,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.updateGoal(user.organizationId!, user, goalId, dto);
  }

  @Delete(':goalId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeGoal(
    @CurrentUser() user: ICurrentUser,
    @Param('goalId') goalId: string,
  ) {
    return this.goalsService.removeGoal(user.organizationId!, goalId);
  }

  @Post('bulk-upload')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  async bulkUploadGoals(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: BulkUploadGoalsDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.goalsService.bulkUploadGoals(
      user.organizationId!,
      user,
      dto,
      file,
    );
  }

  @Patch(':goalId/progress')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  @HttpCode(HttpStatus.OK)
  async updateGoalProgress(
    @CurrentUser() user: ICurrentUser,
    @Param('goalId') goalId: string,
    @Body() dto: GoalProgressDto,
  ) {
    return this.goalsService.updateGoalProgress(
      user.organizationId!,
      goalId,
      dto,
      user,
    );
  }

  @Get(':goalId/progress-history')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  async getGoalProgressHistory(
    @CurrentUser() user: ICurrentUser,
    @Param('goalId') goalId: string,
  ) {
    return this.goalsService.getGoalProgressHistory(
      user.organizationId!,
      goalId,
    );
  }
}
