export enum NotificationType {
  LEAVE_REQUEST_APPROVED = 'leave_request_approved',
  LEAVE_REQUEST_REJECTED = 'leave_request_rejected',
  REQUEST_SUBMITTED = 'request_submitted',
  REQUEST_STEP_UPDATED = 'request_step_updated',
  REQUEST_APPROVED = 'request_approved',
  REQUEST_REJECTED = 'request_rejected',
  REQUEST_CANCELLED = 'request_cancelled',
  OFFBOARDING_INITIATED = 'offboarding_initiated',
  OFFBOARDING_CHECKLIST_UPDATED = 'offboarding_checklist_updated',
  OFFBOARDING_DOCUMENT_UPDATED = 'offboarding_document_updated',
  OFFBOARDING_COMPLETED = 'offboarding_completed',
  ONBOARDING_CREATED = 'onboarding_created',
  ONBOARDING_STEP_UPDATED = 'onboarding_step_updated',
  ONBOARDING_CANCELLED = 'onboarding_cancelled',
  ONBOARDING_NUDGED = 'onboarding_nudged',
  ONBOARDING_PROFILE_UPDATED = 'onboarding_profile_updated',
  EMPLOYEE_INVITED = 'employee_invited',
  BROADCAST = 'broadcast',
}

export enum NotificationCategory {
  LEAVE = 'leave',
  REQUEST = 'request',
  OFFBOARDING = 'offboarding',
  ONBOARDING = 'onboarding',
  EMPLOYEE = 'employee',
  SYSTEM = 'system',
}

export enum NotificationActionType {
  APPROVE = 'approve',
  REVIEW = 'review',
  VIEW = 'view',
  NONE = 'none',
}

export enum NotificationResolution {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  NONE = 'none',
}

export enum NotificationEntityType {
  LEAVE_REQUEST = 'leave_request',
  REQUEST = 'request',
  OFFBOARDING = 'offboarding',
  ONBOARDING = 'onboarding',
  EMPLOYEE = 'employee',
  BROADCAST = 'broadcast',
  SYSTEM = 'system',
}

export enum NotificationDeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
}

export enum NotificationFeedStatus {
  ALL = 'all',
  UNREAD = 'unread',
  READ = 'read',
}

export enum NotificationBroadcastTarget {
  ALL = 'all',
  ROLE = 'role',
  USER = 'user',
}
