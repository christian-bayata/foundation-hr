import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { LeaveManagementController } from './leave-management.controller';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('LeaveManagementController (integration)', () => {
  let app: INestApplication<App>;
  let organisationService: {
    getLeaveManagementSettings: jest.Mock<AnyPromiseFn>;
    updateLeaveManagementSettings: jest.Mock<AnyPromiseFn>;
    addLeaveCategory: jest.Mock<AnyPromiseFn>;
    removeLeaveCategory: jest.Mock<AnyPromiseFn>;
    getLeaveEntitlementSettings: jest.Mock<AnyPromiseFn>;
    updateLeaveEntitlementSettings: jest.Mock<AnyPromiseFn>;
    addLeaveRestrictedPeriod: jest.Mock<AnyPromiseFn>;
    updateLeaveRestrictedPeriod: jest.Mock<AnyPromiseFn>;
    removeLeaveRestrictedPeriod: jest.Mock<AnyPromiseFn>;
  };

  const settings = {
    leaveCategories: [{ id: 'annual_leave', label: 'Annual leave' }],
    allowCarryover: false,
    autoApprovalEnabled: false,
    approvalDeadline: null,
    holidaysCountAsLeave: false,
  };

  const entitlement = {
    allocationMethod: 'fixed_days',
    allocationMethodLabel: 'Fixed days',
    employmentTypes: ['full_time', 'intern'],
    restrictedPeriods: [
      {
        id: 'financial_year_end',
        name: 'Financial Year-End',
        startDate: '2026-01-24',
        endDate: '2026-01-30',
        departmentCodes: ['fin', 'hr'],
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organisationService = {
      getLeaveManagementSettings: jest.fn(),
      updateLeaveManagementSettings: jest.fn(),
      addLeaveCategory: jest.fn(),
      removeLeaveCategory: jest.fn(),
      getLeaveEntitlementSettings: jest.fn(),
      updateLeaveEntitlementSettings: jest.fn(),
      addLeaveRestrictedPeriod: jest.fn(),
      updateLeaveRestrictedPeriod: jest.fn(),
      removeLeaveRestrictedPeriod: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [LeaveManagementController],
      providers: [
        {
          provide: SettingsDomainOrganisationService,
          useValue: organisationService,
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

  describe('GET /setting/leave-management/general-policy/retrieve', () => {
    it('retrieves the leave management settings', async () => {
      organisationService.getLeaveManagementSettings.mockResolvedValue(
        settings,
      );

      const response = await request(app.getHttpServer()).get(
        '/setting/leave-management/general-policy/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(settings);
      expect(
        organisationService.getLeaveManagementSettings,
      ).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('PATCH /setting/leave-management/general-policy/update', () => {
    it('updates the leave management settings', async () => {
      organisationService.updateLeaveManagementSettings.mockResolvedValue(
        settings,
      );

      const response = await request(app.getHttpServer())
        .patch('/setting/leave-management/general-policy/update')
        .send({
          allowCarryover: true,
          approvalDeadline: '3_days_after_requested',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(settings);
      expect(
        organisationService.updateLeaveManagementSettings,
      ).toHaveBeenCalledWith(ORG_ID, {
        allowCarryover: true,
        approvalDeadline: '3_days_after_requested',
      });
    });

    it('rejects an invalid approval deadline', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/leave-management/general-policy/update')
        .send({ approvalDeadline: 'not_a_deadline' });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateLeaveManagementSettings,
      ).not.toHaveBeenCalled();
    });
  });

  describe('POST /setting/leave-management/general-policy/leave-category/add', () => {
    it('adds a leave category', async () => {
      organisationService.addLeaveCategory.mockResolvedValue(settings);

      const response = await request(app.getHttpServer())
        .post('/setting/leave-management/general-policy/leave-category/add')
        .send({ label: 'Annual leave' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.addLeaveCategory).toHaveBeenCalledWith(
        ORG_ID,
        { label: 'Annual leave' },
      );
    });

    it('rejects a missing category label', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/leave-management/general-policy/leave-category/add')
        .send({});

      expect(response.status).toBe(400);
      expect(organisationService.addLeaveCategory).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /setting/leave-management/general-policy/leave-category/remove', () => {
    it('removes a leave category by id', async () => {
      organisationService.removeLeaveCategory.mockResolvedValue(settings);

      const response = await request(app.getHttpServer()).delete(
        '/setting/leave-management/general-policy/leave-category/remove?id=annual_leave',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.removeLeaveCategory).toHaveBeenCalledWith(
        ORG_ID,
        'annual_leave',
      );
    });

    it('rejects a missing category id', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/setting/leave-management/general-policy/leave-category/remove',
      );

      expect(response.status).toBe(400);
      expect(organisationService.removeLeaveCategory).not.toHaveBeenCalled();
    });
  });

  describe('GET /setting/leave-management/entitlement/retrieve', () => {
    it('retrieves the leave entitlement settings', async () => {
      organisationService.getLeaveEntitlementSettings.mockResolvedValue(
        entitlement,
      );

      const response = await request(app.getHttpServer()).get(
        '/setting/leave-management/entitlement/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(entitlement);
      expect(
        organisationService.getLeaveEntitlementSettings,
      ).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('PATCH /setting/leave-management/entitlement/update', () => {
    it('updates the leave entitlement settings', async () => {
      organisationService.updateLeaveEntitlementSettings.mockResolvedValue(
        entitlement,
      );

      const response = await request(app.getHttpServer())
        .patch('/setting/leave-management/entitlement/update')
        .send({
          allocationMethod: 'fixed_days',
          employmentTypes: ['full_time', 'intern'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(entitlement);
      expect(
        organisationService.updateLeaveEntitlementSettings,
      ).toHaveBeenCalledWith(ORG_ID, {
        allocationMethod: 'fixed_days',
        employmentTypes: ['full_time', 'intern'],
      });
    });

    it('rejects an invalid allocation method', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/leave-management/entitlement/update')
        .send({ allocationMethod: 'not_a_method' });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateLeaveEntitlementSettings,
      ).not.toHaveBeenCalled();
    });

    it('rejects an invalid employment type', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/leave-management/entitlement/update')
        .send({ employmentTypes: ['not_a_type'] });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateLeaveEntitlementSettings,
      ).not.toHaveBeenCalled();
    });
  });

  describe('POST /setting/leave-management/entitlement/restricted-period/add', () => {
    it('adds a leave restricted period', async () => {
      organisationService.addLeaveRestrictedPeriod.mockResolvedValue(
        entitlement,
      );

      const response = await request(app.getHttpServer())
        .post('/setting/leave-management/entitlement/restricted-period/add')
        .send({
          name: 'Financial Year-End',
          startDate: '2026-01-24',
          endDate: '2026-01-30',
          departmentCodes: ['fin', 'hr'],
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(entitlement);
      expect(organisationService.addLeaveRestrictedPeriod).toHaveBeenCalledWith(
        ORG_ID,
        {
          name: 'Financial Year-End',
          startDate: '2026-01-24',
          endDate: '2026-01-30',
          departmentCodes: ['fin', 'hr'],
        },
      );
    });

    it('accepts a non-ISO date and leaves formatting to the client', async () => {
      organisationService.addLeaveRestrictedPeriod.mockResolvedValue(
        entitlement,
      );

      const response = await request(app.getHttpServer())
        .post('/setting/leave-management/entitlement/restricted-period/add')
        .send({
          name: 'Financial Year-End',
          startDate: 'not-a-date',
          endDate: '2026-01-30',
        });

      expect(response.status).toBe(201);
      expect(organisationService.addLeaveRestrictedPeriod).toHaveBeenCalledWith(
        ORG_ID,
        {
          name: 'Financial Year-End',
          startDate: 'not-a-date',
          endDate: '2026-01-30',
        },
      );
    });

    it('rejects a missing name', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/leave-management/entitlement/restricted-period/add')
        .send({ startDate: '2026-01-24', endDate: '2026-01-30' });

      expect(response.status).toBe(400);
      expect(
        organisationService.addLeaveRestrictedPeriod,
      ).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/leave-management/entitlement/restricted-period/update', () => {
    it('updates a leave restricted period by id', async () => {
      organisationService.updateLeaveRestrictedPeriod.mockResolvedValue(
        entitlement,
      );

      const response = await request(app.getHttpServer())
        .patch(
          '/setting/leave-management/entitlement/restricted-period/update?id=financial_year_end',
        )
        .send({ endDate: '2026-02-02' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(entitlement);
      expect(
        organisationService.updateLeaveRestrictedPeriod,
      ).toHaveBeenCalledWith(ORG_ID, 'financial_year_end', {
        endDate: '2026-02-02',
      });
    });

    it('rejects a missing id', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/leave-management/entitlement/restricted-period/update')
        .send({ name: 'Nope' });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateLeaveRestrictedPeriod,
      ).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /setting/leave-management/entitlement/restricted-period/remove', () => {
    it('removes a leave restricted period by id', async () => {
      organisationService.removeLeaveRestrictedPeriod.mockResolvedValue(
        entitlement,
      );

      const response = await request(app.getHttpServer()).delete(
        '/setting/leave-management/entitlement/restricted-period/remove?id=financial_year_end',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(entitlement);
      expect(
        organisationService.removeLeaveRestrictedPeriod,
      ).toHaveBeenCalledWith(ORG_ID, 'financial_year_end');
    });

    it('rejects a missing id', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/setting/leave-management/entitlement/restricted-period/remove',
      );

      expect(response.status).toBe(400);
      expect(
        organisationService.removeLeaveRestrictedPeriod,
      ).not.toHaveBeenCalled();
    });
  });
});
