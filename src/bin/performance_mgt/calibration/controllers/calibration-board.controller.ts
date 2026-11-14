import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
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
import { CalibrationBoardService } from '../services/calibration-board.service';
import { ListCalibrationParticipantsQueryDto } from '../dto/list-calibration-participants-query.dto';
import { CalibrateParticipantDto } from '../dto/calibrate-participant.dto';
import { UpdateJustificationDto } from '../dto/update-justification.dto';
import { UpdateCalibrationTargetsDto } from '../dto/update-targets.dto';
import { BulkCalibrateDto } from '../dto/bulk-calibrate.dto';

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

@Controller('performance-management/calibration/board')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class CalibrationBoardController {
  constructor(private readonly boardService: CalibrationBoardService) {}

  @Get('retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getBoard(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.boardService.getBoard(user.organizationId!, sessionId);
  }

  @Get('participants')
  @Roles(...CALIBRATION_READ_ROLES)
  async listParticipants(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListCalibrationParticipantsQueryDto,
  ) {
    return this.boardService.listParticipants(user.organizationId!, query);
  }

  @Get('distribution/retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getDistribution(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.boardService.getDistribution(user.organizationId!, sessionId);
  }

  @Get('departments/retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getDepartmentDistribution(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.boardService.getDepartmentDistribution(
      user.organizationId!,
      sessionId,
    );
  }

  @Get('out-of-range/retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getOutOfRangeDepartments(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.boardService.getOutOfRangeDepartments(
      user.organizationId!,
      sessionId,
    );
  }

  @Get('guided-distribution/retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getGuidedDistribution(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.boardService.getGuidedDistribution(
      user.organizationId!,
      sessionId,
    );
  }

  @Get('audit-log/retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getAuditLog(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.boardService.getAuditLog(user.organizationId!, sessionId);
  }

  @Post('calibrate')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async calibrateParticipant(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: CalibrateParticipantDto,
  ) {
    return this.boardService.calibrateParticipant(
      user.organizationId!,
      user,
      sessionId,
      appraisalId,
      dto,
    );
  }

  @Patch('justification')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async updateJustification(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: UpdateJustificationDto,
  ) {
    return this.boardService.updateJustification(
      user.organizationId!,
      user,
      sessionId,
      appraisalId,
      dto,
    );
  }

  @Post('bulk-calibrate')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async bulkCalibrate(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
    @Body() dto: BulkCalibrateDto,
  ) {
    return this.boardService.bulkCalibrate(
      user.organizationId!,
      user,
      sessionId,
      dto,
    );
  }

  @Put('targets')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async updateTargets(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
    @Body() dto: UpdateCalibrationTargetsDto,
  ) {
    return this.boardService.updateTargets(
      user.organizationId!,
      user,
      sessionId,
      dto,
    );
  }
}
