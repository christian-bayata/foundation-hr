import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { EmployeeProfilesController } from './employee-profiles.controller';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('EmployeeProfilesController (integration)', () => {
  let app: INestApplication<App>;
  let organisationService: {
    getEmployeeProfileSettings: jest.Mock<AnyPromiseFn>;
    updateEmployeeProfileSettings: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organisationService = {
      getEmployeeProfileSettings: jest.fn(),
      updateEmployeeProfileSettings: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [EmployeeProfilesController],
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

  describe('GET /setting/employee-profiles/retrieve', () => {
    it('retrieves the organization employee profile settings', async () => {
      const settings = {
        useEmployeeIdGenerator: true,
        documentFormats: ['pdf', 'docx'],
        employmentTypes: ['full_time', 'intern'],
      };
      organisationService.getEmployeeProfileSettings.mockResolvedValue(
        settings,
      );

      const response = await request(app.getHttpServer()).get(
        '/setting/employee-profiles/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(settings);
      expect(
        organisationService.getEmployeeProfileSettings,
      ).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('PATCH /setting/employee-profiles/update', () => {
    it('updates the employee profile settings with a valid payload', async () => {
      const payload = {
        useEmployeeIdGenerator: false,
        documentFormats: ['pdf'],
        employmentTypes: ['contract'],
      };
      organisationService.updateEmployeeProfileSettings.mockResolvedValue(
        payload,
      );

      const response = await request(app.getHttpServer())
        .patch('/setting/employee-profiles/update')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(payload);
      expect(
        organisationService.updateEmployeeProfileSettings,
      ).toHaveBeenCalledWith(ORG_ID, payload);
    });

    it('rejects a payload with a non-boolean flag', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/employee-profiles/update')
        .send({ useEmployeeIdGenerator: 'yes' });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateEmployeeProfileSettings,
      ).not.toHaveBeenCalled();
    });

    it('rejects a payload with an invalid document format', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/employee-profiles/update')
        .send({ documentFormats: ['pdf', 'not_a_format'] });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateEmployeeProfileSettings,
      ).not.toHaveBeenCalled();
    });

    it('rejects a payload with an invalid employment type', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/employee-profiles/update')
        .send({ employmentTypes: ['full_time', 'freelance'] });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateEmployeeProfileSettings,
      ).not.toHaveBeenCalled();
    });
  });
});
