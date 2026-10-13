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
