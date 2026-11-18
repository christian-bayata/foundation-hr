export enum EmployeeRequestStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  AWAITING_EMPLOYEE = 'awaiting_employee',
  AWAITING_RESPONSE = 'awaiting_response',
  QUERIED = 'queried',
  ACTIVE = 'active',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  WITHDRAWN = 'withdrawn',
  CLOSED = 'closed',
}

export enum EmployeeRequestStepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted',
  VERIFIED = 'verified',
  QUERIED = 'queried',
  SIGNED = 'signed',
  ESCALATED = 'escalated',
  CLOSED = 'closed',
}

export enum EmployeeRequestStepAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export const EMPLOYEE_REQUEST_STATUSES: EmployeeRequestStatus[] = Object.values(
  EmployeeRequestStatus,
);

export const LEGACY_EMPLOYEE_REQUEST_STATUSES: EmployeeRequestStatus[] = [
  EmployeeRequestStatus.PENDING,
  EmployeeRequestStatus.IN_PROGRESS,
  EmployeeRequestStatus.APPROVED,
  EmployeeRequestStatus.REJECTED,
  EmployeeRequestStatus.CANCELLED,
];
