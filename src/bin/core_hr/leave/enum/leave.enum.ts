export enum LeaveRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum LeaveRequestAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export const LEAVE_REQUEST_STATUSES: LeaveRequestStatus[] = Object.values(
  LeaveRequestStatus,
);
