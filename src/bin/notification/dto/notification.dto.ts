import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  NotificationBroadcastTarget,
  NotificationCategory,
  NotificationFeedStatus,
  NotificationType,
} from '../enum/notification.enum';

export class ListNotificationsQueryDto {
  @IsEnum(NotificationFeedStatus, {
    message: 'Status must be all, unread or read.',
  })
  @IsOptional()
  status?: NotificationFeedStatus;

  @IsEnum(NotificationCategory, {
    message: 'Category must be a valid notification category.',
  })
  @IsOptional()
  category?: NotificationCategory;

  @IsEnum(NotificationType, {
    message: 'Type must be a valid notification type.',
  })
  @IsOptional()
  type?: NotificationType;

  @Type(() => Number)
  @IsInt({ message: 'Batch must be an integer.' })
  @Min(1, { message: 'Batch must be at least 1.' })
  @IsOptional()
  batch?: number;

  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  @Max(100, { message: 'Limit must be at most 100.' })
  @IsOptional()
  limit?: number;
}

export class BroadcastNotificationDto {
  @IsString({ message: 'Message must be a string.' })
  @IsNotEmpty({ message: 'Message is required.' })
  @MaxLength(500, { message: 'Message must be at most 500 characters.' })
  message: string;

  @IsEnum(NotificationBroadcastTarget, {
    message: 'Target must be all, role or user.',
  })
  target: NotificationBroadcastTarget;

  @IsArray({ message: 'User ids must be an array.' })
  @ArrayUnique({ message: 'User ids must not contain duplicates.' })
  @ArrayMaxSize(500, { message: 'At most 500 user ids are allowed.' })
  @IsString({ each: true, message: 'Each user id must be a string.' })
  @IsOptional()
  userIds?: string[];

  @IsArray({ message: 'Role ids must be an array.' })
  @ArrayUnique({ message: 'Role ids must not contain duplicates.' })
  @ArrayMaxSize(100, { message: 'At most 100 role ids are allowed.' })
  @IsString({ each: true, message: 'Each role id must be a string.' })
  @IsOptional()
  roleIds?: string[];
}
