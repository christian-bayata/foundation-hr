import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryFilter, Types } from 'mongoose';
import { AppResponse } from '../../../common/response/app-response';
import { AdminStatus } from '../setting/access-control/enum/admin-status.enum';
import { SystemRole } from '../auth/enum/role.enum';
import { RoleRepository } from '../setting/access-control/repository/role.repository';
import { UserRoleRepository } from '../setting/access-control/repository/user-role.repository';
import { OrganizationRepository } from '../../core_hr/organization/repository/organization.repository';
import { UserRepository } from '../auth/repository/user.repository';
import { EventService } from '../../../event/event.service';
import type { SocketUser } from '../../../event/event.interface';
import { NotificationRepository } from './repository/notification.repository';
import { NotificationDeliveryRepository } from './repository/notification-delivery.repository';
import { NotificationDocument } from './entity/notification.schema';
import { NotificationDeliveryDocument } from './entity/notification-delivery.schema';
import {
  NotificationActionType,
  NotificationCategory,
  NotificationDeliveryStatus,
  NotificationEntityType,
  NotificationResolution,
  NotificationType,
} from './enum/notification.enum';
import type {
  BroadcastNotificationInput,
  DispatchNotificationInput,
  NotificationRecipient,
} from './interface/notification.interface';
import {
  buildPaginationMeta,
  normaliseOptionalString,
  uniqueStrings,
} from './notification.utility';
import type { ListNotificationsQueryDto } from './dto/notification.dto';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly deliveryRepository: NotificationDeliveryRepository,
    private readonly roleRepository: RoleRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly eventService: EventService,
  ) {}

  onModuleInit(): void {
    this.eventService.onConnection((user) => this.flushPending(user));
  }

  /**
   * @Responsibility: Safely dispatch a notification without ever breaking the
   * caller's core workflow.
   *
   * @param input - The notification to dispatch
   * @returns {Promise<NotificationDocument | null>}
   */
  async dispatch(
    input: DispatchNotificationInput,
  ): Promise<NotificationDocument | null> {
    try {
      return await this.dispatchInternal(input);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to dispatch notification ${input.type} in org ${input.organizationId}`,
        error as Error,
      );
      return null;
    }
  }

  /**
   * @Responsibility: Persist a notification event, fan it out to every resolved
   * recipient and push it over the socket when the recipient is online.
   *
   * @param input - The notification to dispatch
   * @returns {Promise<NotificationDocument | null>}
   */
  private async dispatchInternal(
    input: DispatchNotificationInput,
  ): Promise<NotificationDocument | null> {
    const explicitRecipients = (input.recipientUserIds ?? []).map((userId) => ({
      userId,
      email: null,
    }));
    const emailRecipients = await this.resolveRecipientsByEmails(
      input.recipientEmails ?? [],
    );
    const adminRecipients =
      input.includeAdmins === false
        ? []
        : await this.resolveAdminRecipients(input.organizationId);

    const excluded = new Set(input.excludeUserIds ?? []);
    const recipientMap = new Map<string, NotificationRecipient>();

    for (const recipient of [
      ...explicitRecipients,
      ...emailRecipients,
      ...adminRecipients,
    ]) {
      if (!recipient.userId || excluded.has(recipient.userId)) {
        continue;
      }

      if (!recipientMap.has(recipient.userId)) {
        recipientMap.set(recipient.userId, recipient);
      }
    }

    const recipients = Array.from(recipientMap.values());

    const notification = await this.notificationRepository.create({
      organizationId: input.organizationId,
      type: input.type,
      category: input.category,
      message: input.message,
      actor: {
        id: input.actor?.id ?? null,
        name: input.actor?.name ?? null,
        avatarUrl: input.actor?.avatarUrl ?? null,
        isDocument: input.actor?.isDocument ?? false,
      },
      entity: {
        type: input.entity?.type ?? NotificationEntityType.SYSTEM,
        id: input.entity?.id ?? null,
      },
      action: {
        type: input.action?.type ?? NotificationActionType.NONE,
        resolution: input.action?.resolution ?? NotificationResolution.NONE,
      },
      metadata: input.metadata ?? {},
      createdByUserId: input.createdByUserId,
      createdByEmail: input.createdByEmail,
    });

    if (recipients.length === 0) {
      this.logger.warn(
        `Notification ${String(notification._id)} (${input.type}) has no recipients`,
      );
      return notification;
    }

    const deliveries = await this.deliveryRepository.createMany(
      recipients.map((recipient) => ({
        notificationId: String(notification._id),
        organizationId: input.organizationId,
        recipientUserId: recipient.userId,
        recipientEmail: recipient.email ?? null,
        deliveryStatus: NotificationDeliveryStatus.PENDING,
      })),
    );

    await Promise.all(
      deliveries.map((delivery) =>
        this.deliverToRecipient(notification, delivery),
      ),
    );

    return notification;
  }

  /**
   * @Responsibility: Resolve the admin recipients (owner plus active HR admins)
   * for an organization.
   *
   * @param organizationId - The organization id
   * @returns {Promise<NotificationRecipient[]>}
   */
  async resolveAdminRecipients(
    organizationId: string,
  ): Promise<NotificationRecipient[]> {
    const userIds: string[] = [];

    const organization = await this.organizationRepository.findOrg(
      { _id: organizationId },
      'ownerId',
    );

    if (organization?.ownerId) {
      userIds.push(organization.ownerId);
    }

    const roles =
      await this.roleRepository.findByOrganizationAndParentSystemRoles(
        organizationId,
        [SystemRole.HR_ADMIN],
      );

    for (const role of roles) {
      const assignments =
        await this.userRoleRepository.findByRoleAndOrganization(
          role._id,
          organizationId,
        );

      for (const assignment of assignments) {
        if (assignment.status === AdminStatus.ACTIVE) {
          userIds.push(assignment.userId);
        }
      }
    }

    return uniqueStrings(userIds).map((userId) => ({ userId }));
  }

  /**
   * @Responsibility: Resolve user ids from email addresses for employee-targeted
   * notifications.
   *
   * @param emails - The email addresses
   * @returns {Promise<NotificationRecipient[]>}
   */
  async resolveRecipientsByEmails(
    emails: string[],
  ): Promise<NotificationRecipient[]> {
    const recipients: NotificationRecipient[] = [];

    for (const rawEmail of emails) {
      const email = normaliseOptionalString(rawEmail);
      if (!email) {
        continue;
      }

      const user = await this.userRepository.findUser({ email }, '_id email');
      if (user?._id) {
        recipients.push({ userId: String(user._id), email });
      }
    }

    return recipients;
  }

  /**
   * @Responsibility: Deliver a persisted notification to its delivery row and
   * emit it when the recipient is online.
   *
   * @param notification - The notification event
   * @param delivery - The recipient delivery
   * @returns {Promise<void>}
   */
  private async deliverToRecipient(
    notification: NotificationDocument,
    delivery: NotificationDeliveryDocument,
  ): Promise<void> {
    const payload = this.toSocketPayload(notification, delivery);
    const isOnline = this.eventService.emitNotification(
      delivery.recipientUserId,
      payload,
    );

    if (isOnline) {
      await this.deliveryRepository.updateById(String(delivery._id), {
        deliveryStatus: NotificationDeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
      });
    }
  }

  /**
   * @Responsibility: Flush pending notifications to a user who just connected.
   *
   * @param user - The authenticated socket user
   * @returns {Promise<void>}
   */
  async flushPending(user: SocketUser): Promise<void> {
    const pending = await this.deliveryRepository.findPendingByRecipient(
      user.userId,
    );

    if (pending.length > 0) {
      const notificationIds = uniqueStrings(
        pending.map((delivery) => delivery.notificationId),
      ).map((id) => new Types.ObjectId(id));

      const notifications = await this.notificationRepository.findAll(
        { _id: { $in: notificationIds } },
        { createdAt: -1 },
      );
      const notificationMap = new Map(
        notifications.map((notification) => [
          String(notification._id),
          notification,
        ]),
      );

      const items = pending
        .map((delivery) => {
          const notification = notificationMap.get(delivery.notificationId);
          return notification
            ? this.toSocketPayload(notification, delivery)
            : null;
        })
        .filter((item) => item !== null);

      this.eventService.emitSync(user.userId, items);
      await this.deliveryRepository.markDeliveredByIds(
        pending.map((delivery) => String(delivery._id)),
        new Date(),
      );
    }

    const count = await this.deliveryRepository.countUnreadByRecipient(
      user.userId,
    );
    this.eventService.emitUnreadCount(user.userId, count);
  }

  /**
   * @Responsibility: Retrieve a paginated notification feed for a recipient.
   *
   * @param userId - The recipient user id
   * @param organizationId - The organization id
   * @param query - The feed filters
   * @returns {Promise<{ items: unknown[]; pagination: unknown }>}
   */
  async getFeed(
    userId: string,
    organizationId: string,
    query: ListNotificationsQueryDto,
  ) {
    const batch = query.batch ?? 1;
    const limit = query.limit ?? 20;
    const where: QueryFilter<NotificationDeliveryDocument> = {
      recipientUserId: userId,
      organizationId,
    };

    if (query.status === 'unread') {
      where.isRead = false;
    } else if (query.status === 'read') {
      where.isRead = true;
    }

    const { items: deliveries, total } =
      await this.deliveryRepository.paginatedQuery(
        where,
        { createdAt: -1 },
        batch,
        limit,
      );

    const notificationIds = uniqueStrings(
      deliveries.map((delivery) => delivery.notificationId),
    ).map((id) => new Types.ObjectId(id));

    const notifications = await this.notificationRepository.findAll(
      { _id: { $in: notificationIds } },
      { createdAt: -1 },
    );
    const notificationMap = new Map(
      notifications.map((notification) => [
        String(notification._id),
        notification,
      ]),
    );

    const items = deliveries
      .map((delivery) => {
        const notification = notificationMap.get(delivery.notificationId);
        if (!notification) {
          return null;
        }

        if (query.category && notification.category !== query.category) {
          return null;
        }

        if (query.type && notification.type !== query.type) {
          return null;
        }

        return this.toSocketPayload(notification, delivery);
      })
      .filter((item) => item !== null);

    return {
      items,
      count: total,
    };
  }

  /**
   * @Responsibility: Mark a single delivery as read for a recipient.
   *
   * @param userId - The recipient user id
   * @param deliveryId - The delivery id
   * @returns {Promise<{ deliveryId: string; isRead: boolean; readAt: Date }>}
   */
  async markRead(userId: string, deliveryId: string) {
    const delivery = await this.deliveryRepository.findByIdAndRecipient(
      deliveryId,
      userId,
    );

    if (!delivery) {
      return AppResponse.error({
        message: 'Notification not found',
        status: HttpStatus.NOT_FOUND,
      });
    }

    const readAt = delivery.readAt ?? new Date();
    const updated = delivery.isRead
      ? delivery
      : await this.deliveryRepository.updateById(deliveryId, {
          isRead: true,
          readAt,
        });

    const count = await this.deliveryRepository.countUnread(
      userId,
      delivery.organizationId,
    );

    this.eventService.emitRead(userId, {
      deliveryId,
      isRead: true,
      readAt,
    });
    this.eventService.emitUnreadCount(userId, count);

    return {
      deliveryId,
      isRead: updated?.isRead ?? true,
      readAt,
    };
  }

  /**
   * @Responsibility: Mark every unread delivery for a recipient as read.
   *
   * @param userId - The recipient user id
   * @param organizationId - The organization id
   * @returns {Promise<{ updated: boolean }>}
   */
  async markAllRead(userId: string, organizationId: string) {
    await this.deliveryRepository.markAllRead(
      userId,
      organizationId,
      new Date(),
    );
    this.eventService.emitUnreadCount(userId, 0);

    return { updated: true };
  }

  /**
   * @Responsibility: Count unread notifications for a recipient.
   *
   * @param userId - The recipient user id
   * @param organizationId - The organization id
   * @returns {Promise<{ count: number }>}
   */
  async getUnreadCount(userId: string, organizationId: string) {
    const count = await this.deliveryRepository.countUnread(
      userId,
      organizationId,
    );

    return { count };
  }

  /**
   * @Responsibility: Broadcast a message to every recipient matching the target.
   *
   * @param input - The broadcast request
   * @returns {Promise<NotificationDocument | null>}
   */
  async broadcast(
    input: BroadcastNotificationInput,
  ): Promise<NotificationDocument | null> {
    const recipientUserIds = await this.resolveBroadcastRecipients(input);

    return this.dispatch({
      organizationId: input.organizationId,
      type: NotificationType.BROADCAST,
      category: NotificationCategory.SYSTEM,
      message: input.message,
      createdByUserId: input.createdByUserId,
      createdByEmail: input.createdByEmail,
      actor: {
        name: 'FoundationHR',
        isDocument: false,
      },
      entity: {
        type: NotificationEntityType.BROADCAST,
        id: null,
      },
      action: {
        type: NotificationActionType.NONE,
        resolution: NotificationResolution.NONE,
      },
      metadata: {
        ...input.metadata,
        target: input.target,
        roleIds: input.roleIds ?? [],
      },
      recipientUserIds,
      includeAdmins: input.includeAdmins !== false,
    });
  }

  /**
   * @Responsibility: Resolve the user ids targeted by a broadcast.
   *
   * @param input - The broadcast request
   * @returns {Promise<string[]>}
   */
  private async resolveBroadcastRecipients(
    input: BroadcastNotificationInput,
  ): Promise<string[]> {
    if (input.target === 'user') {
      if ((input.userIds ?? []).length === 0) {
        return AppResponse.error({
          message: 'At least one user id is required for a user broadcast',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      return uniqueStrings(input.userIds ?? []);
    }

    if (input.target === 'role' && (input.roleIds ?? []).length === 0) {
      return AppResponse.error({
        message: 'At least one role id is required for a role broadcast',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const assignments = await this.userRoleRepository.findByOrganization(
      input.organizationId,
    );
    const activeAssignments = assignments.filter(
      (assignment) => assignment.status === AdminStatus.ACTIVE,
    );

    if (input.target === 'role') {
      const roleIds = new Set((input.roleIds ?? []).map(String));
      return uniqueStrings(
        activeAssignments
          .filter((assignment) => roleIds.has(String(assignment.roleId)))
          .map((assignment) => assignment.userId),
      );
    }

    const admins = await this.resolveAdminRecipients(input.organizationId);

    return uniqueStrings([
      ...activeAssignments.map((assignment) => assignment.userId),
      ...admins.map((admin) => admin.userId),
    ]);
  }

  /**
   * @Responsibility: Update the resolution of a notification's action and push
   * the change to every delivered recipient.
   *
   * @param notificationId - The notification id
   * @param resolution - The new resolution
   * @returns {Promise<void>}
   */
  async updateResolution(
    notificationId: string,
    resolution: NotificationResolution,
  ): Promise<void> {
    const notification = await this.notificationRepository.updateById(
      notificationId,
      { 'action.resolution': resolution },
    );

    if (!notification) {
      return;
    }

    const deliveries =
      await this.deliveryRepository.findByNotificationId(notificationId);

    for (const delivery of deliveries) {
      this.eventService.emitNotificationUpdate(delivery.recipientUserId, {
        notificationId,
        resolution,
      });
    }
  }

  /**
   * @Responsibility: Convert a notification and delivery into the socket payload
   * consumed by the client.
   *
   * @param notification - The notification event
   * @param delivery - The recipient delivery
   * @returns {NotificationSocketPayload}
   */
  private toSocketPayload(
    notification: NotificationDocument,
    delivery: NotificationDeliveryDocument,
  ) {
    return {
      deliveryId: String(delivery._id),
      notificationId: String(notification._id),
      type: notification.type,
      category: notification.category,
      message: notification.message,
      actor: {
        name: notification.actor?.name ?? null,
        avatarUrl: notification.actor?.avatarUrl ?? null,
        isDocument: notification.actor?.isDocument ?? false,
      },
      entity: {
        type: notification.entity?.type ?? NotificationEntityType.SYSTEM,
        id: notification.entity?.id ?? null,
      },
      action: {
        type: notification.action?.type ?? NotificationActionType.NONE,
        resolution:
          notification.action?.resolution ?? NotificationResolution.NONE,
      },
      isRead: delivery.isRead,
      deliveryStatus: delivery.deliveryStatus,
      createdAt: notification.createdAt ?? new Date(),
    };
  }
}
