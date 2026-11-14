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
import { AppraisalCyclesService } from '../services/appraisal-cycles.service';
import { CreateAppraisalCycleDto } from '../dto/create-appraisal-cycle.dto';
import { UpdateAppraisalCycleDto } from '../dto/update-appraisal-cycle.dto';
import { AddParticipantsDto } from '../dto/add-participants.dto';
import { ListAppraisalCyclesQueryDto } from '../dto/list-appraisal-cycles-query.dto';
import { SendBulkReminderDto } from '../dto/send-bulk-reminder.dto';

@Controller('performance-management/appraisals/cycles')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class AppraisalCyclesController {
  constructor(
    private readonly appraisalCyclesService: AppraisalCyclesService,
  ) {}

  @Get('all')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
  )
  async listCycles(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListAppraisalCyclesQueryDto,
  ) {
    return this.appraisalCyclesService.listCycles(user.organizationId!, query);
  }

  @Post('add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.CREATED)
  async createCycle(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateAppraisalCycleDto,
  ) {
    return this.appraisalCyclesService.createCycle(
      user.organizationId!,
      user,
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
  async getCycle(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
  ) {
    return this.appraisalCyclesService.getCycle(user.organizationId!, cycleId);
  }

  @Patch('update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async updateCycle(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
    @Body() dto: UpdateAppraisalCycleDto,
  ) {
    return this.appraisalCyclesService.updateCycle(
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
    return this.appraisalCyclesService.removeCycle(
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
    return this.appraisalCyclesService.endCycle(
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
    return this.appraisalCyclesService.publishResults(
      user.organizationId!,
      user,
      cycleId,
    );
  }

  @Get('statistics/retrieve')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
  )
  async getStatistics(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
  ) {
    return this.appraisalCyclesService.getStatistics(
      user.organizationId!,
      cycleId,
    );
  }

  @Get('participants/all')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
  )
  async listParticipants(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
  ) {
    return this.appraisalCyclesService.listParticipants(
      user.organizationId!,
      cycleId,
    );
  }

  @Post('participants/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async addParticipants(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
    @Body() dto: AddParticipantsDto,
  ) {
    return this.appraisalCyclesService.addParticipants(
      user.organizationId!,
      user,
      cycleId,
      dto,
    );
  }

  @Post('participants/remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async removeParticipants(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
    @Body() dto: AddParticipantsDto,
  ) {
    return this.appraisalCyclesService.removeParticipants(
      user.organizationId!,
      user,
      cycleId,
      dto,
    );
  }

  @Get('options/retrieve')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
  )
  async getOptions(@CurrentUser() user: ICurrentUser) {
    return this.appraisalCyclesService.getCycleOptions(user.organizationId!);
  }

  @Post(':cycleId/participants/send-reminder')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async sendReminderToParticipants(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
    @Body() dto: SendBulkReminderDto,
  ) {
    return this.appraisalCyclesService.sendReminderToParticipants(
      user.organizationId!,
      user,
      cycleId,
      dto,
    );
  }
}
