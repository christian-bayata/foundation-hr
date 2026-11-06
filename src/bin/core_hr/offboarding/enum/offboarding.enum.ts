export enum ExitRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum ExitChecklistKind {
  EXIT = 'exit',
  COMPLIANCE = 'compliance',
}

export const EXIT_REQUEST_STATUSES: ExitRequestStatus[] = Object.values(
  ExitRequestStatus,
);
