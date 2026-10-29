import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const REQUEST_ID = '64f1b2c3d4e5f678901234ba';
const STEP_ID = '64f1b2c3d4e5f678901234c1';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('RequestController (integration)', () => {
  let app: INestApplication<App>;
  let requestService: {
    addRequest: jest.Mock<AnyPromiseFn>;
    getYourRequests: jest.Mock<AnyPromiseFn>;
    getEmployeeRequests: jest.Mock<AnyPromiseFn>;
    getRequest: jest.Mock<AnyPromiseFn>;
    getSummary: jest.Mock<AnyPromiseFn>;
    getRequestTypes: jest.Mock<AnyPromiseFn>;
    getRequestForm: jest.Mock;
    updateRequest: jest.Mock<AnyPromiseFn>;
    cancelRequest: jest.Mock<AnyPromiseFn>;
    updateRequestStep: jest.Mock<AnyPromiseFn>;
    deleteRequest: jest.Mock<AnyPromiseFn>;
  };
  const user = {
    userId: 'usr123',
    email: 'admin@example.com',
    organizationId: ORG_ID,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    requestService = {
      addRequest: jest.fn(),
      getYourRequests: jest.fn(),
      getEmployeeRequests: jest.fn(),
      getRequest: jest.fn(),
      getSummary: jest.fn(),
      getRequestTypes: jest.fn(),
      getRequestForm: jest.fn(),
      updateRequest: jest.fn(),
      cancelRequest: jest.fn(),
      updateRequestStep: jest.fn(),
      deleteRequest: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [RequestController],
      providers: [{ provide: RequestService, useValue: requestService }],
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

  describe('POST /requests/add', () => {
    it('creates a request', async () => {
      const payload = {
        requestType: 'employee_termination',
        employeeId: '64f1b2c3d4e5f678901234cc',
        terminationDate: '2026-02-01',
        terminationType: 'resignation',
        reasonForTermination: 'Resignation',
        reason: 'Resignation',
      };
      const created = { id: REQUEST_ID, status: 'pending' };
      requestService.addRequest.mockResolvedValue(created);

      const response = await request(app.getHttpServer())
        .post('/requests/add')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(created);
      expect(requestService.addRequest).toHaveBeenCalledWith(
        ORG_ID,
        user,
        payload,
      );
    });

    it('accepts a flat staff data update payload', async () => {
      const payload = {
        requestType: 'staff_data_update',
        employeeId: '64f1b2c3d4e5f678901234cc',
        department: 'Engineering',
        informationToUpdate: 'change_of_account_details',
      };
      requestService.addRequest.mockResolvedValue({ id: REQUEST_ID });

      const response = await request(app.getHttpServer())
        .post('/requests/add')
        .send(payload);

      expect(response.status).toBe(201);
      expect(requestService.addRequest).toHaveBeenCalledWith(
        ORG_ID,
        user,
        payload,
      );
    });

    it('rejects missing fields for the selected request type', async () => {
      const response = await request(app.getHttpServer())
        .post('/requests/add')
        .send({
          requestType: 'employee_termination',
          employeeId: '64f1b2c3d4e5f678901234cc',
        });

      expect(response.status).toBe(400);
      expect(requestService.addRequest).not.toHaveBeenCalled();
    });

    it('rejects unknown fields for the selected request type', async () => {
      const response = await request(app.getHttpServer())
        .post('/requests/add')
        .send({
          requestType: 'staff_data_update',
          employeeId: '64f1b2c3d4e5f678901234cc',
          informationToUpdate: 'change_of_name',
          updateDetails: 'Not allowed',
        });

      expect(response.status).toBe(400);
      expect(requestService.addRequest).not.toHaveBeenCalled();
    });

    it('rejects an unknown request type', async () => {
      const response = await request(app.getHttpServer())
        .post('/requests/add')
        .send({ requestType: 'not_a_request' });

      expect(response.status).toBe(400);
      expect(requestService.addRequest).not.toHaveBeenCalled();
    });
  });

  describe('GET /requests/your/retrieve/all', () => {
    it('lists requests created by the current user', async () => {
      const list = { data: [], count: 0, batch: 1, limit: 10 };
      requestService.getYourRequests.mockResolvedValue(list);

      const response = await request(app.getHttpServer()).get(
        '/requests/your/retrieve/all',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(list);
      expect(requestService.getYourRequests).toHaveBeenCalledWith(
        ORG_ID,
        user,
        {},
      );
    });

    it('passes filters through to the service', async () => {
      requestService.getYourRequests.mockResolvedValue({
        data: [],
        count: 0,
        batch: 2,
        limit: 5,
      });

      const response = await request(app.getHttpServer())
        .get('/requests/your/retrieve/all')
        .query({
          batch: 2,
          limit: 5,
          requestType: 'employee_termination',
          status: 'pending',
          search: 'john',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        });

      expect(response.status).toBe(200);
      expect(requestService.getYourRequests).toHaveBeenCalledWith(
        ORG_ID,
        user,
        expect.objectContaining({
          batch: 2,
          limit: 5,
          requestType: 'employee_termination',
          status: 'pending',
          search: 'john',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        }),
      );
    });
  });

  describe('GET /requests/employee/retrieve/all', () => {
    it('lists other employees requests', async () => {
      const list = { data: [], count: 0, batch: 1, limit: 10 };
      requestService.getEmployeeRequests.mockResolvedValue(list);

      const response = await request(app.getHttpServer()).get(
        '/requests/employee/retrieve/all',
      );

      expect(response.status).toBe(200);
      expect(requestService.getEmployeeRequests).toHaveBeenCalledWith(
        ORG_ID,
        user,
        {},
      );
    });
  });

  describe('GET /requests/retrieve/single', () => {
    it('retrieves a single request', async () => {
      const view = { id: REQUEST_ID, status: 'pending' };
      requestService.getRequest.mockResolvedValue(view);

      const response = await request(app.getHttpServer())
        .get('/requests/retrieve/single')
        .query({ requestId: REQUEST_ID });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(view);
      expect(requestService.getRequest).toHaveBeenCalledWith(
        ORG_ID,
        REQUEST_ID,
      );
    });

    it('requires a request ID', async () => {
      const response = await request(app.getHttpServer()).get(
        '/requests/retrieve/single',
      );

      expect(response.status).toBe(400);
      expect(requestService.getRequest).not.toHaveBeenCalled();
    });
  });

  describe('GET /requests/summary', () => {
    it('returns request counts', async () => {
      const summary = {
        your: { total: 0 },
        employee: { total: 0 },
      };
      requestService.getSummary.mockResolvedValue(summary);

      const response = await request(app.getHttpServer()).get(
        '/requests/summary',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(summary);
      expect(requestService.getSummary).toHaveBeenCalledWith(ORG_ID, user);
    });
  });

  describe('GET /requests/type/retrieve/all', () => {
    it('returns request types and workflows', async () => {
      const types = { requestTypes: [] };
      requestService.getRequestTypes.mockResolvedValue(types);

      const response = await request(app.getHttpServer()).get(
        '/requests/type/retrieve/all',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(types);
      expect(requestService.getRequestTypes).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('GET /requests/type/form/retrieve', () => {
    it('returns the form definition for a request type', async () => {
      const form = {
        requestType: 'employee_termination',
        label: 'Employee termination',
        employeeContext: ['employeeName'],
        fields: [],
      };
      requestService.getRequestForm.mockReturnValue(form);

      const response = await request(app.getHttpServer())
        .get('/requests/type/form/retrieve')
        .query({ requestType: 'employee_termination' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(form);
      expect(requestService.getRequestForm).toHaveBeenCalledWith(
        'employee_termination',
      );
    });

    it('requires a valid request type', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests/type/form/retrieve')
        .query({ requestType: 'not_a_request' });

      expect(response.status).toBe(400);
      expect(requestService.getRequestForm).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /requests/update', () => {
    it('updates a pending request', async () => {
      const payload = { reason: 'Updated reason' };
      const updated = { id: REQUEST_ID, reason: 'Updated reason' };
      requestService.updateRequest.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/requests/update')
        .query({ requestId: REQUEST_ID })
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updated);
      expect(requestService.updateRequest).toHaveBeenCalledWith(
        ORG_ID,
        REQUEST_ID,
        payload,
      );
    });
  });

  describe('PATCH /requests/cancel', () => {
    it('cancels a request with a reason', async () => {
      const payload = { reason: 'No longer needed' };
      requestService.cancelRequest.mockResolvedValue({
        id: REQUEST_ID,
        status: 'cancelled',
      });

      const response = await request(app.getHttpServer())
        .patch('/requests/cancel')
        .query({ requestId: REQUEST_ID })
        .send(payload);

      expect(response.status).toBe(200);
      expect(requestService.cancelRequest).toHaveBeenCalledWith(
        ORG_ID,
        REQUEST_ID,
        payload,
      );
    });
  });

  describe('PATCH /requests/step/update', () => {
    it('approves the current step', async () => {
      const payload = { stepId: STEP_ID, action: 'approve' };
      requestService.updateRequestStep.mockResolvedValue({
        id: REQUEST_ID,
        status: 'in_progress',
      });

      const response = await request(app.getHttpServer())
        .patch('/requests/step/update')
        .query({ requestId: REQUEST_ID })
        .send(payload);

      expect(response.status).toBe(200);
      expect(requestService.updateRequestStep).toHaveBeenCalledWith(
        ORG_ID,
        user,
        REQUEST_ID,
        payload,
      );
    });

    it('rejects an unknown step action', async () => {
      const response = await request(app.getHttpServer())
        .patch('/requests/step/update')
        .query({ requestId: REQUEST_ID })
        .send({ stepId: STEP_ID, action: 'skip' });

      expect(response.status).toBe(400);
      expect(requestService.updateRequestStep).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /requests/delete', () => {
    it('deletes a cancelled or rejected request', async () => {
      requestService.deleteRequest.mockResolvedValue('Request deleted');

      const response = await request(app.getHttpServer())
        .delete('/requests/delete')
        .query({ requestId: REQUEST_ID });

      expect(response.status).toBe(200);
      expect(requestService.deleteRequest).toHaveBeenCalledWith(
        ORG_ID,
        REQUEST_ID,
      );
    });
  });
});
