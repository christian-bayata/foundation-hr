import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import {
  NotificationDelivery,
  NotificationDeliveryDocument,
} from '../entity/notification-delivery.schema';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '../enum/notification.enum';

@Injectable()
export class NotificationDeliveryRepository {
  constructor(
    @InjectModel(NotificationDelivery.name)
    private readonly deliveryModel: Model<NotificationDeliveryDocument>,
  ) {}

  /**
   * @Responsibility: Persist deliveries for a notification.
   *
   * @param data - Delivery rows
   * @returns {Promise<NotificationDeliveryDocument[]>}
   */
  async createMany(
    data: Partial<NotificationDelivery>[],
  ): Promise<NotificationDeliveryDocument[]> {
    if (data.length === 0) {
      return [];
    }

    return (await this.deliveryModel.insertMany(
      data,
    )) as unknown as NotificationDeliveryDocument[];
  }

  /**
   * @Responsibility: Retrieve deliveries for a notification.
   *
   * @param notificationId - The notification id
   * @returns {Promise<NotificationDeliveryDocument[]>}
   */
  async findByNotificationId(
    notificationId: string,
  ): Promise<NotificationDeliveryDocument[]> {
    return this.deliveryModel.find({ notificationId });
  }

  /**
   * @Responsibility: Retrieve pending in-app deliveries for a recipient.
   *
   * @param recipientUserId - The recipient user id
   * @returns {Promise<NotificationDeliveryDocument[]>}
   */
  async findPendingByRecipient(
    recipientUserId: string,
  ): Promise<NotificationDeliveryDocument[]> {
    return this.deliveryModel
      .find({
        recipientUserId,
        channel: NotificationChannel.IN_APP,
        deliveryStatus: NotificationDeliveryStatus.PENDING,
      })
      .sort({ createdAt: 1 });
  }

  /**
   * @Responsibility: Retrieve a delivery belonging to a recipient.
   *
   * @param deliveryId - The delivery id
   * @param recipientUserId - The recipient user id
   * @returns {Promise<NotificationDeliveryDocument | null>}
   */
  async findByIdAndRecipient(
    deliveryId: string,
    recipientUserId: string,
  ): Promise<NotificationDeliveryDocument | null> {
    if (!Types.ObjectId.isValid(deliveryId)) {
      return null;
    }

    return this.deliveryModel.findOne({
      _id: deliveryId,
      recipientUserId,
    });
  }

  /**
   * @Responsibility: Run a paginated delivery query.
   *
   * @param where - The query filter
   * @param sort - The sort order
   * @param page - The page number
   * @param pageSize - The page size
   * @returns {Promise<{ items: NotificationDeliveryDocument[]; total: number }>}
   */
  async paginatedQuery(
    where: QueryFilter<NotificationDeliveryDocument>,
    sort: Record<string, 1 | -1>,
    page: number,
    pageSize: number,
  ): Promise<{ items: NotificationDeliveryDocument[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.deliveryModel
        .find(where)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.deliveryModel.countDocuments(where).exec(),
    ]);

    return { items, total };
  }

  /**
   * @Responsibility: Retrieve deliveries matching a filter.
   *
   * @param where - The query filter
   * @returns {Promise<NotificationDeliveryDocument[]>}
   */
  async findAll(
    where: QueryFilter<NotificationDeliveryDocument>,
  ): Promise<NotificationDeliveryDocument[]> {
    return this.deliveryModel.find(where).exec();
  }

  /**
   * @Responsibility: Update a delivery by id.
   *
   * @param deliveryId - The delivery id
   * @param data - Fields to update
   * @returns {Promise<NotificationDeliveryDocument | null>}
   */
  async updateById(
    deliveryId: string,
    data: Partial<NotificationDelivery> | Record<string, unknown>,
  ): Promise<NotificationDeliveryDocument | null> {
    return this.deliveryModel.findByIdAndUpdate(
      deliveryId,
      { $set: data },
      { new: true },
    );
  }

  /**
   * @Responsibility: Mark a set of in-app deliveries as delivered.
   *
   * @param deliveryIds - The delivery ids
   * @param deliveredAt - The delivery timestamp
   * @returns {Promise<void>}
   */
  async markDeliveredByIds(
    deliveryIds: string[],
    deliveredAt: Date,
  ): Promise<void> {
    if (deliveryIds.length === 0) {
      return;
    }

    await this.deliveryModel.updateMany(
      {
        _id: { $in: deliveryIds },
        channel: NotificationChannel.IN_APP,
        deliveryStatus: NotificationDeliveryStatus.PENDING,
      },
      {
        $set: {
          deliveryStatus: NotificationDeliveryStatus.DELIVERED,
          deliveredAt,
        },
      },
    );
  }

  /**
   * @Responsibility: Mark all deliveries for a recipient as read.
   *
   * @param recipientUserId - The recipient user id
   * @param organizationId - The organization id
   * @param readAt - The read timestamp
   * @returns {Promise<void>}
   */
  async markAllRead(
    recipientUserId: string,
    organizationId: string,
    readAt: Date,
  ): Promise<void> {
    await this.deliveryModel.updateMany(
      { recipientUserId, organizationId, isRead: false },
      { $set: { isRead: true, readAt } },
    );
  }

  /**
   * @Responsibility: Count unread deliveries for a recipient.
   *
   * @param recipientUserId - The recipient user id
   * @param organizationId - The organization id
   * @returns {Promise<number>}
   */
  async countUnread(
    recipientUserId: string,
    organizationId: string,
  ): Promise<number> {
    return this.deliveryModel.countDocuments({
      recipientUserId,
      organizationId,
      isRead: false,
    });
  }

  /**
   * @Responsibility: Count unread deliveries for a recipient across
   * organizations.
   *
   * @param recipientUserId - The recipient user id
   * @returns {Promise<number>}
   */
  async countUnreadByRecipient(recipientUserId: string): Promise<number> {
    return this.deliveryModel.countDocuments({
      recipientUserId,
      isRead: false,
    });
  }
}
