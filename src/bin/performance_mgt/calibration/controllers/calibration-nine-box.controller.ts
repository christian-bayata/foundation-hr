import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { CalibrationNineBoxService } from '../services/calibration-nine-box.service';
import { ListCalibrationParticipantsQueryDto } from '../dto/list-calibration-participants-query.dto';
import { SetPotentialDto } from '../dto/set-potential.dto';
import { MoveNineBoxDto } from '../dto/move-nine-box.dto';
import { BulkMoveNineBoxDto } from '../dto/bulk-move-nine-box.dto';

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

@Controller('performance-management/calibration/nine-box')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class CalibrationNineBoxController {
  constructor(private readonly nineBoxService: CalibrationNineBoxService) {}

  @Get('retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getNineBox(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.nineBoxService.getNineBox(user.organizationId!, sessionId);
  }

  @Get('participants')
  @Roles(...CALIBRATION_READ_ROLES)
  async listParticipants(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListCalibrationParticipantsQueryDto,
  ) {
    return this.nineBoxService.listParticipants(user.organizationId!, query);
  }

  @Get('distribution/retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getDistribution(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.nineBoxService.getDistribution(
      user.organizationId!,
      sessionId,
    );
  }

  @Get('summary/retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getSummary(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
  ) {
    return this.nineBoxService.getSummary(user.organizationId!, sessionId);
  }

  @Get('options/retrieve')
  @Roles(...CALIBRATION_READ_ROLES)
  async getOptions(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.nineBoxService.getOptions(user.organizationId!, sessionId);
  }

  @Post('potential')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async setPotential(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: SetPotentialDto,
  ) {
    return this.nineBoxService.setPotential(
      user.organizationId!,
      user,
      sessionId,
      appraisalId,
      dto,
    );
  }

  @Post('move')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async moveParticipant(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: MoveNineBoxDto,
  ) {
    return this.nineBoxService.moveParticipant(
      user.organizationId!,
      user,
      sessionId,
      appraisalId,
      dto,
    );
  }

  @Post('bulk-move')
  @Roles(...CALIBRATION_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async bulkMove(
    @CurrentUser() user: ICurrentUser,
    @Query('sessionId') sessionId: string,
    @Body() dto: BulkMoveNineBoxDto,
  ) {
    return this.nineBoxService.bulkMove(
      user.organizationId!,
      user,
      sessionId,
      dto,
    );
  }
}
