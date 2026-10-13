import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppResponse, Roles } from '../../../common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { RequiresSystemSettings } from '../../../common/decorators/requires-system-settings.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { SystemRole } from '../../auth/enum/role.enum';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';
import { AddRequestWorkflowDto } from './dto/add-request-workflow.dto';
import { UpdateRequestWorkflowDto } from './dto/update-request-workflow.dto';
import { RequestWorkflowQueryDto } from './dto/request-workflow-query.dto';

@Controller('setting/request-management')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class RequestManagementController {
  constructor(
    private readonly organisationService: SettingsDomainOrganisationService,
  ) {}

  @Get('workflow/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRequestWorkflows(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RequestWorkflowQueryDto,
  ) {
    const data = await this.organisationService.getRequestWorkflows(
      user.organizationId!,
      query.requestType,
    );
    return AppResponse.success(
      'Request workflows retrieved successfully',
      200,
      data,
    );
  }

  @Get('workflow/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRequestWorkflow(
    @CurrentUser() user: ICurrentUser,
    @Query('workflowId') workflowId: string,
  ) {
    const data = await this.organisationService.getRequestWorkflow(
      user.organizationId!,
      workflowId,
    );
    return AppResponse.success(
      'Request workflow retrieved successfully',
      200,
      data,
    );
  }

  @Post('workflow/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addRequestWorkflow(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddRequestWorkflowDto,
  ) {
    const data = await this.organisationService.addRequestWorkflow(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Request workflow added successfully',
      201,
      data,
    );
  }

  @Patch('workflow/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateRequestWorkflow(
    @CurrentUser() user: ICurrentUser,
    @Query('workflowId') workflowId: string,
    @Body() dto: UpdateRequestWorkflowDto,
  ) {
    const data = await this.organisationService.updateRequestWorkflow(
      user.organizationId!,
      workflowId,
      dto,
    );
    return AppResponse.success(
      'Request workflow updated successfully',
      200,
      data,
    );
  }

  @Delete('workflow/delete')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteRequestWorkflow(
    @CurrentUser() user: ICurrentUser,
    @Query('workflowId') workflowId: string,
  ) {
    const data = await this.organisationService.deleteRequestWorkflow(
      user.organizationId!,
      workflowId,
    );
    return AppResponse.success(
      'Request workflow deleted successfully',
      200,
      data,
    );
  }
}
