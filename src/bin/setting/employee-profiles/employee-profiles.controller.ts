import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
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
}
