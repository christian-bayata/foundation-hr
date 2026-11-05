import { Injectable, Logger } from '@nestjs/common';
import type { Namespace } from 'socket.io';
import {
  NotificationSocketEvent,
  ORG_ROOM_PREFIX,
  USER_ROOM_PREFIX,
} from './event.enum';
import type {
  NotificationSocketPayload,
  NotificationSocketUpdate,
  SocketConnectionHandler,
  SocketUser,
} from './event.interface';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);
  private server: Namespace | null = null;
  private readonly connectionHandlers: SocketConnectionHandler[] = [];

  /**
   * @Responsibility: Register the namespace server used to emit socket events.
   *
   * @param server - The namespace server injected into the gateway
   * @returns {void}
   */
  setServer(server: Namespace): void {
    this.server = server;
  }

  /**
   * @Responsibility: Register a callback invoked whenever a socket connects.
   *
   * @param handler - The connection handler
   * @returns {void}
   */
  onConnection(handler: SocketConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }

  /**
   * @Responsibility: Notify every registered handler of a new connection.
   *
   * @param user - The authenticated socket user
   * @returns {Promise<void>}
   */
  async notifyConnection(user: SocketUser): Promise<void> {
    for (const handler of this.connectionHandlers) {
      try {
        await handler(user);
      } catch (error: unknown) {
        this.logger.error(
          `Connection handler failed for user ${user.userId}`,
          error as Error,
        );
      }
    }
  }

  /**
   * @Responsibility: Resolve the private room name for a user.
   *
   * @param userId - The user id
   * @returns {string}
   */
  userRoom(userId: string): string {
    return `${USER_ROOM_PREFIX}${userId}`;
  }

  /**
   * @Responsibility: Resolve the organization room name.
   *
   * @param organizationId - The organization id
   * @returns {string}
   */
  orgRoom(organizationId: string): string {
    return `${ORG_ROOM_PREFIX}${organizationId}`;
  }

  /**
   * @Responsibility: Check whether a user has at least one live socket.
   *
   * @param userId - The user id
   * @returns {boolean}
   */
  isOnline(userId: string): boolean {
    const room = this.server?.adapter?.rooms?.get(this.userRoom(userId));
    return Boolean(room && room.size > 0);
  }

  /**
   * @Responsibility: Emit a new notification to a specific user.
   *
   * @param userId - The recipient user id
   * @param payload - The notification payload
   * @returns {boolean} Whether the user was online
   */
  emitNotification(userId: string, payload: NotificationSocketPayload): boolean {
    return this.emitToUser(userId, NotificationSocketEvent.NEW, payload);
  }

  /**
   * @Responsibility: Emit a notification update to a specific user.
   *
   * @param userId - The recipient user id
   * @param payload - The update payload
   * @returns {boolean} Whether the user was online
   */
  emitNotificationUpdate(
    userId: string,
    payload: NotificationSocketUpdate,
  ): boolean {
    return this.emitToUser(userId, NotificationSocketEvent.UPDATED, payload);
  }

  /**
   * @Responsibility: Emit an unread-count update to a specific user.
   *
   * @param userId - The recipient user id
   * @param count - The unread count
   * @returns {boolean} Whether the user was online
   */
  emitUnreadCount(userId: string, count: number): boolean {
    return this.emitToUser(userId, NotificationSocketEvent.UNREAD_COUNT, {
      count,
    });
  }

  /**
   * @Responsibility: Emit a read acknowledgment to a specific user.
   *
   * @param userId - The recipient user id
   * @param payload - The read payload
   * @returns {boolean} Whether the user was online
   */
  emitRead(
    userId: string,
    payload: { deliveryId: string; isRead: boolean; readAt: Date | null },
  ): boolean {
    return this.emitToUser(userId, NotificationSocketEvent.READ, payload);
  }

  /**
   * @Responsibility: Emit a batch of pending notifications to a specific user.
   *
   * @param userId - The recipient user id
   * @param items - The pending notification payloads
   * @returns {boolean} Whether the user was online
   */
  emitSync(userId: string, items: NotificationSocketPayload[]): boolean {
    return this.emitToUser(userId, NotificationSocketEvent.SYNC, { items });
  }

  /**
   * @Responsibility: Emit an arbitrary event to a specific user.
   *
   * @param userId - The recipient user id
   * @param event - The event name
   * @param payload - The event payload
   * @returns {boolean} Whether the user was online
   */
  emitToUser(userId: string, event: string, payload: unknown): boolean {
    if (!this.server || !this.isOnline(userId)) {
      return false;
    }

    this.server.to(this.userRoom(userId)).emit(event, payload);
    return true;
  }

  /**
   * @Responsibility: Emit an arbitrary event to an organization room.
   *
   * @param organizationId - The organization id
   * @param event - The event name
   * @param payload - The event payload
   * @returns {void}
   */
  emitToOrganization(
    organizationId: string,
    event: string,
    payload: unknown,
  ): void {
    this.server?.to(this.orgRoom(organizationId)).emit(event, payload);
  }
}
