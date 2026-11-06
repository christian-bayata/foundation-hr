export enum CalendarEventCategory {
  MEETING = 'meeting',
  COMPANY_EVENT = 'company_event',
  PERSONAL = 'personal',
  TRAINING = 'training',
  HOLIDAY = 'holiday',
  REMINDER = 'reminder',
  OTHER = 'other',
}

export const CALENDAR_CATEGORY_COLORS: Record<CalendarEventCategory, string> = {
  [CalendarEventCategory.MEETING]: '#2196F3',
  [CalendarEventCategory.COMPANY_EVENT]: '#FF9800',
  [CalendarEventCategory.PERSONAL]: '#F44336',
  [CalendarEventCategory.TRAINING]: '#009688',
  [CalendarEventCategory.HOLIDAY]: '#4CAF50',
  [CalendarEventCategory.REMINDER]: '#9C27B0',
  [CalendarEventCategory.OTHER]: '#9E9E9E',
};

export const CALENDAR_CATEGORIES: CalendarEventCategory[] = Object.values(
  CalendarEventCategory,
);

export enum CalendarView {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export const CALENDAR_VIEWS: CalendarView[] = Object.values(CalendarView);
