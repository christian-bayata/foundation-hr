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
import { FeedbackService } from '../services/feedback.service';
import { List360FeedbackQueryDto } from '../dto/list-360-feedback-query.dto';
import { NominateRespondentDto } from '../dto/nominate-respondent.dto';
import { SendReminderDto } from '../dto/send-reminder.dto';

const FEEDBACK_READ_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
  SystemRole.EMPLOYEE,
] as const;

@Controller('performance-management/360-feedback')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get('all')
  @Roles(...FEEDBACK_READ_ROLES)
  async listFeedback(
    @CurrentUser() user: ICurrentUser,
    @Query() query: List360FeedbackQueryDto,
  ) {
    return this.feedbackService.listFeedback(
      user.organizationId!,
      query,
    );
  }

  @Get('retrieve')
  @Roles(...FEEDBACK_READ_ROLES)
  async getFeedback(
    @CurrentUser() user: ICurrentUser,
    @Query('feedbackId') feedbackId: string,
  ) {
    return this.feedbackService.getFeedback(
      user.organizationId!,
      feedbackId,
    );
  }

  @Post('respondents/nominate')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS, SystemRole.DEPT_MANAGER, SystemRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  async nominateRespondent(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: NominateRespondentDto,
  ) {
    return this.feedbackService.nominateRespondent(
      user.organizationId!,
      user,
      dto,
    );
  }

  @Post('respondents/send-reminder')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS, SystemRole.DEPT_MANAGER)
  @HttpCode(HttpStatus.OK)
  async sendReminder(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: SendReminderDto,
  ) {
    return this.feedbackService.sendReminder(
      user.organizationId!,
      user,
      dto,
    );
  }

  @Get('reports/export')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  async exportReport(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { fileName, content } = await this.feedbackService.exportReport(
      user.organizationId!,
      cycleId,
    );

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(Buffer.from(content, 'utf-8'));
  }
}
