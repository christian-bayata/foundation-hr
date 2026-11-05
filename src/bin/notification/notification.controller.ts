import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppResponse } from '../../common/response/app-response';
import type { CurrentUser as ICurrentUser } from '../../common/interfaces/request.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { ListNotificationsQueryDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
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
}
