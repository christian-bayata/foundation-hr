import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const EMPLOYEE_ID = '64f1b2c3d4e5f678901234ba';
const STEP_ID = '64f1b2c3d4e5f678901234c1';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('OnboardingController (integration)', () => {
  let app: INestApplication<App>;
  let onboardingService: {
    addEmployeeOnboarding: jest.Mock<AnyPromiseFn>;
    getEmployeeOnboarding: jest.Mock<AnyPromiseFn>;
    updateEmployeeOnboardingStep: jest.Mock<AnyPromiseFn>;
    listEmployeeOnboarding: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    onboardingService = {
      addEmployeeOnboarding: jest.fn(),
      getEmployeeOnboarding: jest.fn(),
      updateEmployeeOnboardingStep: jest.fn(),
      listEmployeeOnboarding: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [
        {
          provide: OnboardingService,
          useValue: onboardingService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = {
            userId: 'usr123',
            email: 'admin@example.com',
            organizationId: ORG_ID,
          };
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

  describe('POST /onboarding/employee/add', () => {
    it('initializes employee onboarding with a valid payload', async () => {
      const payload = { employeeId: EMPLOYEE_ID };
      const created = {
        employeeId: EMPLOYEE_ID,
        steps: [],
        overallProgress: 0,
      };
      onboardingService.addEmployeeOnboarding.mockResolvedValue(created);

      const response = await request(app.getHttpServer())
        .post('/onboarding/employee/add')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(created);
      expect(onboardingService.addEmployeeOnboarding).toHaveBeenCalledWith(
        ORG_ID,
        payload,
      );
    });

    it('rejects when employee ID is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/onboarding/employee/add')
        .send({});

      expect(response.status).toBe(400);
      expect(onboardingService.addEmployeeOnboarding).not.toHaveBeenCalled();
    });
  });

  describe('GET /onboarding/employee/retrieve', () => {
    it('retrieves employee onboarding progress', async () => {
      const progress = {
        employeeId: EMPLOYEE_ID,
        steps: [],
        overallProgress: 0,
        completedSteps: 0,
        totalSteps: 0,
      };
      onboardingService.getEmployeeOnboarding.mockResolvedValue(progress);

      const response = await request(app.getHttpServer()).get(
        `/onboarding/employee/retrieve?employeeId=${EMPLOYEE_ID}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(progress);
      expect(onboardingService.getEmployeeOnboarding).toHaveBeenCalledWith(
        ORG_ID,
        { employeeId: EMPLOYEE_ID },
      );
    });
  });

  describe('PATCH /onboarding/employee/update', () => {
    it('updates an onboarding step completion status', async () => {
      const payload = {
        stepId: STEP_ID,
        isCompleted: true,
        dueDate: '1_day_after_joining',
        completionRequirements: [
          { step: 'Employee creates an account', isCompleted: true },
        ],
      };
      const updated = {
        stepId: STEP_ID,
        stepName: 'Self-enrolment',
        dueDate: '1_day_after_joining',
        isCompleted: true,
        completionRequirements: payload.completionRequirements,
      };
      onboardingService.updateEmployeeOnboardingStep.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch(
          `/onboarding/employee/update?employeeId=${EMPLOYEE_ID}&stepId=${STEP_ID}`,
        )
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(updated);
      expect(onboardingService.updateEmployeeOnboardingStep).toHaveBeenCalledWith(
        ORG_ID,
        EMPLOYEE_ID,
        STEP_ID,
        payload,
      );
    });
  });

  describe('GET /onboarding/employee/list', () => {
    it('lists all employees with onboarding progress', async () => {
      const list = {
        data: [
          {
            employeeId: EMPLOYEE_ID,
            employeeName: 'John Doe',
            email: 'john@example.com',
            status: 'incomplete',
            overallProgress: 50,
            completedSteps: 1,
            totalSteps: 2,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };
      onboardingService.listEmployeeOnboarding.mockResolvedValue(list);

      const response = await request(app.getHttpServer()).get(
        '/onboarding/employee/list',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(list);
      expect(onboardingService.listEmployeeOnboarding).toHaveBeenCalledWith(
        ORG_ID,
        {},
      );
    });

    it('passes batch, limit, role, status, startDate, and endDate query params to the service', async () => {
      onboardingService.listEmployeeOnboarding.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 5,
      });

      const response = await request(app.getHttpServer())
        .get('/onboarding/employee/list')
        .query({
          batch: 2,
          limit: 5,
          role: 'Engineer',
          status: 'overdue',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        });

      expect(response.status).toBe(200);
      expect(onboardingService.listEmployeeOnboarding).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          batch: 2,
          limit: 5,
          role: 'Engineer',
          status: 'overdue',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        }),
      );
    });
  });
});
