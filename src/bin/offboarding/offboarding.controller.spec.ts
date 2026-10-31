import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { OffboardingController } from './offboarding.controller';
import { OffboardingService } from './offboarding.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const REQUEST_ID = '64f1b2c3d4e5f678901234ba';
const EMPLOYEE_ID = '64f1b2c3d4e5f678901234bb';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('OffboardingController (integration)', () => {
  let app: INestApplication<App>;
  let offboardingService: Record<string, jest.Mock<AnyPromiseFn>>;

  const user = {
    userId: 'usr123',
    email: 'admin@example.com',
    organizationId: ORG_ID,
  };

  const exitRequest = {
    id: REQUEST_ID,
    status: 'pending',
    requestStatus: 'pending',
    employee: {
      employeeId: EMPLOYEE_ID,
      employeeName: 'John Doe',
    },
    exitType: { id: 'resignation', label: 'Resignation' },
    exitReason: { id: 'better_offer', label: 'Better offer' },
    lastWorkingDay: '2026-11-30',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    offboardingService = {
      getFormOptions: jest.fn(),
      listRequests: jest.fn(),
      retrieveRequest: jest.fn(),
      initiateRequest: jest.fn(),
      updateRequest: jest.fn(),
      updateRequestStep: jest.fn(),
      cancelRequest: jest.fn(),
      updateChecklist: jest.fn(),
      updateDocument: jest.fn(),
      completeRequest: jest.fn(),
      getSummary: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [OffboardingController],
      providers: [
        { provide: OffboardingService, useValue: offboardingService },
      ],
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

  describe('GET /offboarding/requests/form/retrieve', () => {
    it('retrieves initiate-exit form options', async () => {
      const data = {
        offboardingTypes: [{ id: 'resignation', label: 'Resignation' }],
        workflows: [],
      };
      offboardingService.getFormOptions.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get(
        '/offboarding/requests/form/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(data);
      expect(offboardingService.getFormOptions).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('GET /offboarding/requests/retrieve/all', () => {
    it('retrieves paginated exit requests', async () => {
      const data = { data: [exitRequest], count: 1 };
      offboardingService.listRequests.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get(
        '/offboarding/requests/retrieve/all?batch=2&limit=25&status=pending&search=john',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(data);
      expect(offboardingService.listRequests).toHaveBeenCalledWith(ORG_ID, {
        batch: 2,
        limit: 25,
        status: 'pending',
        search: 'john',
      });
    });

    it('rejects an invalid status', async () => {
      const response = await request(app.getHttpServer()).get(
        '/offboarding/requests/retrieve/all?status=unknown',
      );

      expect(response.status).toBe(400);
      expect(offboardingService.listRequests).not.toHaveBeenCalled();
    });
  });

  describe('GET /offboarding/requests/retrieve/single', () => {
    it('retrieves a single exit request', async () => {
      offboardingService.retrieveRequest.mockResolvedValue(exitRequest);

      const response = await request(app.getHttpServer()).get(
        `/offboarding/requests/retrieve/single?requestId=${REQUEST_ID}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(exitRequest);
      expect(offboardingService.retrieveRequest).toHaveBeenCalledWith(ORG_ID, {
        requestId: REQUEST_ID,
      });
    });

    it('rejects a missing request id', async () => {
      const response = await request(app.getHttpServer()).get(
        '/offboarding/requests/retrieve/single',
      );

      expect(response.status).toBe(400);
      expect(offboardingService.retrieveRequest).not.toHaveBeenCalled();
    });
  });

  describe('POST /offboarding/requests/initiate', () => {
    it('initiates an exit request', async () => {
      offboardingService.initiateRequest.mockResolvedValue(exitRequest);

      const body = {
        employeeId: EMPLOYEE_ID,
        offboardingTypeId: 'resignation',
        exitReasonId: 'better_offer',
        lastWorkingDay: '2026-11-30',
      };

      const response = await request(app.getHttpServer())
        .post('/offboarding/requests/initiate')
        .send(body);

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(exitRequest);
      expect(offboardingService.initiateRequest).toHaveBeenCalledWith(
        ORG_ID,
        user,
        body,
      );
    });

    it('rejects an invalid last working day', async () => {
      const response = await request(app.getHttpServer())
        .post('/offboarding/requests/initiate')
        .send({
          employeeId: EMPLOYEE_ID,
          offboardingTypeId: 'resignation',
          exitReasonId: 'better_offer',
          lastWorkingDay: '30-11-2026',
        });

      expect(response.status).toBe(400);
      expect(offboardingService.initiateRequest).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /offboarding/requests/update', () => {
    it('updates an exit request', async () => {
      offboardingService.updateRequest.mockResolvedValue(exitRequest);

      const response = await request(app.getHttpServer())
        .patch('/offboarding/requests/update')
        .send({ requestId: REQUEST_ID, lastWorkingDay: '2026-12-15' });

      expect(response.status).toBe(200);
      expect(offboardingService.updateRequest).toHaveBeenCalledWith(ORG_ID, {
        requestId: REQUEST_ID,
        lastWorkingDay: '2026-12-15',
      });
    });
  });

  describe('PATCH /offboarding/requests/step/update', () => {
    it('updates an exit request workflow step', async () => {
      offboardingService.updateRequestStep.mockResolvedValue(exitRequest);

      const body = {
        requestId: REQUEST_ID,
        stepId: 'step-1',
        action: 'approve',
        comment: 'Approved',
      };

      const response = await request(app.getHttpServer())
        .patch('/offboarding/requests/step/update')
        .send(body);

      expect(response.status).toBe(200);
      expect(offboardingService.updateRequestStep).toHaveBeenCalledWith(
        ORG_ID,
        user,
        body,
      );
    });
  });

  describe('PATCH /offboarding/requests/cancel', () => {
    it('cancels an exit request', async () => {
      offboardingService.cancelRequest.mockResolvedValue({
        ...exitRequest,
        status: 'cancelled',
      });

      const response = await request(app.getHttpServer())
        .patch('/offboarding/requests/cancel')
        .send({ requestId: REQUEST_ID, reason: 'Employee withdrew' });

      expect(response.status).toBe(200);
      expect(offboardingService.cancelRequest).toHaveBeenCalledWith(ORG_ID, {
        requestId: REQUEST_ID,
        reason: 'Employee withdrew',
      });
    });
  });

  describe('PATCH /offboarding/requests/checklist/update', () => {
    it('updates an exit checklist item', async () => {
      offboardingService.updateChecklist.mockResolvedValue(exitRequest);

      const body = {
        requestId: REQUEST_ID,
        kind: 'exit',
        itemId: 'exit_interview',
        completed: true,
      };

      const response = await request(app.getHttpServer())
        .patch('/offboarding/requests/checklist/update')
        .send(body);

      expect(response.status).toBe(200);
      expect(offboardingService.updateChecklist).toHaveBeenCalledWith(
        ORG_ID,
        user,
        body,
      );
    });

    it('rejects an invalid checklist kind', async () => {
      const response = await request(app.getHttpServer())
        .patch('/offboarding/requests/checklist/update')
        .send({
          requestId: REQUEST_ID,
          kind: 'unknown',
          itemId: 'exit_interview',
          completed: true,
        });

      expect(response.status).toBe(400);
      expect(offboardingService.updateChecklist).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /offboarding/requests/document/update', () => {
    it('updates an exit document', async () => {
      offboardingService.updateDocument.mockResolvedValue(exitRequest);

      const body = {
        requestId: REQUEST_ID,
        documentId: 'relieving_letter',
        completed: true,
        signed: true,
      };

      const response = await request(app.getHttpServer())
        .patch('/offboarding/requests/document/update')
        .send(body);

      expect(response.status).toBe(200);
      expect(offboardingService.updateDocument).toHaveBeenCalledWith(
        ORG_ID,
        body,
      );
    });
  });

  describe('PATCH /offboarding/requests/complete', () => {
    it('completes an exit request', async () => {
      offboardingService.completeRequest.mockResolvedValue({
        ...exitRequest,
        status: 'completed',
      });

      const response = await request(app.getHttpServer())
        .patch('/offboarding/requests/complete')
        .send({ requestId: REQUEST_ID });

      expect(response.status).toBe(200);
      expect(offboardingService.completeRequest).toHaveBeenCalledWith(
        ORG_ID,
        user,
        { requestId: REQUEST_ID },
      );
    });
  });

  describe('GET /offboarding/summary/retrieve', () => {
    it('retrieves the exit summary', async () => {
      const data = { total: 3, pending: 1, inProgress: 1, completed: 1 };
      offboardingService.getSummary.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get(
        '/offboarding/summary/retrieve?upcomingDays=60',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(data);
      expect(offboardingService.getSummary).toHaveBeenCalledWith(ORG_ID, {
        upcomingDays: 60,
      });
    });

    it('rejects an out-of-range upcoming window', async () => {
      const response = await request(app.getHttpServer()).get(
        '/offboarding/summary/retrieve?upcomingDays=999',
      );

      expect(response.status).toBe(400);
      expect(offboardingService.getSummary).not.toHaveBeenCalled();
    });
  });
});
