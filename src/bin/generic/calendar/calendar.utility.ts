import { CalendarEventCategory } from './enum/calendar.enum';
import { CALENDAR_CATEGORY_COLORS } from './enum/calendar.enum';

export const WEEKDAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const MONTHS_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function formatDate(value?: Date | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatDateTime(value?: Date | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function formatTime(value?: Date | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value)
    .toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\s/g, '');
}

export function formatWeekdayMonthDay(value: Date): string {
  const date = new Date(value);
  const weekday = WEEKDAYS_SHORT[date.getDay()];
  const month = MONTHS_SHORT[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');

  return `${weekday}, ${month} ${day}`.toUpperCase();
}

export function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfWeek(value: Date): Date {
  const date = startOfDay(value);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

export function endOfWeek(value: Date): Date {
  return endOfDay(addDays(startOfWeek(value), 6));
}

export function startOfMonth(value: Date): Date {
  const date = startOfDay(value);
  date.setDate(1);
  return date;
}

export function endOfMonth(value: Date): Date {
  const result = new Date(
    value.getFullYear(),
    value.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return result;
}

export function startOfYear(value: Date): Date {
  const date = startOfDay(value);
  date.setMonth(0, 1);
  return date;
}

export function endOfYear(value: Date): Date {
  const result = new Date(
    value.getFullYear(),
    11,
    31,
    23,
    59,
    59,
    999,
  );
  return result;
}

export function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function parseDateTime(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function initialsFromName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();

  if (first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }

  if (first) {
    return first.charAt(0).toUpperCase();
  }

  if (last) {
    return last.charAt(0).toUpperCase();
  }

  return '??';
}

export function defaultColorForCategory(
  category?: string | null,
): string {
  if (category && category in CALENDAR_CATEGORY_COLORS) {
    return CALENDAR_CATEGORY_COLORS[category as CalendarEventCategory];
  }

  return CALENDAR_CATEGORY_COLORS.other;
}
