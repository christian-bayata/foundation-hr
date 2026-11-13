import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../../../common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { RequiresSystemSettings } from '../../../../common/decorators/requires-system-settings.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../../common/guards/role.guard';
import { SystemRole } from '../../../generic/auth/enum/role.enum';
import { AppraisalParticipantsService } from '../services/appraisal-participants.service';
import { ListCalibrationSessionsQueryDto } from '../dto/list-calibration-sessions-query.dto';
import { SendReminderDto } from '../dto/send-reminder.dto';

const PARTICIPANT_READ_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
] as const;

const PARTICIPANT_WRITE_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
] as const;

@Controller('performance-management/appraisals/participants')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class AppraisalParticipantsController {
  constructor(
    private readonly appraisalParticipantsService: AppraisalParticipantsService,
  ) {}

  @Get(':participantId/retrieve')
  @Roles(...PARTICIPANT_READ_ROLES)
  async getParticipantDetail(
    @CurrentUser() user: ICurrentUser,
    @Query('participantId') participantId: string,
  ) {
    return this.appraisalParticipantsService.getParticipantDetail(
      user.organizationId!,
      participantId,
    );
  }

  @Get(':participantId/responses')
  @Roles(...PARTICIPANT_READ_ROLES)
  async getParticipantResponses(
    @CurrentUser() user: ICurrentUser,
    @Query('participantId') participantId: string,
  ) {
    return this.appraisalParticipantsService.getParticipantResponses(
      user.organizationId!,
      participantId,
    );
  }

  @Get(':participantId/audit-log')
  @Roles(...PARTICIPANT_READ_ROLES)
  async getParticipantAuditLog(
    @CurrentUser() user: ICurrentUser,
    @Query('participantId') participantId: string,
    @Query() query: ListCalibrationSessionsQueryDto,
  ) {
    return this.appraisalParticipantsService.getParticipantAuditLog(
      user.organizationId!,
      participantId,
      query,
    );
  }

  @Get(':participantId/export-summary')
  @Roles(...PARTICIPANT_READ_ROLES)
  async exportParticipantSummary(
    @CurrentUser() user: ICurrentUser,
    @Query('participantId') participantId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { fileName, content } =
      await this.appraisalParticipantsService.exportParticipantSummary(
        user.organizationId!,
        participantId,
      );

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(Buffer.from(content, 'utf-8'));
  }

  @Post(':participantId/send-reminder')
  @Roles(...PARTICIPANT_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async sendReminderToParticipant(
    @CurrentUser() user: ICurrentUser,
    @Query('participantId') participantId: string,
    @Body() dto: SendReminderDto,
  ) {
    return this.appraisalParticipantsService.sendReminderToParticipant(
      user.organizationId!,
      user,
      participantId,
      dto,
    );
  }

  @Get(':participantId/view-in-calibration')
  @Roles(...PARTICIPANT_READ_ROLES)
  async viewParticipantInCalibration(
    @CurrentUser() user: ICurrentUser,
    @Query('participantId') participantId: string,
  ) {
    return this.appraisalParticipantsService.viewParticipantInCalibration(
      user.organizationId!,
      participantId,
    );
  }
}
