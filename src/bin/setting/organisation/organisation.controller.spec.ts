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

  describe('GET /setting/organization/business-details/retrieve', () => {
    it('retrieves the organization business details', async () => {
      const businessDetails = {
        businessType: 'private_limited',
        industry: 'Software',
      };
      organisationService.getBusinessDetails.mockResolvedValue(businessDetails);

      const response = await request(app.getHttpServer()).get(
        '/setting/organization/business-details/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(businessDetails);
      expect(organisationService.getBusinessDetails).toHaveBeenCalledWith(
        ORG_ID,
      );
    });
  });

  describe('PATCH /setting/organization/business-details/update', () => {
    it('updates the organization business details with a valid payload', async () => {
      const updated = {
        businessType: 'private_limited',
        industry: 'Software',
      };
      organisationService.updateBusinessDetails.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/setting/organization/business-details/update')
        .send({
          businessType: 'private_limited',
          industry: 'Software',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updated);
      expect(organisationService.updateBusinessDetails).toHaveBeenCalledWith(
        ORG_ID,
        {
          businessType: 'private_limited',
          industry: 'Software',
        },
      );
    });

    it('rejects an invalid business type', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/organization/business-details/update')
        .send({ businessType: 'not-a-business-type' });

      expect(response.status).toBe(400);
      expect(organisationService.updateBusinessDetails).not.toHaveBeenCalled();
    });
  });

  describe('GET /setting/organization/locations/retrieve', () => {
    it('retrieves locations without a search query', async () => {
      const locations = [
        {
          name: 'Headquarters',
          address: '123 Main Street, Lagos, Nigeria',
          phoneNumber: '+234 123 456 7890',
          email: 'info@company.com',
        },
      ];
      organisationService.getLocations.mockResolvedValue(locations);

      const response = await request(app.getHttpServer()).get(
        '/setting/organization/locations/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(locations);
      expect(organisationService.getLocations).toHaveBeenCalledWith(
        ORG_ID,
        undefined,
      );
    });

    it('passes the search query parameter to the service', async () => {
      organisationService.getLocations.mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/setting/organization/locations/retrieve?search=warehouse',
      );

      expect(response.status).toBe(200);
      expect(organisationService.getLocations).toHaveBeenCalledWith(
        ORG_ID,
        'warehouse',
      );
    });
  });

  describe('PATCH /setting/organization/locations/update', () => {
    it('updates locations with a valid payload', async () => {
      const incoming = [
        {
          name: 'Headquarters',
          address: '123 Main Street, Lagos, Nigeria',
          phoneNumber: '+234 123 456 7890',
          email: 'info@company.com',
        },
      ];
      organisationService.updateLocations.mockResolvedValue(incoming);

      const response = await request(app.getHttpServer())
        .patch('/setting/organization/locations/update')
        .send({ locations: incoming });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(incoming);
      expect(organisationService.updateLocations).toHaveBeenCalledWith(
        ORG_ID,
        { locations: incoming },
      );
    });

    it('accepts an empty locations array to clear all locations', async () => {
      organisationService.updateLocations.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .patch('/setting/organization/locations/update')
        .send({ locations: [] });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(organisationService.updateLocations).toHaveBeenCalledWith(
        ORG_ID,
        { locations: [] },
      );
    });

    it('rejects locations when the type is not an array', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/organization/locations/update')
        .send({ locations: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(organisationService.updateLocations).not.toHaveBeenCalled();
    });

    it('rejects a location item missing the required name field', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/organization/locations/update')
        .send({
          locations: [
            {
              address: '123 Main Street, Lagos, Nigeria',
              email: 'info@company.com',
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(organisationService.updateLocations).not.toHaveBeenCalled();
    });
  });

  describe('GET /setting/organization/organization-hierarchy/retrieve', () => {
    it('retrieves the hierarchy using only the organization id', async () => {
      const hierarchy = [
        {
          _id: 'emp1',
          firstName: 'Priscilla',
          lastName: 'Jobi',
          jobTitle: 'Art director',
          supervisor: null,
          children: [],
        },
      ];
      organisationService.getOrganisationHierarchy.mockResolvedValue(hierarchy);

      const response = await request(app.getHttpServer()).get(
        '/setting/organization/organization-hierarchy/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(hierarchy);
      expect(organisationService.getOrganisationHierarchy).toHaveBeenCalledWith(
        ORG_ID,
      );
    });

    it('ignores pagination and filter query params', async () => {
      organisationService.getOrganisationHierarchy.mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get(
        '/setting/organization/organization-hierarchy/retrieve?search=job&department=Design&role=Art%20director&supervisorId=emp2&batch=2&limit=25',
      );

      expect(response.status).toBe(200);
      expect(organisationService.getOrganisationHierarchy).toHaveBeenCalledWith(
        ORG_ID,
      );
    });
  });

  describe('PATCH /setting/organization/organization-hierarchy/update', () => {
    it('reassigns an employee supervisor with a valid payload', async () => {
      const updated = {
        _id: 'emp1',
        firstName: 'Priscilla',
        lastName: 'Jobi',
        supervisor: 'emp2',
      };
      organisationService.updateOrganisationHierarchy.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/setting/organization/organization-hierarchy/update')
        .send({ employeeId: 'emp1', supervisorId: 'emp2' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updated);
      expect(
        organisationService.updateOrganisationHierarchy,
      ).toHaveBeenCalledWith(ORG_ID, {
        employeeId: 'emp1',
        supervisorId: 'emp2',
      });
    });

    it('rejects a payload missing the employee id', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/organization/organization-hierarchy/update')
        .send({ supervisorId: 'emp2' });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateOrganisationHierarchy,
      ).not.toHaveBeenCalled();
    });
  });

  describe('GET /setting/organization/branding/retrieve', () => {
    it('retrieves the organization branding', async () => {
      const branding = {
        logoUrl: 'https://cdn.example.com/logo.png',
        navigationBackgroundColor: '#FAFDFF',
        buttonColor: '#1E88E5',
        customDomains: ['@foundationhr.com'],
        loginPageImages: ['https://cdn.example.com/login-hero.png'],
      };
      organisationService.getBranding.mockResolvedValue(branding);

      const response = await request(app.getHttpServer()).get(
        '/setting/organization/branding/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(branding);
      expect(organisationService.getBranding).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('PATCH /setting/organization/branding/update', () => {
    it('updates the organization branding with a valid payload', async () => {
      const payload = {
        navigationBackgroundColor: '#FAFDFF',
        buttonColor: '#1E88E5',
        customDomains: ['@foundationhr.com', '@foundationhr.co.uk'],
        loginPageImages: ['https://cdn.example.com/login-1.png'],
      };
      const updated = { logoUrl: null, ...payload };
      organisationService.updateBranding.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/setting/organization/branding/update')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updated);
      expect(organisationService.updateBranding).toHaveBeenCalledWith(
        ORG_ID,
        payload,
      );
    });

    it('clears the logo with an explicit null logoUrl', async () => {
      organisationService.updateBranding.mockResolvedValue({ logoUrl: null });

      const response = await request(app.getHttpServer())
        .patch('/setting/organization/branding/update')
        .send({ logoUrl: null });

      expect(response.status).toBe(200);
      expect(organisationService.updateBranding).toHaveBeenCalledWith(ORG_ID, {
        logoUrl: null,
      });
    });

    it('rejects an invalid hex color', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/organization/branding/update')
        .send({ buttonColor: 'not-a-color' });

      expect(response.status).toBe(400);
      expect(organisationService.updateBranding).not.toHaveBeenCalled();
    });

    it('rejects custom domains when the type is not an array', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/organization/branding/update')
        .send({ customDomains: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(organisationService.updateBranding).not.toHaveBeenCalled();
    });

    it('rejects login page images with non-string entries', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/organization/branding/update')
        .send({ loginPageImages: [123] });

      expect(response.status).toBe(400);
      expect(organisationService.updateBranding).not.toHaveBeenCalled();
    });
  });

  describe.each([
    {
      section: 'policy-management',
      getter: 'getPolicyManagement',
      updater: 'updatePolicyManagement',
    },
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