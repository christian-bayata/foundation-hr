export enum ApprovalDeadline {
  ONE_DAY_AFTER_REQUESTED = '1_day_after_requested',
  TWO_DAYS_AFTER_REQUESTED = '2_days_after_requested',
  THREE_DAYS_AFTER_REQUESTED = '3_days_after_requested',
  FOUR_DAYS_AFTER_REQUESTED = '4_days_after_requested',
}

export const APPROVAL_DEADLINE_LABELS: Record<ApprovalDeadline, string> = {
  [ApprovalDeadline.ONE_DAY_AFTER_REQUESTED]: '1 day after requested',
  [ApprovalDeadline.TWO_DAYS_AFTER_REQUESTED]: '2 days after requested',
  [ApprovalDeadline.THREE_DAYS_AFTER_REQUESTED]: '3 days after requested',
  [ApprovalDeadline.FOUR_DAYS_AFTER_REQUESTED]: '4 days after requested',
};

export const APPROVAL_DEADLINES: ApprovalDeadline[] =
  Object.values(ApprovalDeadline);

export enum LeaveExpiry {
  END_OF_YEAR = 'end_of_year',
  END_OF_MONTH = 'end_of_month',
  AFTER_30_DAYS = 'after_30_days',
  AFTER_90_DAYS = 'after_90_days',
  NEVER = 'never',
}

export const LEAVE_EXPIRY_LABELS: Record<LeaveExpiry, string> = {
  [LeaveExpiry.END_OF_YEAR]: 'End of year',
  [LeaveExpiry.END_OF_MONTH]: 'End of month',
  [LeaveExpiry.AFTER_30_DAYS]: 'After 30 days',
  [LeaveExpiry.AFTER_90_DAYS]: 'After 90 days',
  [LeaveExpiry.NEVER]: 'Never',
};

export const LEAVE_EXPIRIES: LeaveExpiry[] = Object.values(LeaveExpiry);

export enum LeaveAllocationMethod {
  FIXED_DAYS = 'fixed_days',
  ACCRUAL = 'accrual',
  PRORATED = 'prorated',
  TENURE = 'tenure',
}

export const LEAVE_ALLOCATION_METHOD_LABELS: Record<
  LeaveAllocationMethod,
  string
> = {
  [LeaveAllocationMethod.FIXED_DAYS]: 'Fixed days',
  [LeaveAllocationMethod.ACCRUAL]: 'Accrual',
  [LeaveAllocationMethod.PRORATED]: 'Prorated',
  [LeaveAllocationMethod.TENURE]: 'Tenure',
};

export const LEAVE_ALLOCATION_METHODS: LeaveAllocationMethod[] = Object.values(
  LeaveAllocationMethod,
);
