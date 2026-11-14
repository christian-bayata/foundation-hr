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
import { CalibrationSessionsService } from '../services/calibration-sessions.service';
import { CreateCalibrationSessionDto } from '../dto/create-calibration-session.dto';
import { UpdateCalibrationSessionDto } from '../dto/update-calibration-session.dto';
import { ListCalibrationSessionsQueryDto } from '../dto/list-calibration-sessions-query.dto';

const CALIBRATION_READ_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
] as const;

const CALIBRATION_WRITE_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
] as const;

@Controller('performance-management/calibration/sessions')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class CalibrationSessionsController {
  constructor(private readonly sessionsService: CalibrationSessionsService) {}

  @Get('all')
  @Roles(...CALIBRATION_READ_ROLES)
  async listSessions(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListCalibrationSessionsQueryDto,
  ) {
    return this.sessionsService.listSessions(user.organizationId!, query);
  }

  @Get('retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getSession(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.sessionsService.getSession(user.organizationId!, sessionId);
  }

  @Post('add')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateCalibrationSessionDto,
  ) {
    return this.sessionsService.createSession(user.organizationId!, user, dto);
  }

  @Patch('update')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async updateSession(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
    @Body() dto: UpdateCalibrationSessionDto,
  ) {
    return this.sessionsService.updateSession(
      user.organizationId!,
      user,
      sessionId,
      dto,
    );
  }

  @Delete('remove')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async removeSession(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.sessionsService.removeSession(user.organizationId!, sessionId);
  }

  @Post('start')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async startSession(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.sessionsService.startSession(
      user.organizationId!,
      user,
      sessionId,
    );
  }

  @Post('finalize')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async finaliseSession(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.sessionsService.finaliseSession(
      user.organizationId!,
      user,
      sessionId,
    );
  }

  @Post('lock')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async lockSession(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.sessionsService.lockSession(
      user.organizationId!,
      user,
      sessionId,
    );
  }

  @Post('close')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async closeSession(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.sessionsService.closeSession(
      user.organizationId!,
      user,
      sessionId,
    );
  }

  @Post('reopen')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async reopenSession(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.sessionsService.reopenSession(
      user.organizationId!,
      user,
      sessionId,
    );
  }

  @Get('summary/retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getSummary(
    @CurrentUser() user: ICurrentUser,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.sessionsService.getSummary(user.organizationId!, cycleId);
  }

  @Post('duplicate')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async duplicateSession(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.sessionsService.duplicateSession(
      user.organizationId!,
      user,
      sessionId,
    );
  }

  @Get('options/retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getOptions(@CurrentUser() user: ICurrentUser) {
    return this.sessionsService.getOptions(user.organizationId!);
  }
}
