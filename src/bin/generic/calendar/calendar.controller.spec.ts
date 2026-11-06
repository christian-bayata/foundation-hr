import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
const ORG_ID = '64f1b2c3d4e5f678901234ab';
const EVENT_ID = '64f1b2c3d4e5f678901234ac';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('CalendarController (integration)', () => {
  let app: INestApplication<App>;
  let calendarService: {
    addEvent: jest.Mock<AnyPromiseFn>;
    listEvents: jest.Mock<AnyPromiseFn>;
    retrieveEvent: jest.Mock<AnyPromiseFn>;
    updateEvent: jest.Mock<AnyPromiseFn>;
    deleteEvent: jest.Mock<AnyPromiseFn>;
    retrieveWidget: jest.Mock<AnyPromiseFn>;
    retrieveBirthdays: jest.Mock<AnyPromiseFn>;
  };

  const user = {
    userId: 'usr123',
    email: 'admin@example.com',
    organizationId: ORG_ID,
  };

  const event = {
    id: EVENT_ID,
    title: 'Weekly Prep',
    category: 'meeting',
    color: '#2196F3',
    invitees: [],
    startDateTime: new Date().toISOString(),
    endDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    calendarService = {
      addEvent: jest.fn(),
      listEvents: jest.fn(),
      retrieveEvent: jest.fn(),
      updateEvent: jest.fn(),
      deleteEvent: jest.fn(),
      retrieveWidget: jest.fn(),
      retrieveBirthdays: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [{ provide: CalendarService, useValue: calendarService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = user;
          return true;
        },
      })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /calendar/events/add', () => {
    it('creates a calendar event', async () => {
      calendarService.addEvent.mockResolvedValue(event);

      const response = await request(app.getHttpServer())
        .post('/calendar/events/add')
        .send({
          title: 'Weekly Prep',
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(event);
      expect(calendarService.addEvent).toHaveBeenCalledWith(
        ORG_ID,
        user,
        expect.objectContaining({ title: 'Weekly Prep' }),
      );
    });

    it('rejects a missing title', async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar/events/add')
        .send({
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
        });

      expect(response.status).toBe(400);
      expect(calendarService.addEvent).not.toHaveBeenCalled();
    });
  });

  describe('GET /calendar/events/retrieve/all', () => {
    it('retrieves paginated calendar events', async () => {
      const data = {
        data: [event],
        count: 1,
        page: 1,
        limit: 10,
        range: { view: 'day', startDate: '2026-06-07', endDate: '2026-06-07' },
      };
      calendarService.listEvents.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get(
        '/calendar/events/retrieve/all?batch=1&limit=10&view=day&date=2026-06-07',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(data);
      expect(calendarService.listEvents).toHaveBeenCalledWith(ORG_ID, {
        batch: 1,
        limit: 10,
        view: 'day',
        date: '2026-06-07',
      });
    });

    it('rejects an out-of-range limit', async () => {
      const response = await request(app.getHttpServer()).get(
        '/calendar/events/retrieve/all?limit=500',
      );

      expect(response.status).toBe(400);
      expect(calendarService.listEvents).not.toHaveBeenCalled();
    });
  });

  describe('GET /calendar/events/retrieve/single', () => {
    it('retrieves a single calendar event', async () => {
      calendarService.retrieveEvent.mockResolvedValue(event);

      const response = await request(app.getHttpServer()).get(
        `/calendar/events/retrieve/single?eventId=${EVENT_ID}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(event);
      expect(calendarService.retrieveEvent).toHaveBeenCalledWith(ORG_ID, {
        eventId: EVENT_ID,
      });
    });

    it('rejects a missing event id', async () => {
      const response = await request(app.getHttpServer()).get(
        '/calendar/events/retrieve/single',
      );

      expect(response.status).toBe(400);
      expect(calendarService.retrieveEvent).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /calendar/events/update', () => {
    it('updates a calendar event', async () => {
      const updated = { ...event, title: 'Updated Prep' };
      calendarService.updateEvent.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/calendar/events/update')
        .query({ eventId: EVENT_ID })
        .send({ title: 'Updated Prep' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updated);
      expect(calendarService.updateEvent).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          eventId: EVENT_ID,
          title: 'Updated Prep',
        }),
      );
    });

    it('rejects a missing event id', async () => {
      const response = await request(app.getHttpServer())
        .patch('/calendar/events/update')
        .send({ title: 'Updated Prep' });

      expect(response.status).toBe(400);
      expect(calendarService.updateEvent).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /calendar/events/remove', () => {
    it('deletes a calendar event', async () => {
      calendarService.deleteEvent.mockResolvedValue({ id: EVENT_ID });

      const response = await request(app.getHttpServer())
        .delete('/calendar/events/remove')
        .query({ eventId: EVENT_ID });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ id: EVENT_ID });
      expect(calendarService.deleteEvent).toHaveBeenCalledWith(ORG_ID, {
        eventId: EVENT_ID,
      });
    });
  });

  describe('GET /calendar/widget/retrieve', () => {
    it('retrieves the calendar widget feed', async () => {
      const data = {
        generatedAt: new Date().toISOString(),
        today: {
          date: '2026-06-07',
          label: 'MONDAY, JUN 07',
          events: [],
          birthdays: [],
        },
        tomorrow: {
          date: '2026-06-08',
          label: 'TOMORROW',
          events: [],
          birthdays: [],
        },
        birthdayBanner: { count: 0, employees: [] },
      };
      calendarService.retrieveWidget.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get(
        '/calendar/widget/retrieve?date=2026-06-07',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(data);
      expect(calendarService.retrieveWidget).toHaveBeenCalledWith(ORG_ID, {
        date: '2026-06-07',
      });
    });
  });

  describe('GET /calendar/birthdays/retrieve', () => {
    it('retrieves birthdays in a range', async () => {
      const data = {
        data: [],
        count: 0,
        page: 1,
        limit: 10,
        range: { startDate: '2026-06-07', endDate: '2026-06-07' },
      };
      calendarService.retrieveBirthdays.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get(
        '/calendar/birthdays/retrieve?startDate=2026-06-07&endDate=2026-06-07',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(data);
      expect(calendarService.retrieveBirthdays).toHaveBeenCalledWith(ORG_ID, {
        startDate: '2026-06-07',
        endDate: '2026-06-07',
      });
    });
  });
});
