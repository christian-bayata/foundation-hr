import { CalendarEventCategory } from '../enum/calendar.enum';
import { CalendarView } from '../enum/calendar.enum';

export interface CalendarEventCreator {
  userId: string;
  email: string;
  name: string | null;
}

export interface CalendarEventInvitee {
  isHost: boolean;
  inviteeId: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

export interface CalendarEventView {
  id: string;
  title: string;
  description: string | null;
  startDateTime: string;
  endDateTime: string;
  allDay: boolean;
  location: string | null;
  category: CalendarEventCategory;
  color: string;
  source: 'event';
  invitees: CalendarEventInvitee[];
  startTime: string | null;
  endTime: string | null;
  dateLabel: string | null;
  createdBy: CalendarEventCreator | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarBirthdayEmployee {
  employeeId: string;
  employeeName: string;
  email: string | null;
  avatar: string | null;
  initials: string;
}

export interface CalendarBirthdayView {
  id: string;
  employeeId: string;
  employeeName: string;
  email: string | null;
  avatar: string | null;
  initials: string;
  date: string;
  label: string;
  source: 'birthday';
}

export type CalendarTimelineItem = CalendarEventView | CalendarBirthdayView;

export interface CalendarDayView {
  date: string;
  label: string;
  events: CalendarEventView[];
  birthdays: CalendarBirthdayView[];
}

export interface CalendarWidgetBirthdayEmployee
  extends CalendarBirthdayEmployee {}

export interface CalendarWidgetView {
  generatedAt: string;
  today: CalendarDayView;
  tomorrow: CalendarDayView;
  birthdayBanner: {
    count: number;
    employees: CalendarWidgetBirthdayEmployee[];
  };
}

export interface CalendarEventListView {
  data: CalendarTimelineItem[];
  count: number;
  page: number;
  limit: number;
  range: {
    view: CalendarView;
    startDate: string;
    endDate: string;
  };
}

export interface CalendarBirthdayListView {
  data: CalendarBirthdayView[];
  count: number;
  page: number;
  limit: number;
  range: {
    startDate: string;
    endDate: string;
  };
}
