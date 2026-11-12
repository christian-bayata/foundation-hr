import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../../common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { RequiresSystemSettings } from '../../../../common/decorators/requires-system-settings.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../../common/guards/role.guard';
import { SystemRole } from '../../../generic/auth/enum/role.enum';
import { FeedbackCyclesService } from '../services/feedback-cycles.service';
import { List360FeedbackCyclesQueryDto } from '../dto/list-360-feedback-cycles-query.dto';
import { Create360FeedbackCycleDto } from '../dto/create-360-feedback-cycle.dto';
import { Update360FeedbackCycleDto } from '../dto/update-360-feedback-cycle.dto';

const FEEDBACK_CYCLE_READ_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
] as const;

@Controller('performance-management/360-feedback/cycles')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class FeedbackCyclesController {
  constructor(
    private readonly feedbackCyclesService: FeedbackCyclesService,
  ) {}

  @Get('all')
  @Roles(...FEEDBACK_CYCLE_READ_ROLES)
  async listCycles(
    @CurrentUser() user: ICurrentUser,
    @Query() query: List360FeedbackCyclesQueryDto,
  ) {
    return this.feedbackCyclesService.listCycles(
      user.organizationId!,
      query,
    );
  }

  @Post('add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.CREATED)
  async createCycle(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: Create360FeedbackCycleDto,
  ) {
    return this.feedbackCyclesService.createCycle(
      user.organizationId!,
      user,
      dto,
    );
  }

  @Get('retrieve')
  @Roles(...FEEDBACK_CYCLE_READ_ROLES)
  async getCycle(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
  ) {
    return this.feedbackCyclesService.getCycle(
      user.organizationId!,
      cycleId,
    );
  }

  @Patch('update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async updateCycle(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
    @Body() dto: Update360FeedbackCycleDto,
  ) {
    return this.feedbackCyclesService.updateCycle(
      user.organizationId!,
      user,
      cycleId,
      dto,
    );
  }

  @Delete('remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeCycle(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
  ) {
    return this.feedbackCyclesService.removeCycle(
      user.organizationId!,
      cycleId,
    );
  }

  @Post('end')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async endCycle(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
  ) {
    return this.feedbackCyclesService.endCycle(
      user.organizationId!,
      user,
      cycleId,
    );
  }

  @Post('publish-results')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async publishResults(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
  ) {
    return this.feedbackCyclesService.publishResults(
      user.organizationId!,
      user,
      cycleId,
    );
  }

  @Get('statistics/retrieve')
  @Roles(...FEEDBACK_CYCLE_READ_ROLES)
  async getStatistics(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
  ) {
    return this.feedbackCyclesService.getStatistics(
      user.organizationId!,
      cycleId,
    );
  }

  @Get('options/retrieve')
  @Roles(...FEEDBACK_CYCLE_READ_ROLES)
  async getOptions(@CurrentUser() user: ICurrentUser) {
    return this.feedbackCyclesService.getCycleOptions(user.organizationId!);
  }
}
