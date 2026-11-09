import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppResponse, Roles } from '../../../../common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../../common/guards/role.guard';
import { RequiresSystemSettings } from '../../../../common/decorators/requires-system-settings.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { SystemRole } from '../../../generic/auth/enum/role.enum';
import { GoalSettingsService } from '../services/goal-settings.service';
import { BulkUploadGoalsDto } from '../dto/bulk-upload-goals.dto';
import { GoalProgressDto } from '../dto/goal-progress.dto';

@Controller('performance-management/goal-settings')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class GoalSettingsController {
  constructor(private readonly goalSettingsService: GoalSettingsService) {}

  @Post('bulk-upload')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  async bulkUpload(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: BulkUploadGoalsDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.goalSettingsService.bulkUploadGoals(
      user.organizationId!,
      user,
      dto,
      file,
    );
  }

  @Patch('goals/progress')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  @HttpCode(HttpStatus.OK)
  async updateProgress(
    @CurrentUser() user: ICurrentUser,
    @Query('goalId') goalId: string,
    @Body() dto: GoalProgressDto,
  ) {
    return this.goalSettingsService.updateGoalProgress(
      user.organizationId!,
      goalId,
      dto,
      user,
    );
  }

  @Get('goals/progress-history')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  async getProgressHistory(
    @CurrentUser() user: ICurrentUser,
    @Query('goalId') goalId: string,
  ) {
    return this.goalSettingsService.getGoalProgressHistory(
      user.organizationId!,
      goalId,
    );
  }

  @Get('cycles')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
    SystemRole.EMPLOYEE,
  )
  async getCycles(@CurrentUser() user: ICurrentUser) {
    const cycles = await this.goalSettingsService.listCycles(
      user.organizationId!,
    );
    return AppResponse.success('Cycles retrieved', 200, cycles);
  }
}
