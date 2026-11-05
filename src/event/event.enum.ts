export enum NotificationSocketEvent {
  CONNECTED = 'notification:connected',
  NEW = 'notification:new',
  UPDATED = 'notification:updated',
  READ = 'notification:read',
  UNREAD_COUNT = 'notification:unread-count',
  SYNC = 'notification:sync',
}

export const USER_ROOM_PREFIX = 'user:';
export const ORG_ROOM_PREFIX = 'org:';

export const NOTIFICATION_SOCKET_NAMESPACE = '/events';
