import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppResponse } from '../../common/response/app-response';
import type { CurrentUser as ICurrentUser } from '../../common/interfaces/request.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { SystemRole } from '../auth/enum/role.enum';
import { NotificationService } from './notification.service';
import {
  BroadcastNotificationDto,
  ListNotificationsQueryDto,
} from './dto/notification.dto';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
export class AdminNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('all')
  async getFeed(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    const data = await this.notificationService.getFeed(
      user.userId,
      user.organizationId!,
      query,
    );

    return AppResponse.success(
      'Notifications retrieved successfully',
      200,
      data,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: ICurrentUser) {
    const data = await this.notificationService.getUnreadCount(
      user.userId,
      user.organizationId!,
    );

    return AppResponse.success(
      'Unread count retrieved successfully',
      200,
      data,
    );
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: ICurrentUser) {
    const data = await this.notificationService.markAllRead(
      user.userId,
      user.organizationId!,
    );

    return AppResponse.success('Notifications marked as read', 200, data);
  }

  @Patch('/read')
  async markRead(
    @CurrentUser() user: ICurrentUser,
    @Query('deliveryId') deliveryId: string,
  ) {
    const data = await this.notificationService.markRead(
      user.userId,
      deliveryId,
    );

    return AppResponse.success('Notification marked as read', 200, data);
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.CREATED)
  async broadcast(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: BroadcastNotificationDto,
  ) {
    const notification = await this.notificationService.broadcast({
      organizationId: user.organizationId!,
      message: dto.message,
      createdByUserId: user.userId,
      createdByEmail: user.email,
      target: dto.target,
      userIds: dto.userIds,
      roleIds: dto.roleIds,
    });

    return AppResponse.success('Notification broadcast successfully', 201, {
      id: notification ? String(notification._id) : null,
    });
  }
}
