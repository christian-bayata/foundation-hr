import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const LEAVE_REQUEST_ID = '64f1b2c3d4e5f678901234ba';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('LeaveController (integration)', () => {
  let app: INestApplication<App>;
  let leaveService: {
    listRequests: jest.Mock<AnyPromiseFn>;
    retrieveRequest: jest.Mock<AnyPromiseFn>;
    approveRequest: jest.Mock<AnyPromiseFn>;
    rejectRequest: jest.Mock<AnyPromiseFn>;
    getSummary: jest.Mock<AnyPromiseFn>;
    exportRequests: jest.Mock<AnyPromiseFn>;
  };

  const user = {
    userId: 'usr123',
    email: 'admin@example.com',
    organizationId: ORG_ID,
  };

  const leaveRequest = {
    id: LEAVE_REQUEST_ID,
    status: 'pending',
    employee: {
      employeeId: '64f1b2c3d4e5f678901234bb',
      employeeName: 'John Doe',
    },
    leaveCategory: { id: 'annual_leave', label: 'Annual leave' },
    startDate: '2026-03-02',
    endDate: '2026-03-04',
    durationDays: 3,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    leaveService = {
      listRequests: jest.fn(),
      retrieveRequest: jest.fn(),
      approveRequest: jest.fn(),
      rejectRequest: jest.fn(),
      getSummary: jest.fn(),
      exportRequests: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [LeaveController],
      providers: [{ provide: LeaveService, useValue: leaveService }],
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

  describe('GET /leave/requests/retrieve/all', () => {
    it('retrieves paginated leave requests', async () => {
      const data = { data: [leaveRequest], count: 1 };
      leaveService.listRequests.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get(
        '/leave/requests/retrieve/all?batch=2&limit=25&status=pending&search=john',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(data);
      expect(leaveService.listRequests).toHaveBeenCalledWith(ORG_ID, {
        batch: 2,
        limit: 25,
        status: 'pending',
        search: 'john',
      });
    });

    it('rejects an out-of-range limit', async () => {
      const response = await request(app.getHttpServer()).get(
        '/leave/requests/retrieve/all?limit=500',
      );

      expect(response.status).toBe(400);
      expect(leaveService.listRequests).not.toHaveBeenCalled();
    });
  });

  describe('GET /leave/requests/retrieve/single', () => {
    it('retrieves a single leave request', async () => {
      leaveService.retrieveRequest.mockResolvedValue(leaveRequest);

      const response = await request(app.getHttpServer()).get(
        `/leave/requests/retrieve/single?leaveRequestId=${LEAVE_REQUEST_ID}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(leaveRequest);
      expect(leaveService.retrieveRequest).toHaveBeenCalledWith(ORG_ID, {
        leaveRequestId: LEAVE_REQUEST_ID,
      });
    });

    it('rejects a missing leave request id', async () => {
      const response = await request(app.getHttpServer()).get(
        '/leave/requests/retrieve/single',
      );

      expect(response.status).toBe(400);
      expect(leaveService.retrieveRequest).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /leave/requests/approve', () => {
    it('approves a leave request', async () => {
      const approved = { ...leaveRequest, status: 'approved' };
      leaveService.approveRequest.mockResolvedValue(approved);

      const response = await request(app.getHttpServer())
        .patch('/leave/requests/approve')
        .send({ leaveRequestId: LEAVE_REQUEST_ID, comment: 'Enjoy' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(approved);
      expect(leaveService.approveRequest).toHaveBeenCalledWith(
        ORG_ID,
        user,
        { leaveRequestId: LEAVE_REQUEST_ID, comment: 'Enjoy' },
      );
    });

    it('rejects a missing leave request id', async () => {
      const response = await request(app.getHttpServer())
        .patch('/leave/requests/approve')
        .send({ comment: 'Enjoy' });

      expect(response.status).toBe(400);
      expect(leaveService.approveRequest).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /leave/requests/reject', () => {
    it('rejects a leave request', async () => {
      const rejected = { ...leaveRequest, status: 'rejected' };
      leaveService.rejectRequest.mockResolvedValue(rejected);

      const response = await request(app.getHttpServer())
        .patch('/leave/requests/reject')
        .send({
          leaveRequestId: LEAVE_REQUEST_ID,
          reason: 'Insufficient balance',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(rejected);
      expect(leaveService.rejectRequest).toHaveBeenCalledWith(
        ORG_ID,
        user,
        {
          leaveRequestId: LEAVE_REQUEST_ID,
          reason: 'Insufficient balance',
        },
      );
    });

    it('rejects a missing rejection reason', async () => {
      const response = await request(app.getHttpServer())
        .patch('/leave/requests/reject')
        .send({ leaveRequestId: LEAVE_REQUEST_ID });

      expect(response.status).toBe(400);
      expect(leaveService.rejectRequest).not.toHaveBeenCalled();
    });
  });

  describe('GET /leave/summary/retrieve', () => {
    it('retrieves the leave summary', async () => {
      const summary = {
        year: 2026,
        totalEmployees: 1,
        categoryTotals: [],
        data: [],
        count: 1,
      };
      leaveService.getSummary.mockResolvedValue(summary);

      const response = await request(app.getHttpServer()).get(
        '/leave/summary/retrieve?year=2026&departmentCode=eng',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(summary);
      expect(leaveService.getSummary).toHaveBeenCalledWith(ORG_ID, {
        year: 2026,
        departmentCode: 'eng',
      });
    });

    it('rejects an invalid year', async () => {
      const response = await request(app.getHttpServer()).get(
        '/leave/summary/retrieve?year=1999',
      );

      expect(response.status).toBe(400);
      expect(leaveService.getSummary).not.toHaveBeenCalled();
    });
  });

  describe('GET /leave/requests/export/csv', () => {
    it('exports leave requests as a CSV attachment', async () => {
      leaveService.exportRequests.mockResolvedValue({
        filename: 'leave-requests-2026-03-01.csv',
        content: 'Employee,Leave type\r\nJohn Doe,Annual leave',
      });

      const response = await request(app.getHttpServer()).get(
        '/leave/requests/export/csv?status=approved',
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain(
        'leave-requests-2026-03-01.csv',
      );
      expect(response.text).toContain('John Doe,Annual leave');
      expect(leaveService.exportRequests).toHaveBeenCalledWith(ORG_ID, {
        status: 'approved',
      });
    });
  });
});
