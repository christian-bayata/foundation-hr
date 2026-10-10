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
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Controller('setting/notifications')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class NotificationsController {
  constructor(
    private readonly organisationService: SettingsDomainOrganisationService,
  ) {}

  @Get('retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveNotifications(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getNotifications(
      user.organizationId!,
    );
    return AppResponse.success(
      'Notification preferences retrieved successfully',
      200,
      data,
    );
  }

  @Patch('update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateNotifications(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const data = await this.organisationService.updateNotifications(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Notification preferences updated successfully',
      200,
      data,
    );
  }
}
