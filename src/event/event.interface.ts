import type { PrincipalType } from '../bin/generic/auth/enum/principal-type.enum';

export interface SocketUser {
  userId: string;
  email: string;
  userType?: string;
  principalType?: PrincipalType;
  employeeId?: string;
  adminUserId?: string;
  organizationId?: string;
}

export interface NotificationSocketActor {
  name: string | null;
  avatarUrl: string | null;
  isDocument: boolean;
}

export interface NotificationSocketEntity {
  type: string;
  id: string | null;
}

export interface NotificationSocketAction {
  type: string;
  resolution: string;
}

export interface NotificationSocketPayload {
  deliveryId: string;
  notificationId: string;
  type: string;
  category: string;
  message: string;
  actor: NotificationSocketActor;
  entity: NotificationSocketEntity;
  action: NotificationSocketAction;
  isRead: boolean;
  deliveryStatus: string;
  createdAt: Date;
}

export interface NotificationSocketUpdate {
  notificationId: string;
  resolution: string;
}

export type SocketConnectionHandler = (
  user: SocketUser,
) => void | Promise<void>;
