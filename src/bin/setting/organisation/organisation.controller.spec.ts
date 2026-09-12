import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { OrganisationController } from './organisation.controller';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('OrganisationController (integration)', () => {
  let app: INestApplication<App>;
  let organisationService: {
    getGeneralInfo: jest.Mock<AnyPromiseFn>;
    updateGeneralInfo: jest.Mock<AnyPromiseFn>;
    getBusinessDetails: jest.Mock<AnyPromiseFn>;
    updateBusinessDetails: jest.Mock<AnyPromiseFn>;
    getLocations: jest.Mock<AnyPromiseFn>;
    updateLocations: jest.Mock<AnyPromiseFn>;
    getOrganisationHierarchy: jest.Mock<AnyPromiseFn>;
    updateOrganisationHierarchy: jest.Mock<AnyPromiseFn>;
    getPolicyManagement: jest.Mock<AnyPromiseFn>;
    updatePolicyManagement: jest.Mock<AnyPromiseFn>;
    getBranding: jest.Mock<AnyPromiseFn>;
    updateBranding: jest.Mock<AnyPromiseFn>;
    getDepartments: jest.Mock<AnyPromiseFn>;
    updateDepartments: jest.Mock<AnyPromiseFn>;
    getBilling: jest.Mock<AnyPromiseFn>;
    updateBilling: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organisationService = {
      getGeneralInfo: jest.fn(),
      updateGeneralInfo: jest.fn(),
      getBusinessDetails: jest.fn(),
      updateBusinessDetails: jest.fn(),
      getLocations: jest.fn(),
      updateLocations: jest.fn(),
      getOrganisationHierarchy: jest.fn(),
      updateOrganisationHierarchy: jest.fn(),
      getPolicyManagement: jest.fn(),
      updatePolicyManagement: jest.fn(),
      getBranding: jest.fn(),
      updateBranding: jest.fn(),
      getDepartments: jest.fn(),
      updateDepartments: jest.fn(),
      getBilling: jest.fn(),
      updateBilling: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [OrganisationController],
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

  describe('GET /setting/organization/general-info/retrieve', () => {
    it('retrieves the organization general information', async () => {
      const org = { _id: ORG_ID, name: 'FoundationHR' };
      organisationService.getGeneralInfo.mockResolvedValue(org);

      const response = await request(app.getHttpServer()).get(
        '/setting/organization/general-info/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(org);
      expect(organisationService.getGeneralInfo).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('PATCH /setting/organization/general-info/update', () => {
    it('updates the organization general information with a valid payload', async () => {
      const updated = {
        _id: ORG_ID,
        name: 'FoundationHR',
        website: 'https://foundationhr.com',
        primaryContactEmail: 'contact@foundationhr.com',
      };
      organisationService.updateGeneralInfo.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/setting/organization/general-info/update')
        .send({
          name: 'FoundationHR',
          website: 'https://foundationhr.com',
          primaryContactEmail: 'contact@foundationhr.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updated);
      expect(organisationService.updateGeneralInfo).toHaveBeenCalledWith(
        ORG_ID,
        {
          name: 'FoundationHR',
          website: 'https://foundationhr.com',
          primaryContactEmail: 'contact@foundationhr.com',
        },
      );
    });

    it('rejects an invalid primary contact email', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/organization/general-info/update')
        .send({ primaryContactEmail: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(organisationService.updateGeneralInfo).not.toHaveBeenCalled();
    });
  });

  describe.each([
    {
      section: 'business-details',
      getter: 'getBusinessDetails',
      updater: 'updateBusinessDetails',
    },
    { section: 'locations', getter: 'getLocations', updater: 'updateLocations' },
    {
      section: 'organization-hierarchy',
      getter: 'getOrganisationHierarchy',
      updater: 'updateOrganisationHierarchy',
    },
    {
      section: 'policy-management',
      getter: 'getPolicyManagement',
      updater: 'updatePolicyManagement',
    },
    { section: 'branding', getter: 'getBranding', updater: 'updateBranding' },
    {
      section: 'departments',
      getter: 'getDepartments',
      updater: 'updateDepartments',
    },
    { section: 'billing', getter: 'getBilling', updater: 'updateBilling' },
  ])('$section endpoints', ({ section, getter, updater }) => {
    it('retrieves the section and returns the pending placeholder', async () => {
      const placeholder = { section, organizationId: ORG_ID, implemented: false };
      (organisationService as any)[getter].mockResolvedValue(placeholder);

      const response = await request(app.getHttpServer()).get(
        `/setting/organization/${section}/retrieve`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(placeholder);
    });

    it('updates the section and returns the pending placeholder', async () => {
      const placeholder = {
        section,
        organizationId: ORG_ID,
        implemented: false,
      };
      (organisationService as any)[updater].mockResolvedValue(placeholder);

      const response = await request(app.getHttpServer())
        .patch(`/setting/organization/${section}/update`)
        .send({ foo: 'bar' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(placeholder);
    });
  });
});