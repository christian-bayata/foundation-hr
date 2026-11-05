import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../entity/notification.schema';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * @Responsibility: Persist a new notification event.
   *
   * @param data - Notification fields
   * @returns {Promise<NotificationDocument>}
   */
  async create(data: Partial<Notification>): Promise<NotificationDocument> {
    return this.notificationModel.create(data);
  }

  /**
   * @Responsibility: Retrieve a notification scoped to an organization.
   *
   * @param organizationId - The organization id
   * @param notificationId - The notification id
   * @returns {Promise<NotificationDocument | null>}
   */
  async findById(
    organizationId: string,
    notificationId: string,
  ): Promise<NotificationDocument | null> {
    if (!Types.ObjectId.isValid(notificationId)) {
      return null;
    }

    return this.notificationModel.findOne({
      _id: notificationId,
      organizationId,
    });
  }

  /**
   * @Responsibility: Update a notification by id.
   *
   * @param notificationId - The notification id
   * @param data - Fields to update
   * @returns {Promise<NotificationDocument | null>}
   */
  async updateById(
    notificationId: string,
    data: Partial<Notification> | Record<string, unknown>,
  ): Promise<NotificationDocument | null> {
    return this.notificationModel.findByIdAndUpdate(
      notificationId,
      { $set: data },
      { new: true },
    );
  }

  /**
   * @Responsibility: Run a paginated notification query.
   *
   * @param where - The query filter
   * @param sort - The sort order
   * @param page - The page number
   * @param pageSize - The page size
   * @returns {Promise<{ items: NotificationDocument[]; total: number }>}
   */
  async paginatedQuery(
    where: QueryFilter<NotificationDocument>,
    sort: Record<string, 1 | -1>,
    page: number,
    pageSize: number,
  ): Promise<{ items: NotificationDocument[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(where)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.notificationModel.countDocuments(where).exec(),
    ]);

    return { items, total };
  }

  /**
   * @Responsibility: Retrieve notifications matching a filter.
   *
   * @param where - The query filter
   * @param sort - The sort order
   * @returns {Promise<NotificationDocument[]>}
   */
  async findAll(
    where: QueryFilter<NotificationDocument>,
    sort: Record<string, 1 | -1>,
  ): Promise<NotificationDocument[]> {
    return this.notificationModel.find(where).sort(sort).exec();
  }
}
