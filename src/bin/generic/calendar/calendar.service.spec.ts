import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppException } from '../../../common/response/app-exception';
import { Test } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { CalendarEventRepository } from './repository/calendar-event.repository';
import { EmployeeRepository } from '../../core_hr/employee/repository/employee.repository';
import { UserRepository } from '../auth/repository/user.repository';
import { CalendarEventCategory } from './enum/calendar.enum';
import { CalendarView } from './enum/calendar.enum';
import { formatWeekdayMonthDay } from './calendar.utility';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const EVENT_ID = '64f1b2c3d4e5f678901234ac';
const EMPLOYEE_ID = '64f1b2c3d4e5f678901234ad';
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

type AnyPromiseFn = (...args: any[]) => Promise<any>;

const user = {
  userId: 'usr123',
  email: 'admin@example.com',
  organizationId: ORG_ID,
  employeeId: EMPLOYEE_ID,
};

const buildEventDocument = (overrides: Record<string, any> = {}) => ({
  _id: EVENT_ID,
  organizationId: ORG_ID,
  title: 'Weekly Prep',
  description: null,
  startDateTime: new Date(TODAY),
  endDateTime: new Date(TODAY.getTime() + 2 * 60 * 60 * 1000),
  allDay: false,
  location: 'Conference room',
  category: CalendarEventCategory.MEETING,
  color: '#2196F3',
  invitees: [],
  createdByUserId: user.userId,
  createdByEmail: user.email,
  createdByName: 'John Doe',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildEmployee = (overrides: Record<string, any> = {}) => ({
  _id: EMPLOYEE_ID,
  organizationId: ORG_ID,
  employeeId: 'FHR0001',
  employeeUniqueId: 'E-0001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  avatarUrl: null,
  personalDetails: { dateOfBirth: new Date(1990, 5, 15) },
  status: 'active',
  ...overrides,
});

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('CalendarService', () => {
  let calendarEventRepository: {
    create: jest.Mock<AnyPromiseFn>;
    findById: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
    deleteById: jest.Mock<AnyPromiseFn>;
    paginatedQuery: jest.Mock<AnyPromiseFn>;
    findAll: jest.Mock<AnyPromiseFn>;
  };
  let userRepository: {
    findUser: jest.Mock<AnyPromiseFn>;
  };
  let employeeRepository: {
    findById: jest.Mock<AnyPromiseFn>;
    findByOrganization: jest.Mock<AnyPromiseFn>;
  };
  let service: CalendarService;

  beforeEach(async () => {
    jest.clearAllMocks();

    calendarEventRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      paginatedQuery: jest.fn(),
      findAll: jest.fn(),
    };
    employeeRepository = {
      findById: jest.fn<AnyPromiseFn>().mockResolvedValue(buildEmployee()),
      findByOrganization: jest.fn(),
    };
    userRepository = {
      findUser: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: CalendarEventRepository, useValue: calendarEventRepository },
        { provide: EmployeeRepository, useValue: employeeRepository },
        { provide: UserRepository, useValue: userRepository },
      ],
    }).compile();

    service = module.get(CalendarService);
  });

  it('should create a calendar event', async () => {
    const dto = {
      title: 'Weekly Prep',
      startDateTime: new Date(TODAY).toISOString(),
      endDateTime: new Date(TODAY.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    };
    calendarEventRepository.create.mockResolvedValue(buildEventDocument());

    const result = await service.addEvent(ORG_ID, user, dto as any);

    expect(result.id).toBe(EVENT_ID);
    expect(result.title).toBe('Weekly Prep');
    expect(result.category).toBe(CalendarEventCategory.MEETING);
    expect(result.color).toBe('#2196F3');
    expect(calendarEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_ID,
        title: 'Weekly Prep',
        category: CalendarEventCategory.OTHER,
        createdByUserId: user.userId,
        createdByEmail: user.email,
        createdByName: 'John Doe',
      }),
    );
  });

  it('should reject end date time before start date time', async () => {
    const dto = {
      title: 'Bad Event',
      startDateTime: new Date(
        TODAY.getTime() + 2 * 60 * 60 * 1000,
      ).toISOString(),
      endDateTime: new Date(TODAY).toISOString(),
    };

    await expect(
      service.addEvent(ORG_ID, user, dto as any),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('should list events with pagination', async () => {
    const event = buildEventDocument();
    calendarEventRepository.paginatedQuery.mockResolvedValue({
      items: [event],
      total: 1,
    });

    const result = await service.listEvents(ORG_ID, {
      batch: 1,
      limit: 10,
      view: CalendarView.DAY,
      date: formatDate(TODAY),
    } as any);

    expect(result.data.length).toBe(1);
    expect(result.count).toBe(1);
    expect(result.data[0].id).toBe(EVENT_ID);
    expect(calendarEventRepository.paginatedQuery).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: ORG_ID }),
      { startDateTime: 1 },
      1,
      10,
    );
  });

  it('should retrieve a single event', async () => {
    const event = buildEventDocument();
    calendarEventRepository.findById.mockResolvedValue(event);

    const result = await service.retrieveEvent(ORG_ID, { eventId: EVENT_ID });

    expect(result.id).toBe(EVENT_ID);
    expect(calendarEventRepository.findById).toHaveBeenCalledWith(
      ORG_ID,
      EVENT_ID,
    );
  });

  it('should throw 404 for missing event', async () => {
    calendarEventRepository.findById.mockResolvedValue(null);

    await expect(
      service.retrieveEvent(ORG_ID, { eventId: EVENT_ID }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('should update an event', async () => {
    const existing = buildEventDocument();
    const updated = { ...existing, title: 'Updated Prep' };
    calendarEventRepository.findById.mockResolvedValue(existing);
    calendarEventRepository.updateById.mockResolvedValue(updated);

    const result = await service.updateEvent(ORG_ID, {
      eventId: EVENT_ID,
      title: 'Updated Prep',
    } as any);

    expect(result.title).toBe('Updated Prep');
    expect(calendarEventRepository.updateById).toHaveBeenCalledWith(
      EVENT_ID,
      expect.objectContaining({ title: 'Updated Prep' }),
    );
  });

  it('should delete an event', async () => {
    const existing = buildEventDocument();
    calendarEventRepository.findById.mockResolvedValue(existing);
    calendarEventRepository.deleteById.mockResolvedValue(existing);

    const result = await service.deleteEvent(ORG_ID, { eventId: EVENT_ID });

    expect(result).toEqual({ id: EVENT_ID });
    expect(calendarEventRepository.deleteById).toHaveBeenCalledWith(EVENT_ID);
  });

  it('should retrieve widget feed with today and tomorrow', async () => {
    const event = buildEventDocument();
    calendarEventRepository.findAll.mockResolvedValue([event]);
    employeeRepository.findByOrganization.mockResolvedValue([
      buildEmployee({
        personalDetails: {
          dateOfBirth: new Date(1990, TODAY.getMonth(), TODAY.getDate()),
        },
      }),
    ]);

    const result = await service.retrieveWidget(ORG_ID, {
      date: formatDate(TODAY),
    } as any);

    expect(result.today.label).toBe(formatWeekdayMonthDay(TODAY));
    expect(result.tomorrow.label).toBe('TOMORROW');
    expect(result.birthdayBanner.count).toBeGreaterThanOrEqual(0);
    expect(calendarEventRepository.findAll).toHaveBeenCalledTimes(2);
  });

  it('should retrieve birthdays in a range', async () => {
    employeeRepository.findByOrganization.mockResolvedValue([
      buildEmployee({
        personalDetails: {
          dateOfBirth: new Date(1990, TODAY.getMonth(), TODAY.getDate()),
        },
      }),
    ]);

    const result = await service.retrieveBirthdays(ORG_ID, {
      startDate: formatDate(TODAY),
      endDate: formatDate(TODAY),
    } as any);

    expect(result.count).toBe(1);
    expect(result.data[0].source).toBe('birthday');
  });
});
