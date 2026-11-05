import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '../enum/notification.enum';

export type NotificationDeliveryDocument = NotificationDelivery & Document;

@Schema({ timestamps: true })
export class NotificationDelivery {
  @Prop({ type: String, required: true, index: true })
  notificationId: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  recipientUserId: string;

  @Prop({ type: String, default: null })
  recipientEmail: string | null;

  @Prop({
    type: String,
    enum: Object.values(NotificationChannel),
    default: NotificationChannel.IN_APP,
  })
  channel: NotificationChannel;

  @Prop({
    type: String,
    enum: Object.values(NotificationDeliveryStatus),
    default: NotificationDeliveryStatus.PENDING,
  })
  deliveryStatus: NotificationDeliveryStatus;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  @Prop({ type: Date, default: null })
  deliveredAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationDeliverySchema = SchemaFactory.createForClass(
  NotificationDelivery,
);

NotificationDeliverySchema.index(
  { notificationId: 1, recipientUserId: 1 },
  { name: 'notification_delivery_unique_idx', unique: true },
);
NotificationDeliverySchema.index(
  { recipientUserId: 1, organizationId: 1, createdAt: -1 },
  { name: 'notification_delivery_recipient_created_idx' },
);
NotificationDeliverySchema.index(
  { recipientUserId: 1, isRead: 1 },
  { name: 'notification_delivery_recipient_read_idx' },
);
