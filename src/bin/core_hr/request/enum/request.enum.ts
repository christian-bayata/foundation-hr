export enum EmployeeRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum EmployeeRequestStepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum EmployeeRequestStepAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export const EMPLOYEE_REQUEST_STATUSES: EmployeeRequestStatus[] = Object.values(
  EmployeeRequestStatus,
);
