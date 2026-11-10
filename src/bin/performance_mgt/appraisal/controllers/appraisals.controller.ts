import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
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
import { AppraisalsService } from '../services/appraisals.service';
import { ListAppraisalsQueryDto } from '../dto/list-appraisals-query.dto';
import { RerouteAppraisalDto } from '../dto/reroute-appraisal.dto';
import { CalibrateAppraisalDto } from '../dto/calibrate-appraisal.dto';
import { RecomputeAppraisalDto } from '../dto/recompute-appraisal.dto';
import { ResetAppraisalDto } from '../dto/reset-appraisal.dto';
import { SkipAppraisalDto } from '../dto/skip-appraisal.dto';

const APPRAISAL_READ_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
] as const;

@Controller('performance-management/appraisals')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class AppraisalsController {
  constructor(private readonly appraisalsService: AppraisalsService) {}

  @Get('all')
  @Roles(...APPRAISAL_READ_ROLES)
  async listAppraisals(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListAppraisalsQueryDto,
  ) {
    return this.appraisalsService.listAppraisals(
      user.organizationId!,
      query,
    );
  }

  @Get('summary/retrieve')
  @Roles(...APPRAISAL_READ_ROLES)
  async getSummary(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListAppraisalsQueryDto,
  ) {
    return this.appraisalsService.getSummary(user.organizationId!, query);
  }

  @Get('options/retrieve')
  @Roles(...APPRAISAL_READ_ROLES)
  async getOptions(@CurrentUser() user: ICurrentUser) {
    return this.appraisalsService.getOptions(user.organizationId!);
  }

  @Get('retrieve')
  @Roles(...APPRAISAL_READ_ROLES)
  async getAppraisal(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
  ) {
    return this.appraisalsService.getAppraisal(
      user.organizationId!,
      appraisalId,
    );
  }

  @Get('scorecard/retrieve')
  @Roles(...APPRAISAL_READ_ROLES)
  async getScorecard(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
  ) {
    return this.appraisalsService.getScorecard(
      user.organizationId!,
      appraisalId,
    );
  }

  @Get('behavioural-assessment/retrieve')
  @Roles(...APPRAISAL_READ_ROLES)
  async getBehavioural(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
  ) {
    return this.appraisalsService.getBehavioural(
      user.organizationId!,
      appraisalId,
    );
  }

  @Get('reviews/retrieve')
  @Roles(...APPRAISAL_READ_ROLES)
  async getReviews(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
  ) {
    return this.appraisalsService.getReviews(
      user.organizationId!,
      appraisalId,
    );
  }

  @Get('history/retrieve')
  @Roles(...APPRAISAL_READ_ROLES)
  async getHistory(
    @CurrentUser() user: ICurrentUser,
    @Query('employeeId') employeeId: string,
  ) {
    return this.appraisalsService.getHistory(
      user.organizationId!,
      employeeId,
    );
  }

  @Patch('reroute')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async reroute(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: RerouteAppraisalDto,
  ) {
    return this.appraisalsService.reroute(
      user.organizationId!,
      user,
      appraisalId,
      dto,
    );
  }

  @Post('reset')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async reset(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: ResetAppraisalDto,
  ) {
    return this.appraisalsService.reset(
      user.organizationId!,
      user,
      appraisalId,
      dto,
    );
  }

  @Patch('calibrate')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async calibrate(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: CalibrateAppraisalDto,
  ) {
    return this.appraisalsService.calibrate(
      user.organizationId!,
      user,
      appraisalId,
      dto,
    );
  }

  @Post('recompute')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async recompute(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RecomputeAppraisalDto,
  ) {
    return this.appraisalsService.recompute(
      user.organizationId!,
      user,
      dto,
    );
  }

  @Post('skip')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async skip(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: SkipAppraisalDto,
  ) {
    return this.appraisalsService.skip(
      user.organizationId!,
      user,
      appraisalId,
      dto,
    );
  }

  @Get('export')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  async exportReport(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListAppraisalsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { fileName, content } = await this.appraisalsService.exportReport(
      user.organizationId!,
      query,
    );

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(Buffer.from(content, 'utf-8'));
  }
}
