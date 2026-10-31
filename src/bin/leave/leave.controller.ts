import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppResponse, Roles } from '../../common';
import type { CurrentUser as ICurrentUser } from '../../common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresSystemSettings } from '../../common/decorators/requires-system-settings.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { SystemRole } from '../auth/enum/role.enum';
import {
  ApproveLeaveRequestDto,
  LeaveSummaryQueryDto,
  ListLeaveRequestQueryDto,
  RejectLeaveRequestDto,
  RetrieveLeaveRequestDto,
} from './dto/leave.dto';
import { LeaveService } from './leave.service';

@Controller('leave')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('requests/retrieve/all')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRequests(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListLeaveRequestQueryDto,
  ) {
    const data = await this.leaveService.listRequests(
      user.organizationId!,
      query,
    );
    return AppResponse.success(
      'Leave requests retrieved successfully',
      200,
      data,
    );
  }

  @Get('requests/retrieve/single')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRequest(
    @CurrentUser() user: ICurrentUser,
    @Query() dto: RetrieveLeaveRequestDto,
  ) {
    const data = await this.leaveService.retrieveRequest(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Leave request retrieved successfully',
      200,
      data,
    );
  }

  @Patch('requests/approve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async approveRequest(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: ApproveLeaveRequestDto,
  ) {
    const data = await this.leaveService.approveRequest(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Leave request approved successfully', 200, data);
  }

  @Patch('requests/reject')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectRequest(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RejectLeaveRequestDto,
  ) {
    const data = await this.leaveService.rejectRequest(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Leave request rejected successfully', 200, data);
  }

  @Get('summary/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveSummary(
    @CurrentUser() user: ICurrentUser,
    @Query() query: LeaveSummaryQueryDto,
  ) {
    const data = await this.leaveService.getSummary(
      user.organizationId!,
      query,
    );
    return AppResponse.success('Leave summary retrieved successfully', 200, data);
  }

  @Get('requests/export/csv')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async exportRequests(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListLeaveRequestQueryDto,
    @Res() res: Response,
  ) {
    const { filename, content } = await this.leaveService.exportRequests(
      user.organizationId!,
      query,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(content);
  }
}
