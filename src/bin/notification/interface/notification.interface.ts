import {
  NotificationActionType,
  NotificationCategory,
  NotificationEntityType,
  NotificationResolution,
  NotificationType,
} from '../enum/notification.enum';

export interface NotificationActorInput {
  id?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  isDocument?: boolean;
}

export interface NotificationEntityInput {
  type?: NotificationEntityType;
  id?: string | null;
}

export interface NotificationActionInput {
  type?: NotificationActionType;
  resolution?: NotificationResolution;
}

export interface NotificationRecipient {
  userId: string;
  email?: string | null;
}

export interface DispatchNotificationInput {
  organizationId: string;
  type: NotificationType;
  category: NotificationCategory;
  message: string;
  createdByUserId: string;
  createdByEmail: string;
  actor?: NotificationActorInput;
  entity?: NotificationEntityInput;
  action?: NotificationActionInput;
  metadata?: Record<string, unknown>;
  recipientUserIds?: string[];
  recipientEmails?: string[];
  includeAdmins?: boolean;
  excludeUserIds?: string[];
}

export interface BroadcastNotificationInput {
  organizationId: string;
  message: string;
  createdByUserId: string;
  createdByEmail: string;
  target: 'all' | 'role' | 'user';
  userIds?: string[];
  roleIds?: string[];
  metadata?: Record<string, unknown>;
  includeAdmins?: boolean;
}
