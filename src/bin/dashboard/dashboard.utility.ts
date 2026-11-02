import { EmployeeOnboardingStep } from '../employee/entity/employee.schema';
import { OnboardingStatus } from '../onboarding/enum/onboarding-status.enum';
import { DueDate } from '../setting/employee-profiles/enum/employee-profile.enum';
import { DashboardTrendBucket } from './interface/dashboard.interface';

export function startOfDay(value: Date): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    0,
    0,
    0,
    0,
  );
}

export function endOfDay(value: Date): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(value: Date): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

export function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function daysBetween(from: Date, to: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) /
      millisecondsPerDay,
  );
}

export function formatDate(value?: Date | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatDateTime(value?: Date | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function toDate(value?: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function percent(value: number, total: number): number {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 1000) / 10;
}

export function safeChange(
  value: number,
  previousValue: number,
): {
  change: number;
  changePercent: number | null;
  changeDirection: 'up' | 'down' | 'flat';
} {
  const change = value - previousValue;
  const changePercent =
    previousValue === 0
      ? null
      : Math.round((change / previousValue) * 1000) / 10;

  return {
    change,
    changePercent,
    changeDirection: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
  };
}

export function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getEmployeeName(employee: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  return (
    `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
    employee.email ||
    'Unknown employee'
  );
}

export function buildMonthBuckets(
  start: Date,
  end: Date,
): DashboardTrendBucket[] {
  const buckets: DashboardTrendBucket[] = [];
  const cursor = startOfMonth(start);
  const last = startOfMonth(end);

  while (cursor.getTime() <= last.getTime() && buckets.length < 36) {
    const bucketStart = startOfMonth(cursor);
    const key = `${bucketStart.getFullYear()}-${String(
      bucketStart.getMonth() + 1,
    ).padStart(2, '0')}`;

    buckets.push({
      key,
      label: bucketStart.toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      shortLabel: bucketStart.toLocaleString('en-US', { month: 'short' }),
      headcount: 0,
      newHires: 0,
      exits: 0,
      approvedLeaveRequests: 0,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

export function buildDayBuckets(
  start: Date,
  end: Date,
  max = 365,
): DashboardTrendBucket[] {
  const buckets: DashboardTrendBucket[] = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);

  while (cursor.getTime() <= last.getTime() && buckets.length < max) {
    const bucketStart = startOfDay(cursor);
    const key = formatDate(bucketStart) ?? '';

    buckets.push({
      key,
      label: bucketStart.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      shortLabel: String(bucketStart.getDate()),
      headcount: 0,
      newHires: 0,
      exits: 0,
      approvedLeaveRequests: 0,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

export function resolveStepDueDate(
  employmentDate: Date | null | undefined,
  dueDate: DueDate,
): Date | null {
  if (!employmentDate) {
    return null;
  }

  const daysAfterJoining = Number.parseInt(dueDate, 10);

  if (Number.isNaN(daysAfterJoining)) {
    return null;
  }

  const resolved = new Date(employmentDate);
  resolved.setDate(resolved.getDate() + daysAfterJoining);

  return resolved;
}

export function isStepOverdue(
  step: EmployeeOnboardingStep,
  employmentDate: Date | null | undefined,
  now: Date,
): boolean {
  if (step.isCompleted || !step.dueDate || !employmentDate) {
    return false;
  }

  const dueDate = resolveStepDueDate(employmentDate, step.dueDate);

  if (!dueDate) {
    return false;
  }

  dueDate.setHours(23, 59, 59, 999);

  return dueDate.getTime() < now.getTime();
}

export function getOnboardingStatus(
  steps: EmployeeOnboardingStep[],
  employmentDate: Date | null | undefined,
  overallProgress: number,
): OnboardingStatus {
  if (overallProgress === 100) {
    return OnboardingStatus.ONBOARDED;
  }

  const now = new Date();
  const hasOverdueStep = steps.some((step) =>
    isStepOverdue(step, employmentDate, now),
  );

  if (hasOverdueStep) {
    return OnboardingStatus.OVERDUE;
  }

  if (overallProgress === 0) {
    return OnboardingStatus.DRAFT;
  }

  return OnboardingStatus.INCOMPLETE;
}
