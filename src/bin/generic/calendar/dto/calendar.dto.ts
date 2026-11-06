import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CalendarEventCategory,
  CALENDAR_CATEGORIES,
} from '../enum/calendar.enum';
import { CalendarView } from '../enum/calendar.enum';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class CreateCalendarEventDto {
  @IsString({ message: 'Event title must be a string.' })
  @IsNotEmpty({ message: 'Event title is required.' })
  @MaxLength(160, { message: 'Event title must be at most 160 characters.' })
  title: string;

  @IsString({ message: 'Description must be a string.' })
  @IsOptional()
  @MaxLength(2000, { message: 'Description must be at most 2000 characters.' })
  description?: string | null;

  @IsString({ message: 'Start date time must be a string.' })
  @IsNotEmpty({ message: 'Start date time is required.' })
  @Matches(DATETIME_REGEX, {
    message: 'Start date time must be a valid ISO 8601 datetime.',
  })
  startDateTime: string;

  @IsString({ message: 'End date time must be a string.' })
  @IsNotEmpty({ message: 'End date time is required.' })
  @Matches(DATETIME_REGEX, {
    message: 'End date time must be a valid ISO 8601 datetime.',
  })
  endDateTime: string;

  @IsOptional()
  @IsBoolean({ message: 'All day must be a boolean.' })
  allDay?: boolean;

  @IsString({ message: 'Location must be a string.' })
  @IsOptional()
  @MaxLength(200, { message: 'Location must be at most 200 characters.' })
  location?: string | null;

  @IsOptional()
  @IsEnum(CalendarEventCategory, {
    message: `Category must be one of ${CALENDAR_CATEGORIES.join(', ')}.`,
  })
  category?: CalendarEventCategory;

  @IsOptional()
  @IsString({ message: 'Color must be a string.' })
  @Matches(HEX_REGEX, { message: 'Color must be a valid hex color.' })
  color?: string | null;

  @IsOptional()
  @IsArray({ message: 'Invitees must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => CalendarEventInviteeDto)
  invitees?: CalendarEventInviteeDto[];
}

export class CalendarEventInviteeDto {
  @IsBoolean({ message: 'isHost must be a boolean.' })
  @IsNotEmpty({ message: 'isHost is required.' })
  isHost: boolean;

  @IsString({ message: 'Invitee id must be a string.' })
  @IsNotEmpty({ message: 'Invitee id is required.' })
  inviteeId: string;
}

export class UpdateCalendarEventDto {
  @IsString({ message: 'Event id must be a string.' })
  @IsOptional()
  eventId?: string;

  @IsString({ message: 'Event title must be a string.' })
  @IsOptional()
  @MaxLength(160, { message: 'Event title must be at most 160 characters.' })
  title?: string;

  @IsString({ message: 'Description must be a string.' })
  @IsOptional()
  @MaxLength(2000, { message: 'Description must be at most 2000 characters.' })
  description?: string | null;

  @IsString({ message: 'Start date time must be a string.' })
  @IsOptional()
  @Matches(DATETIME_REGEX, {
    message: 'Start date time must be a valid ISO 8601 datetime.',
  })
  startDateTime?: string | null;

  @IsString({ message: 'End date time must be a string.' })
  @IsOptional()
  @Matches(DATETIME_REGEX, {
    message: 'End date time must be a valid ISO 8601 datetime.',
  })
  endDateTime?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'All day must be a boolean.' })
  allDay?: boolean | null;

  @IsString({ message: 'Location must be a string.' })
  @IsOptional()
  @MaxLength(200, { message: 'Location must be at most 200 characters.' })
  location?: string | null;

  @IsOptional()
  @IsEnum(CalendarEventCategory, {
    message: `Category must be one of ${CALENDAR_CATEGORIES.join(', ')}.`,
  })
  category?: CalendarEventCategory;

  @IsOptional()
  @IsString({ message: 'Color must be a string.' })
  @Matches(HEX_REGEX, { message: 'Color must be a valid hex color.' })
  color?: string | null;

  @IsOptional()
  @IsArray({ message: 'Invitees must be an array.' })
  @ValidateNested({ each: true })
  @Type(() => CalendarEventInviteeDto)
  invitees?: CalendarEventInviteeDto[] | null;
}

export class RetrieveCalendarEventDto {
  @IsString({ message: 'Event id must be a string.' })
  @IsNotEmpty({ message: 'Event id is required.' })
  eventId: string;
}

export class ListCalendarEventQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Batch must be an integer.' })
  @Min(1, { message: 'Batch must be at least 1.' })
  batch?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  @Max(100, { message: 'Limit must be at most 100.' })
  limit?: number;

  @IsOptional()
  @IsEnum(CalendarView, { message: 'View is not valid.' })
  view?: CalendarView;

  @IsOptional()
  @IsString({ message: 'Date must be a string.' })
  @Matches(DATE_REGEX, { message: 'Date must be in YYYY-MM-DD format.' })
  date?: string;

  @IsOptional()
  @IsString({ message: 'Start date must be a string.' })
  @Matches(DATE_REGEX, { message: 'Start date must be in YYYY-MM-DD format.' })
  startDate?: string;

  @IsOptional()
  @IsString({ message: 'End date must be a string.' })
  @Matches(DATE_REGEX, { message: 'End date must be in YYYY-MM-DD format.' })
  endDate?: string;

  @IsOptional()
  @IsEnum(CalendarEventCategory, {
    message: `Category must be one of ${CALENDAR_CATEGORIES.join(', ')}.`,
  })
  category?: CalendarEventCategory;

  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(120, { message: 'Search must be at most 120 characters.' })
  search?: string;

  @IsOptional()
  @Matches(/^(true|false)$/, {
    message: 'includeBirthdays must be true or false.',
  })
  includeBirthdays?: string;
}

export class CalendarWidgetQueryDto {
  @IsOptional()
  @IsString({ message: 'Date must be a string.' })
  @Matches(DATE_REGEX, { message: 'Date must be in YYYY-MM-DD format.' })
  date?: string;
}

export class CalendarBirthdaysQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Batch must be an integer.' })
  @Min(1, { message: 'Batch must be at least 1.' })
  batch?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  @Max(100, { message: 'Limit must be at most 100.' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'Start date must be a string.' })
  @Matches(DATE_REGEX, { message: 'Start date must be in YYYY-MM-DD format.' })
  startDate?: string;

  @IsOptional()
  @IsString({ message: 'End date must be a string.' })
  @Matches(DATE_REGEX, { message: 'End date must be in YYYY-MM-DD format.' })
  endDate?: string;
}
