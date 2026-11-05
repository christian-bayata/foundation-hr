import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { EventAuthService } from './event.auth';
import { EventService } from './event.service';
import {
  NOTIFICATION_SOCKET_NAMESPACE,
  NotificationSocketEvent,
} from './event.enum';

@WebSocketGateway({
  namespace: NOTIFICATION_SOCKET_NAMESPACE,
})
export class EventGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventGateway.name);

  @WebSocketServer()
  server: Namespace;

  constructor(
    private readonly eventService: EventService,
    private readonly eventAuthService: EventAuthService,
  ) {}

  /**
   * @Responsibility: Provide the namespace server to the emit service.
   *
   * @param server - The namespace server
   * @returns {void}
   */
  afterInit(server: Namespace): void {
    this.eventService.setServer(server);
    this.logger.log(`Notification socket namespace ${NOTIFICATION_SOCKET_NAMESPACE} ready`);
  }

  /**
   * @Responsibility: Authenticate a socket, join its rooms and flush pending
   * notifications.
   *
   * @param socket - The connecting socket
   * @returns {Promise<void>}
   */
  async handleConnection(socket: Socket): Promise<void> {
    try {
      const user = await this.eventAuthService.authenticate(socket);
      socket.data.user = user;

      socket.join(this.eventService.userRoom(user.userId));
      if (user.organizationId) {
        socket.join(this.eventService.orgRoom(user.organizationId));
      }

      socket.emit(NotificationSocketEvent.CONNECTED, {
        userId: user.userId,
      });

      await this.eventService.notifyConnection(user);
    } catch (error: unknown) {
      this.logger.warn(
        `Rejected socket connection: ${(error as Error)?.message ?? 'unknown error'}`,
      );
      socket.disconnect(true);
    }
  }

  /**
   * @Responsibility: Log socket disconnections.
   *
   * @param socket - The disconnecting socket
   * @returns {void}
   */
  handleDisconnect(socket: Socket): void {
    const userId = socket.data?.user?.userId;
    if (userId) {
      this.logger.debug(`Socket disconnected for user ${userId}`);
    }
  }
}
