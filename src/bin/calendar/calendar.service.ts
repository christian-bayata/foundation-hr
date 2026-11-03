import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { QueryFilter } from 'mongoose';
import type { CurrentUser as ICurrentUser } from '../../common';
import { AppResponse } from '../../common/response/app-response';
import { EmployeeDocument } from '../employee/entity/employee.schema';
import { EmployeeStatus } from '../employee/enum/employee.enum';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { CalendarEventDocument } from './entity/calendar-event.schema';
import { CalendarEventCategory } from './enum/calendar.enum';
import { CalendarView } from './enum/calendar.enum';
import {
  CalendarBirthdayListView,
  CalendarBirthdayView,
  CalendarEventInvitee,
  CalendarEventListView,
  CalendarEventView,
  CalendarTimelineItem,
  CalendarWidgetView,
} from './interface/calendar.interface';
import { CalendarEventRepository } from './repository/calendar-event.repository';
import { UserRepository } from '../auth/repository/user.repository';
import {
  CreateCalendarEventDto,
  ListCalendarEventQueryDto,
  RetrieveCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarWidgetQueryDto,
  CalendarBirthdaysQueryDto,
} from './dto/calendar.dto';
import {
  addDays,
  defaultColorForCategory,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  formatDate,
  formatDateTime,
  formatTime,
  formatWeekdayMonthDay,
  initialsFromName,
  parseDate,
  parseDateTime,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from './calendar.utility';

const DEFAULT_BATCH = 1;
const DEFAULT_LIMIT = 10;

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @Inject(CalendarEventRepository)
    private readonly calendarEventRepository: CalendarEventRepository,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(UserRepository)
    private readonly userRepository: UserRepository,
  ) {}

  async addEvent(
    organizationId: string,
    user: ICurrentUser,
    dto: CreateCalendarEventDto,
  ) {
    try {
      const startDateTime = parseDateTime(dto.startDateTime) as Date;
      const endDateTime = parseDateTime(dto.endDateTime) as Date;

      if (!startDateTime || !endDateTime) {
        AppResponse.error({
          message: 'Start and end date time must be valid.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      if (endDateTime.getTime() <= startDateTime.getTime()) {
        AppResponse.error({
          message: 'End date time must be after start date time.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const category = dto.category ?? CalendarEventCategory.OTHER;
      const color = dto.color ?? defaultColorForCategory(category);
      const allDay = dto.allDay ?? false;

      let finalStart = startDateTime;
      let finalEnd = endDateTime;

      if (allDay) {
        finalStart = startOfDay(startDateTime);
        finalEnd = endOfDay(endDateTime);
      }

      const createdBy = await this.resolveCreator(organizationId, user);
      const invitees = dto.invitees ?? [];

      const event = await this.calendarEventRepository.create({
        organizationId,
        title: dto.title.trim(),
        description: dto.description ?? null,
        startDateTime: finalStart,
        endDateTime: finalEnd,
        allDay,
        location: dto.location ?? null,
        category,
        color,
        invitees: invitees.map((invitee) => ({
          isHost: invitee.isHost,
          inviteeId: invitee.inviteeId,
        })),
        createdByUserId: createdBy.userId,
        createdByEmail: createdBy.email,
        createdByName: createdBy.name,
      });

      const inviteeViewMap = await this.buildInviteeViewMap(
        organizationId,
        event.invitees.map((invitee) => invitee.inviteeId),
      );

      return this.toEventView(event, inviteeViewMap);
    } catch (error: unknown) {
      this.handleError(error, this.addEvent.name);
    }
  }

  async listEvents(
    organizationId: string,
    query: ListCalendarEventQueryDto,
  ): Promise<CalendarEventListView> {
    try {
      const batch = query.batch ?? DEFAULT_BATCH;
      const limit = query.limit ?? DEFAULT_LIMIT;

      const range = this.resolveRange(query);

      const where: QueryFilter<CalendarEventDocument> = {
        organizationId,
        startDateTime: { $lte: range.endDate },
        endDateTime: { $gte: range.startDate },
      };

      if (query.category) {
        where.category = query.category;
      }

      if (query.search?.trim()) {
        const search = this.escapeRegex(query.search.trim());
        where.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ];
      }

      const includeBirthdays = query.includeBirthdays === 'true';

      if (includeBirthdays) {
        const events = await this.calendarEventRepository.findAll(where, {
          startDateTime: 1,
        });
        const employees = await this.getActiveEmployeesWithDob(organizationId);
        const birthdays = this.getBirthdaysInRange(
          employees,
          range.startDate,
          range.endDate,
          query.search,
        );

        const allInviteeIds = events
          .map((event) => event.invitees ?? [])
          .flatMap((invitees) => invitees.map((invitee) => invitee.inviteeId));
        const inviteeViewMap = await this.buildInviteeViewMap(
          organizationId,
          allInviteeIds,
        );

        const merged: CalendarTimelineItem[] = [
          ...events.map((event) => this.toEventView(event, inviteeViewMap)),
          ...birthdays,
        ];
        merged.sort(
          (a, b) =>
            new Date(
              a.source === 'event'
                ? a.startDateTime
                : `${a.date}T00:00:00.000Z`,
            ).getTime() -
            new Date(
              b.source === 'event'
                ? b.startDateTime
                : `${b.date}T00:00:00.000Z`,
            ).getTime(),
        );

        const count = merged.length;
        const start = (batch - 1) * limit;
        const data = merged
          .slice(start, start + limit)
          .map((item) =>
            item.source === 'event' ? item : this.birthdayToTimeline(item),
          );

        return {
          data,
          count,
          page: batch,
          limit,
          range: {
            view: range.view,
            startDate: formatDate(range.startDate) as string,
            endDate: formatDate(range.endDate) as string,
          },
        };
      }

      const { items, total } =
        await this.calendarEventRepository.paginatedQuery(
          where,
          { startDateTime: 1 },
          batch,
          limit,
        );

      const allInviteeIds = items
        .map((item) => item.invitees ?? [])
        .flatMap((invitees) => invitees.map((invitee) => invitee.inviteeId));
      const inviteeViewMap = await this.buildInviteeViewMap(
        organizationId,
        allInviteeIds,
      );

      return {
        data: items.map((event) => this.toEventView(event, inviteeViewMap)),
        count: total,
        page: batch,
        limit,
        range: {
          view: range.view,
          startDate: formatDate(range.startDate) as string,
          endDate: formatDate(range.endDate) as string,
        },
      };
    } catch (error: unknown) {
      this.handleError(error, this.listEvents.name);
    }
  }

  async retrieveEvent(
    organizationId: string,
    dto: RetrieveCalendarEventDto,
  ): Promise<CalendarEventView> {
    try {
      const event = await this.findEventOrFail(organizationId, dto.eventId);

      const inviteeViewMap = await this.buildInviteeViewMap(
        organizationId,
        event.invitees.map((invitee) => invitee.inviteeId),
      );

      return this.toEventView(event, inviteeViewMap);
    } catch (error: unknown) {
      this.handleError(error, this.retrieveEvent.name);
    }
  }

  async updateEvent(
    organizationId: string,
    dto: RetrieveCalendarEventDto & UpdateCalendarEventDto,
  ): Promise<CalendarEventView> {
    try {
      const event = await this.findEventOrFail(organizationId, dto.eventId);

      const startDateTime = dto.startDateTime
        ? (parseDateTime(dto.startDateTime) as Date)
        : event.startDateTime;
      const endDateTime = dto.endDateTime
        ? (parseDateTime(dto.endDateTime) as Date)
        : event.endDateTime;

      if (!startDateTime || !endDateTime) {
        AppResponse.error({
          message: 'Start and end date time must be valid.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      if (endDateTime.getTime() <= startDateTime.getTime()) {
        AppResponse.error({
          message: 'End date time must be after start date time.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      let finalStart = startDateTime;
      let finalEnd = endDateTime;
      let allDay = dto.allDay ?? event.allDay;

      if (allDay) {
        finalStart = startOfDay(startDateTime);
        finalEnd = endOfDay(endDateTime);
      }

      const category = dto.category ?? event.category;
      const color =
        dto.color !== undefined
          ? dto.color
          : dto.category !== undefined
            ? defaultColorForCategory(category)
            : (event.color ?? defaultColorForCategory(category));

      const updateData: Record<string, unknown> = {};

      if (dto.title !== undefined) {
        updateData.title = dto.title.trim();
      }

      if (dto.description !== undefined) {
        updateData.description = dto.description;
      }

      if (dto.startDateTime !== undefined || dto.endDateTime !== undefined) {
        updateData.startDateTime = finalStart;
        updateData.endDateTime = finalEnd;
      }

      if (dto.allDay !== undefined) {
        updateData.allDay = allDay;
      }

      if (dto.location !== undefined) {
        updateData.location = dto.location;
      }

      if (dto.category !== undefined) {
        updateData.category = category;
      }

      if (dto.color !== undefined || dto.category !== undefined) {
        updateData.color = color;
      }

      if (dto.invitees) {
        updateData.invitees = dto.invitees.map((invitee) => ({
          isHost: invitee.isHost,
          inviteeId: invitee.inviteeId,
        }));
      }

      const updated = await this.calendarEventRepository.updateById(
        String(event._id),
        updateData,
      );

      const finalEvent = updated ?? event;
      const inviteeViewMap = await this.buildInviteeViewMap(
        organizationId,
        finalEvent.invitees.map((invitee) => invitee.inviteeId),
      );

      return this.toEventView(finalEvent, inviteeViewMap);
    } catch (error: unknown) {
      this.handleError(error, this.updateEvent.name);
    }
  }

  async deleteEvent(
    organizationId: string,
    dto: RetrieveCalendarEventDto,
  ): Promise<{ id: string }> {
    try {
      const event = await this.findEventOrFail(organizationId, dto.eventId);

      await this.calendarEventRepository.deleteById(String(event._id));

      this.logger.log(
        `Deleted calendar event ${String(event._id)} in org ${organizationId}`,
      );

      return { id: dto.eventId };
    } catch (error: unknown) {
      this.handleError(error, this.deleteEvent.name);
    }
  }

  async retrieveWidget(
    organizationId: string,
    query: CalendarWidgetQueryDto,
  ): Promise<CalendarWidgetView> {
    try {
      const anchor = query.date
        ? startOfDay(parseDate(query.date) as Date)
        : startOfDay(new Date());

      const todayStart = anchor;
      const todayEnd = endOfDay(anchor);
      const tomorrowStart = startOfDay(addDays(anchor, 1));
      const tomorrowEnd = endOfDay(tomorrowStart);

      const employees = await this.getActiveEmployeesWithDob(organizationId);

      const today = await this.buildDayView(
        organizationId,
        todayStart,
        todayEnd,
        employees,
        formatWeekdayMonthDay(anchor),
      );
      const tomorrow = await this.buildDayView(
        organizationId,
        tomorrowStart,
        tomorrowEnd,
        employees,
        'TOMORROW',
      );

      return {
        generatedAt: new Date().toISOString(),
        today,
        tomorrow,
        birthdayBanner: {
          count: today.birthdays.length,
          employees: today.birthdays.map((birthday) => ({
            employeeId: birthday.employeeId,
            employeeName: birthday.employeeName,
            email: birthday.email,
            avatar: birthday.avatar,
            initials: birthday.initials,
          })),
        },
      };
    } catch (error: unknown) {
      this.handleError(error, this.retrieveWidget.name);
    }
  }

  async retrieveBirthdays(
    organizationId: string,
    query: CalendarBirthdaysQueryDto,
  ): Promise<CalendarBirthdayListView> {
    try {
      const batch = query.batch ?? DEFAULT_BATCH;
      const limit = query.limit ?? DEFAULT_LIMIT;

      const startDate =
        query.startDate != null
          ? (startOfDay(parseDate(query.startDate) as Date) as Date)
          : startOfDay(new Date());
      const endDate =
        query.endDate != null
          ? (endOfDay(parseDate(query.endDate) as Date) as Date)
          : endOfDay(startDate);

      if (!startDate || !endDate || endDate.getTime() < startDate.getTime()) {
        AppResponse.error({
          message: 'Start and end date must be valid.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const employees = await this.getActiveEmployeesWithDob(organizationId);
      const birthdays = this.getBirthdaysInRange(
        employees,
        startDate,
        endDate,
        undefined,
      ).sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime() ||
          a.employeeName.localeCompare(b.employeeName),
      );

      const count = birthdays.length;
      const start = (batch - 1) * limit;
      const data = birthdays.slice(start, start + limit);

      return {
        data,
        count,
        page: batch,
        limit,
        range: {
          startDate: formatDate(startDate) as string,
          endDate: formatDate(endDate) as string,
        },
      };
    } catch (error: unknown) {
      this.handleError(error, this.retrieveBirthdays.name);
    }
  }

  private resolveRange(query: ListCalendarEventQueryDto): {
    view: CalendarView;
    startDate: Date;
    endDate: Date;
  } {
    if (query.startDate && query.endDate) {
      const start = startOfDay(parseDate(query.startDate) as Date);
      const end = endOfDay(parseDate(query.endDate) as Date);

      if (!start || !end || end.getTime() < start.getTime()) {
        AppResponse.error({
          message: 'Start and end date must be valid.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      return { view: CalendarView.DAY, startDate: start, endDate: end };
    }

    const view = query.view ?? CalendarView.DAY;
    const anchor = query.date ? (parseDate(query.date) as Date) : new Date();

    if (!anchor) {
      AppResponse.error({
        message: 'Date must be valid.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    switch (view) {
      case CalendarView.WEEK:
        return {
          view,
          startDate: startOfWeek(anchor),
          endDate: endOfWeek(anchor),
        };
      case CalendarView.MONTH:
        return {
          view,
          startDate: startOfMonth(anchor),
          endDate: endOfMonth(anchor),
        };
      case CalendarView.YEAR:
        return {
          view,
          startDate: startOfYear(anchor),
          endDate: endOfYear(anchor),
        };
      case CalendarView.DAY:
      default:
        return {
          view,
          startDate: startOfDay(anchor),
          endDate: endOfDay(anchor),
        };
    }
  }

  private async findEventOrFail(
    organizationId: string,
    eventId: string,
  ): Promise<CalendarEventDocument> {
    const event = await this.calendarEventRepository.findById(
      organizationId,
      eventId,
    );

    if (!event) {
      AppResponse.error({
        message: 'Calendar event not found',
        status: HttpStatus.NOT_FOUND,
      });
    }

    return event as CalendarEventDocument;
  }

  private async resolveCreator(
    organizationId: string,
    user: ICurrentUser,
  ): Promise<{ userId: string; email: string; name: string | null }> {
    let name: string | null = null;

    if (user.employeeId) {
      const employee = await this.employeeRepository.findById(user.employeeId);

      if (employee && employee.organizationId === organizationId) {
        name = this.getEmployeeName(employee);
      }
    }

    return {
      userId: user.userId,
      email: user.email,
      name,
    };
  }

  private async getActiveEmployeesWithDob(
    organizationId: string,
  ): Promise<EmployeeDocument[]> {
    const employees = await this.employeeRepository.findByOrganization(
      organizationId,
      'firstName lastName email avatarUrl personalDetails status',
    );

    return employees.filter(
      (employee) =>
        employee.status !== EmployeeStatus.DRAFT &&
        employee.status !== EmployeeStatus.TERMINATED &&
        employee.personalDetails?.dateOfBirth,
    );
  }

  private getBirthdaysInRange(
    employees: EmployeeDocument[],
    start: Date,
    end: Date,
    search?: string | null,
  ): CalendarBirthdayView[] {
    const searchTerm = search?.trim().toLowerCase();
    const birthdays: CalendarBirthdayView[] = [];
    const seen = new Set<string>();

    for (const employee of employees) {
      const dob = employee.personalDetails?.dateOfBirth;
      if (!dob) {
        continue;
      }

      const candidateDates = this.birthdayCandidateDates(dob, start, end);

      for (const date of candidateDates) {
        const key = `${String(employee._id)}:${date}`;
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);

        const employeeName = this.getEmployeeName(employee);

        if (searchTerm && !employeeName.toLowerCase().includes(searchTerm)) {
          continue;
        }

        birthdays.push({
          id: `birthday:${String(employee._id)}:${date}`,
          employeeId: String(employee._id),
          employeeName,
          email: employee.email ?? null,
          avatar: employee.avatarUrl ?? null,
          initials: initialsFromName(employee.firstName, employee.lastName),
          date,
          label: `${employeeName}’s Birthday`,
          source: 'birthday',
        });
      }
    }

    return birthdays;
  }

  private birthdayCandidateDates(dob: Date, start: Date, end: Date): string[] {
    const dates: string[] = [];
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      let candidate = new Date(year, dob.getMonth(), dob.getDate());

      if (
        dob.getMonth() === 1 &&
        dob.getDate() === 29 &&
        candidate.getDate() !== 29
      ) {
        candidate = new Date(year, 1, 28);
      }

      if (
        candidate.getTime() >= start.getTime() &&
        candidate.getTime() <= end.getTime()
      ) {
        dates.push(formatDate(candidate) as string);
      }
    }

    return dates.sort();
  }

  private async buildDayView(
    organizationId: string,
    start: Date,
    end: Date,
    employees: EmployeeDocument[],
    label: string,
  ): Promise<{
    date: string;
    label: string;
    events: CalendarEventView[];
    birthdays: CalendarBirthdayView[];
  }> {
    const where: QueryFilter<CalendarEventDocument> = {
      organizationId,
      startDateTime: { $lte: end },
      endDateTime: { $gte: start },
    };

    const events = await this.calendarEventRepository.findAll(where, {
      startDateTime: 1,
    });

    const allInviteeIds = events
      .map((event) => event.invitees ?? [])
      .flatMap((invitees) => invitees.map((invitee) => invitee.inviteeId));
    const inviteeViewMap = await this.buildInviteeViewMap(
      organizationId,
      allInviteeIds,
    );

    const birthdays = this.getBirthdaysInRange(employees, start, end);

    return {
      date: formatDate(start) as string,
      label,
      events: events.map((event) => this.toEventView(event, inviteeViewMap)),
      birthdays,
    };
  }

  private mergeTimeline(
    events: CalendarEventDocument[],
    birthdays: CalendarBirthdayView[],
  ): CalendarTimelineItem[] {
    return [...events.map((event) => this.toEventView(event)), ...birthdays];
  }

  private birthdayToTimeline(
    birthday: CalendarBirthdayView,
  ): CalendarTimelineItem {
    return {
      id: birthday.id,
      title: birthday.label,
      description: null,
      startDateTime: `${birthday.date}T00:00:00.000Z`,
      endDateTime: `${birthday.date}T23:59:59.999Z`,
      allDay: true,
      location: null,
      category: CalendarEventCategory.OTHER,
      color: defaultColorForCategory(CalendarEventCategory.OTHER),
      source: 'birthday',
      startTime: null,
      endTime: null,
      dateLabel: birthday.date,
      createdBy: null,
      createdAt: formatDateTime(new Date(birthday.date)) as string,
      updatedAt: formatDateTime(new Date(birthday.date)) as string,
    } as unknown as CalendarTimelineItem;
  }

  private toEventView(
    event: CalendarEventDocument,
    inviteeViewMap?: Map<
      string,
      { firstName: string; lastName: string; avatar: string | null }
    >,
  ): CalendarEventView {
    const invitees: CalendarEventInvitee[] = (event.invitees ?? []).map(
      (invitee) => {
        const detail = inviteeViewMap?.get(invitee.inviteeId);

        return {
          isHost: invitee.isHost,
          inviteeId: invitee.inviteeId,
          firstName: detail?.firstName ?? 'Unknown',
          lastName: detail?.lastName ?? 'Employee',
          avatar: detail?.avatar ?? null,
        };
      },
    );

    return {
      id: String(event._id),
      title: event.title,
      description: event.description ?? null,
      startDateTime: formatDateTime(event.startDateTime) as string,
      endDateTime: formatDateTime(event.endDateTime) as string,
      allDay: event.allDay,
      location: event.location ?? null,
      category: event.category,
      color: event.color ?? defaultColorForCategory(event.category),
      source: 'event',
      invitees,
      startTime: event.allDay
        ? null
        : (formatTime(event.startDateTime) as string),
      endTime: event.allDay ? null : (formatTime(event.endDateTime) as string),
      dateLabel: formatDate(event.startDateTime) as string,
      createdBy: {
        userId: event.createdByUserId,
        email: event.createdByEmail,
        name: event.createdByName ?? null,
      },
      createdAt: formatDateTime(event.createdAt) as string,
      updatedAt: formatDateTime(event.updatedAt) as string,
    };
  }

  private async buildInviteeViewMap(
    organizationId: string,
    inviteeIds: string[],
  ): Promise<
    Map<string, { firstName: string; lastName: string; avatar: string | null }>
  > {
    const map = new Map<
      string,
      { firstName: string; lastName: string; avatar: string | null }
    >();

    if (inviteeIds.length === 0) {
      return map;
    }

    const uniqueIds = [...new Set(inviteeIds)];

    // Check employees first
    const employees = await this.employeeRepository.findByOrganization(
      organizationId,
      'firstName lastName avatarUrl employeeId',
    );

    const unresolvedIds: string[] = [];

    for (const employee of employees) {
      if (uniqueIds.includes(String(employee._id))) {
        map.set(String(employee._id), {
          firstName: employee.firstName ?? 'Unknown',
          lastName: employee.lastName ?? 'Employee',
          avatar: employee.avatarUrl ?? null,
        });
      } else {
        unresolvedIds.push(String(employee._id));
      }
    }

    // Then fall back to users for ids not matched as employees
    const userIds = uniqueIds.filter(
      (id) => !map.has(id) && !unresolvedIds.includes(id),
    );

    if (userIds.length > 0) {
      const userDoc = await this.userRepository.findUser({
        _id: { $in: userIds },
      });

      if (userDoc) {
        const userMap = new Map<string, any>();
        userMap.set(String(userDoc._id), userDoc);

        for (const id of userIds) {
          const foundUser = userMap.get(id);
          if (foundUser) {
            map.set(id, {
              firstName: foundUser.firstName ?? 'Unknown',
              lastName: foundUser.lastName ?? 'User',
              avatar: null,
            });
          }
        }
      }
    }

    return map;
  }

  private getEmployeeName(employee: {
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

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private handleError(error: unknown, method: string): never {
    const err = error as Error & { location?: string };
    err.location = `CalendarService.${method}`;
    AppResponse.error(err);
    throw error;
  }
}
