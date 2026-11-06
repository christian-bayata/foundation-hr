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
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import {
  DashboardActivityType,
  DashboardDistributionDimension,
} from './enum/dashboard.enum';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

const ORG_ID = '64f1b2c3d4e5f678901234ab';

describe('DashboardController (integration)', () => {
  let app: INestApplication<App>;
  let dashboardService: {
    getSummary: jest.Mock<AnyPromiseFn>;
    getOnboardingProgress: jest.Mock<AnyPromiseFn>;
    getEmployeeDistribution: jest.Mock<AnyPromiseFn>;
    getRecentActivities: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    dashboardService = {
      getSummary: jest.fn(),
      getOnboardingProgress: jest.fn(),
      getEmployeeDistribution: jest.fn(),
      getRecentActivities: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: dashboardService,
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

  it('GET /dashboard/summary/retrieve returns the summary', async () => {
    const summary = { metrics: [], trend: [], hasData: false };
    dashboardService.getSummary.mockResolvedValue(summary);

    const response = await request(app.getHttpServer()).get(
      '/dashboard/summary/retrieve?interval=12_months',
    );

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(true);
    expect(response.body.data).toEqual(summary);
    expect(dashboardService.getSummary).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({ interval: '12_months' }),
    );
  });

  it('GET /dashboard/onboarding-progress/retrieve returns onboarding progress', async () => {
    const data = { data: [], summary: {}, hasData: false };
    dashboardService.getOnboardingProgress.mockResolvedValue(data);

    const response = await request(app.getHttpServer()).get(
      '/dashboard/onboarding-progress/retrieve?batch=2&limit=3',
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(data);
    expect(dashboardService.getOnboardingProgress).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({ batch: 2, limit: 3 }),
    );
  });

  it('GET /dashboard/employee-distribution/retrieve returns distribution', async () => {
    const data = { data: [], total: 0, hasData: false };
    dashboardService.getEmployeeDistribution.mockResolvedValue(data);

    const response = await request(app.getHttpServer()).get(
      `/dashboard/employee-distribution/retrieve?dimension=${DashboardDistributionDimension.DEPARTMENT}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(data);
    expect(dashboardService.getEmployeeDistribution).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({
        dimension: DashboardDistributionDimension.DEPARTMENT,
      }),
    );
  });

  it('GET /dashboard/recent-activities/retrieve returns activities', async () => {
    const data = { data: [], count: 0, hasData: false };
    dashboardService.getRecentActivities.mockResolvedValue(data);

    const response = await request(app.getHttpServer()).get(
      `/dashboard/recent-activities/retrieve?type=${DashboardActivityType.EMPLOYEE_ADDED}&days=30`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(data);
    expect(dashboardService.getRecentActivities).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({
        type: DashboardActivityType.EMPLOYEE_ADDED,
        days: 30,
      }),
    );
  });
});
