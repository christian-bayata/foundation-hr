import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  NotificationActionType,
  NotificationCategory,
  NotificationEntityType,
  NotificationResolution,
  NotificationType,
} from '../enum/notification.enum';

export type NotificationDocument = Notification & Document;

@Schema({ _id: false })
export class NotificationActor {
  @Prop({ type: String, default: null })
  id: string | null;

  @Prop({ type: String, default: null })
  name: string | null;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  @Prop({ type: Boolean, default: false })
  isDocument: boolean;
}

@Schema({ _id: false })
export class NotificationEntity {
  @Prop({
    type: String,
    enum: Object.values(NotificationEntityType),
    required: true,
  })
  type: NotificationEntityType;

  @Prop({ type: String, default: null })
  id: string | null;
}

@Schema({ _id: false })
export class NotificationAction {
  @Prop({
    type: String,
    enum: Object.values(NotificationActionType),
    default: NotificationActionType.NONE,
  })
  type: NotificationActionType;

  @Prop({
    type: String,
    enum: Object.values(NotificationResolution),
    default: NotificationResolution.NONE,
  })
  resolution: NotificationResolution;
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationType),
    required: true,
  })
  type: NotificationType;

  @Prop({
    type: String,
    enum: Object.values(NotificationCategory),
    required: true,
  })
  category: NotificationCategory;

  @Prop({ type: NotificationActor, default: {} })
  actor: NotificationActor;

  @Prop({
    type: NotificationEntity,
    required: true,
  })
  entity: NotificationEntity;

  @Prop({ type: NotificationAction, default: {} })
  action: NotificationAction;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  @Prop({ type: String, required: true })
  createdByUserId: string;

  @Prop({ type: String, required: true })
  createdByEmail: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index(
  { organizationId: 1, type: 1, createdAt: -1 },
  { name: 'notification_org_type_created_idx' },
);
NotificationSchema.index(
  { organizationId: 1, category: 1, createdAt: -1 },
  { name: 'notification_org_category_created_idx' },
);
