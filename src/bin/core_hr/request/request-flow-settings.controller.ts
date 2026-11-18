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
import { AppResponse, Roles } from '../../../common';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequiresSystemSettings } from '../../../common/decorators/requires-system-settings.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { SystemRole } from '../../generic/auth/enum/role.enum';
import { RetrieveRequestFormDto } from './dto/request.dto';
import {
  AddRequestDelegationDto,
  RequestExportQueryDto,
  RequestLogQueryDto,
  RequestTemplateDto,
  RequestTypeConfigDto,
  RetrieveRequestDelegationDto,
  RunReminderDto,
  TemplateIdQueryDto,
  ToggleRequestTypeDto,
  UpdateDelegationPolicyDto,
  UpdateReminderPolicyDto,
  UpdateRequestDelegationDto,
  UpdateRequestTypeDto,
  UpdateVisibilityPolicyDto,
} from './dto/request-flow.dto';
import { RequestFlowService } from './request-flow.service';

@Controller('setting/request-management')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
@Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
export class RequestFlowSettingsController {
  constructor(private readonly requestFlowService: RequestFlowService) {}

  @Get('settings/retrieve')
  async getSettings(@CurrentUser() user: ICurrentUser) {
    const data = await this.requestFlowService.getSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Request management settings retrieved successfully',
      200,
      data,
    );
  }

  @Get('type/retrieve/all')
  async getTypes(@CurrentUser() user: ICurrentUser) {
    const data = await this.requestFlowService.getTypeCatalog(
      user.organizationId!,
    );
    return AppResponse.success(
      'Request types retrieved successfully',
      200,
      data,
    );
  }

  @Post('type/save')
  @HttpCode(HttpStatus.OK)
  async upsertType(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestTypeConfigDto,
  ) {
    const data = await this.requestFlowService.upsertTypeConfig(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Request type saved successfully', 200, data);
  }

  @Patch('type/update')
  @HttpCode(HttpStatus.OK)
  async updateType(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateRequestTypeDto,
  ) {
    const data = await this.requestFlowService.updateType(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Request type updated successfully', 200, data);
  }

  @Patch('type/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleType(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: ToggleRequestTypeDto,
  ) {
    const data = await this.requestFlowService.toggleType(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Request type toggled successfully', 200, data);
  }

  @Delete('type/delete')
  @HttpCode(HttpStatus.OK)
  async deleteType(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RetrieveRequestFormDto,
  ) {
    const data = await this.requestFlowService.deleteTypeConfig(
      user.organizationId!,
      query.requestType,
    );
    return AppResponse.success(
      'Request type configuration deleted successfully',
      200,
      data,
    );
  }

  @Get('reminder/retrieve')
  async getReminderPolicy(@CurrentUser() user: ICurrentUser) {
    const settings = await this.requestFlowService.getSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Reminder policy retrieved successfully',
      200,
      settings.reminder,
    );
  }

  @Patch('reminder/update')
  @HttpCode(HttpStatus.OK)
  async updateReminderPolicy(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateReminderPolicyDto,
  ) {
    const data = await this.requestFlowService.updateReminderPolicy(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Reminder policy updated successfully',
      200,
      data,
    );
  }

  @Post('reminder/run')
  @HttpCode(HttpStatus.OK)
  async runReminders(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RunReminderDto,
  ) {
    const data = await this.requestFlowService.runReminders(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Reminders processed successfully', 200, data);
  }

  @Get('delegation/retrieve')
  async getDelegationPolicy(@CurrentUser() user: ICurrentUser) {
    const settings = await this.requestFlowService.getSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Delegation policy retrieved successfully',
      200,
      settings.delegation,
    );
  }

  @Patch('delegation/update')
  @HttpCode(HttpStatus.OK)
  async updateDelegationPolicy(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateDelegationPolicyDto,
  ) {
    const data = await this.requestFlowService.updateDelegationPolicy(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Delegation policy updated successfully',
      200,
      data,
    );
  }

  @Post('delegation/add')
  @HttpCode(HttpStatus.CREATED)
  async addDelegation(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddRequestDelegationDto,
  ) {
    const data = await this.requestFlowService.addDelegation(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Delegation added successfully', 201, data);
  }

  @Get('delegation/retrieve/all')
  async listDelegations(@CurrentUser() user: ICurrentUser) {
    const data = await this.requestFlowService.listDelegations(
      user.organizationId!,
    );
    return AppResponse.success('Delegations retrieved successfully', 200, data);
  }

  @Patch('delegation/update/single')
  @HttpCode(HttpStatus.OK)
  async updateDelegation(
    @CurrentUser() user: ICurrentUser,
    @Query() params: RetrieveRequestDelegationDto,
    @Body() dto: UpdateRequestDelegationDto,
  ) {
    const data = await this.requestFlowService.updateDelegation(
      user.organizationId!,
      { ...params, ...dto },
    );
    return AppResponse.success('Delegation updated successfully', 200, data);
  }

  @Delete('delegation/delete')
  @HttpCode(HttpStatus.OK)
  async deleteDelegation(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RetrieveRequestDelegationDto,
  ) {
    const data = await this.requestFlowService.deleteDelegation(
      user.organizationId!,
      query.delegationId,
    );
    return AppResponse.success('Delegation deleted successfully', 200, data);
  }

  @Get('template/retrieve/all')
  async getTemplates(@CurrentUser() user: ICurrentUser) {
    const settings = await this.requestFlowService.getSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Request templates retrieved successfully',
      200,
      settings.templates,
    );
  }

  @Post('template/save')
  @HttpCode(HttpStatus.OK)
  async upsertTemplate(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestTemplateDto,
  ) {
    const data = await this.requestFlowService.upsertTemplate(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Template saved successfully', 200, data);
  }

  @Delete('template/delete')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(
    @CurrentUser() user: ICurrentUser,
    @Query() query: TemplateIdQueryDto,
  ) {
    const data = await this.requestFlowService.deleteTemplate(
      user.organizationId!,
      query.templateId,
    );
    return AppResponse.success('Template deleted successfully', 200, data);
  }

  @Get('visibility/retrieve')
  async getVisibility(@CurrentUser() user: ICurrentUser) {
    const settings = await this.requestFlowService.getSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Visibility policy retrieved successfully',
      200,
      settings.visibility,
    );
  }

  @Patch('visibility/update')
  @HttpCode(HttpStatus.OK)
  async updateVisibility(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateVisibilityPolicyDto,
  ) {
    const data = await this.requestFlowService.updateVisibilityPolicy(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Visibility policy updated successfully',
      200,
      data,
    );
  }

  @Get('view-log/retrieve/all')
  async getViewLogs(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RequestLogQueryDto,
  ) {
    const data = await this.requestFlowService.listViewLogs(
      user.organizationId!,
      query,
    );
    return AppResponse.success('View logs retrieved successfully', 200, data);
  }

  @Get('export/retrieve')
  async exportRequests(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RequestExportQueryDto,
  ) {
    const data = await this.requestFlowService.exportRequests(
      user.organizationId!,
      query,
    );
    return AppResponse.success(
      'Request export retrieved successfully',
      200,
      data,
    );
  }
}
