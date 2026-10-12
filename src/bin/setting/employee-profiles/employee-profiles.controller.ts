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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { RequiresSystemSettings } from '../../../common/decorators/requires-system-settings.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { SystemRole } from '../../auth/enum/role.enum';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';
import { UpdateEmployeeProfileSettingsDto } from './dto/update-employee-profile-settings.dto';
import { AddWorkflowStepDto } from './dto/add-workflow-step.dto';
import { UpdateWorkflowStepDto } from './dto/update-workflow-step.dto';
import { AddResponsiblePartyDto } from './dto/add-responsible-party.dto';

@Controller('setting/employee-profiles')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class EmployeeProfilesController {
  constructor(
    private readonly organisationService: SettingsDomainOrganisationService,
  ) {}

  @Get('general-settings/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveEmployeeProfileSettings(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getEmployeeProfileSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Employee profile settings retrieved successfully',
      200,
      data,
    );
  }

  @Patch('general-settings/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateEmployeeProfileSettings(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateEmployeeProfileSettingsDto,
  ) {
    const data = await this.organisationService.updateEmployeeProfileSettings(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Employee profile settings updated successfully',
      200,
      data,
    );
  }

  @Get('workflow/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveEmployeeWorkflow(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getEmployeeWorkflow(
      user.organizationId!,
    );
    return AppResponse.success(
      'Employee workflow settings retrieved successfully',
      200,
      data,
    );
  }

  @Post('workflow/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addWorkflowStep(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddWorkflowStepDto,
  ) {
    const data = await this.organisationService.addWorkflowStep(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Workflow step added successfully', 201, data);
  }

  @Patch('workflow/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateWorkflowStep(
    @CurrentUser() user: ICurrentUser,
    @Query('stepId') stepId: string,
    @Body() dto: UpdateWorkflowStepDto,
  ) {
    const data = await this.organisationService.updateWorkflowStep(
      user.organizationId!,
      stepId,
      dto,
    );
    return AppResponse.success('Workflow step updated successfully', 200, data);
  }

  @Delete('workflow/delete')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteWorkflowStep(
    @CurrentUser() user: ICurrentUser,
    @Query('stepId') stepId: string,
  ) {
    const data = await this.organisationService.deleteWorkflowStep(
      user.organizationId!,
      stepId,
    );
    return AppResponse.success('Workflow step deleted successfully', 200, data);
  }

  @Get('workflow/responsible-parties/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveResponsibleParties(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getResponsibleParties(
      user.organizationId!,
    );
    return AppResponse.success(
      'Responsible parties retrieved successfully',
      200,
      data,
    );
  }

  @Post('workflow/responsible-parties/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addResponsibleParty(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddResponsiblePartyDto,
  ) {
    const data = await this.organisationService.addResponsibleParty(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Responsible party added successfully', 201, data);
  }
}
