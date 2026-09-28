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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { SettingController } from './setting.controller';
import { SettingService } from './setting.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const ACTOR_ID = 'usr-owner-1';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('SettingController access control (integration)', () => {
  let app: INestApplication<App>;
  let settingService: {
    addCompanyAdmin: jest.Mock<AnyPromiseFn>;
    listCompanyAdmins: jest.Mock<AnyPromiseFn>;
    updateCompanyAdminRole: jest.Mock<AnyPromiseFn>;
    activateUserRole: jest.Mock<AnyPromiseFn>;
    deactivateUserRole: jest.Mock<AnyPromiseFn>;
    suspendUserRole: jest.Mock<AnyPromiseFn>;
  };

  const adminRow = {
    id: 'assignment-1',
    userId: 'usr-2',
    firstName: 'Jobi',
    lastName: 'Olusayo',
    name: 'Jobi Olusayo',
    email: 'olusayo@foundation.com',
    status: 'created',
    role: { id: 'role-2', name: 'HR Admin', systemRole: 'hr_admin' },
    jobTitle: 'Human resource',
    isBillingContact: false,
    isAuthorizedRepresentative: true,
    systemSettings: true,
    assignments: ['Authorized Representative'],
    addedById: null,
    dateCreated: '2023-10-12T00:00:00.000Z',
  };

  const validCreatePayload = {
    firstName: 'Jobi',
    lastName: 'Olusayo',
    email: 'olusayo@foundation.com',
    roleId: 'role-2',
    jobTitle: 'Human resource',
    billingContact: false,
    authorizedRepresentative: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    settingService = {
      addCompanyAdmin: jest.fn(),
      listCompanyAdmins: jest.fn(),
      updateCompanyAdminRole: jest.fn(),
      activateUserRole: jest.fn(),
      deactivateUserRole: jest.fn(),
      suspendUserRole: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [SettingController],
      providers: [{ provide: SettingService, useValue: settingService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = {
            userId: ACTOR_ID,
            email: 'owner@foundation.com',
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

  describe('GET /setting/access-control/company-admin/retrieve/all', () => {
    it('returns the paginated company admin list for the caller organization', async () => {
      settingService.listCompanyAdmins.mockResolvedValue({
        data: [adminRow],
        count: 1,
      });

      const response = await request(app.getHttpServer()).get(
        '/setting/access-control/company-admin/retrieve/all',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data.count).toBe(1);
      expect(response.body.data.data[0].name).toBe('Jobi Olusayo');
      expect(settingService.listCompanyAdmins).toHaveBeenCalledWith(ORG_ID, {});
    });

    it('forwards every supported filter, sort and pagination parameter', async () => {
      settingService.listCompanyAdmins.mockResolvedValue({
        data: [],
        count: 0,
      });

      const response = await request(app.getHttpServer()).get(
        '/setting/access-control/company-admin/retrieve/all' +
          '?q=jobi&status=active&role=hr_admin&job_title=Human+resource' +
          '&added_by=usr-owner-1&date_created=2023-10-12' +
          '&sort_by=name&sort_dir=asc&batch=2&limit=25',
      );

      expect(response.status).toBe(200);
      expect(settingService.listCompanyAdmins).toHaveBeenCalledWith(ORG_ID, {
        q: 'jobi',
        status: 'active',
        role: 'hr_admin',
        job_title: 'Human resource',
        added_by: 'usr-owner-1',
        date_created: '2023-10-12',
        sort_by: 'name',
        sort_dir: 'asc',
        batch: '2',
        limit: '25',
      });
    });
  });

  describe('POST /setting/access-control/company-admin/create', () => {
    it('creates a company admin attributed to the caller', async () => {
      settingService.addCompanyAdmin.mockResolvedValue(adminRow);

      const response = await request(app.getHttpServer())
        .post('/setting/access-control/company-admin/create')
        .send(validCreatePayload);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(true);
      expect(response.body.data.status).toBe('created');
      expect(settingService.addCompanyAdmin).toHaveBeenCalledWith(
        ORG_ID,
        ACTOR_ID,
        validCreatePayload,
      );
    });

    it('defaults the assignment checkboxes to false when omitted', async () => {
      settingService.addCompanyAdmin.mockResolvedValue(adminRow);

      const response = await request(app.getHttpServer())
        .post('/setting/access-control/company-admin/create')
        .send({
          firstName: 'Jobi',
          lastName: 'Olusayo',
          email: 'olusayo@foundation.com',
          roleId: 'role-2',
          jobTitle: 'Human resource',
        });

      expect(response.status).toBe(201);
      expect(settingService.addCompanyAdmin).toHaveBeenCalledWith(
        ORG_ID,
        ACTOR_ID,
        expect.objectContaining({
          billingContact: undefined,
          authorizedRepresentative: undefined,
        }),
      );
    });

    it('forwards systemSettings: false to create an admin without settings access', async () => {
      settingService.addCompanyAdmin.mockResolvedValue({
        ...adminRow,
        systemSettings: false,
      });

      const response = await request(app.getHttpServer())
        .post('/setting/access-control/company-admin/create')
        .send({ ...validCreatePayload, systemSettings: false });

      expect(response.status).toBe(201);
      expect(response.body.data.systemSettings).toBe(false);
      expect(settingService.addCompanyAdmin).toHaveBeenCalledWith(
        ORG_ID,
        ACTOR_ID,
        expect.objectContaining({ systemSettings: false }),
      );
    });

    it('rejects a non-boolean systemSettings', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/access-control/company-admin/create')
        .send({ ...validCreatePayload, systemSettings: 'yes' });

      expect(response.status).toBe(400);
      expect(settingService.addCompanyAdmin).not.toHaveBeenCalled();
    });

    it('rejects a payload without a roleId', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/access-control/company-admin/create')
        .send({ ...validCreatePayload, roleId: undefined });

      expect(response.status).toBe(400);
      expect(settingService.addCompanyAdmin).not.toHaveBeenCalled();
    });

    it('rejects a malformed email', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/access-control/company-admin/create')
        .send({ ...validCreatePayload, email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(settingService.addCompanyAdmin).not.toHaveBeenCalled();
    });

    it('rejects non-boolean assignment checkboxes', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/access-control/company-admin/create')
        .send({ ...validCreatePayload, billingContact: 'yes' });

      expect(response.status).toBe(400);
      expect(settingService.addCompanyAdmin).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/access-control/company-admin/update-role/:id', () => {
    it('updates the role of the targeted company admin', async () => {
      settingService.updateCompanyAdminRole.mockResolvedValue({
        ...adminRow,
        role: { id: 'role-3', name: 'Owner', systemRole: 'company_owner' },
      });

      const response = await request(app.getHttpServer())
        .patch('/setting/access-control/company-admin/update-role/assignment-1')
        .send({ roleId: 'role-3' });

      expect(response.status).toBe(200);
      expect(response.body.data.role.systemRole).toBe('company_owner');
      expect(settingService.updateCompanyAdminRole).toHaveBeenCalledWith(
        ORG_ID,
        'assignment-1',
        { roleId: 'role-3' },
      );
    });

    it('rejects a role update without a roleId', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/access-control/company-admin/update-role/assignment-1')
        .send({});

      expect(response.status).toBe(400);
      expect(settingService.updateCompanyAdminRole).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/access-control/user-role/activate/:id', () => {
    it('activates a user role', async () => {
      settingService.activateUserRole.mockResolvedValue({
        ...adminRow,
        status: 'active',
      });

      const response = await request(app.getHttpServer())
        .patch('/setting/access-control/user-role/activate/assignment-1');

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('active');
      expect(settingService.activateUserRole).toHaveBeenCalledWith(
        ORG_ID,
        'assignment-1',
        ACTOR_ID,
      );
    });
  });

  describe('PATCH /setting/access-control/user-role/deactivate/:id', () => {
    it('deactivates a user role', async () => {
      settingService.deactivateUserRole.mockResolvedValue({
        ...adminRow,
        status: 'inactive',
      });

      const response = await request(app.getHttpServer())
        .patch('/setting/access-control/user-role/deactivate/assignment-1');

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('inactive');
      expect(settingService.deactivateUserRole).toHaveBeenCalledWith(
        ORG_ID,
        'assignment-1',
        ACTOR_ID,
      );
    });
  });

  describe('PATCH /setting/access-control/user-role/suspend/:id', () => {
    it('suspends a user role', async () => {
      settingService.suspendUserRole.mockResolvedValue({
        ...adminRow,
        status: 'suspended',
      });

      const response = await request(app.getHttpServer())
        .patch('/setting/access-control/user-role/suspend/assignment-1');

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('suspended');
      expect(settingService.suspendUserRole).toHaveBeenCalledWith(
        ORG_ID,
        'assignment-1',
        ACTOR_ID,
      );
    });
  });

  describe('removed company admin status endpoints', () => {
    it('no longer routes update-status', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/access-control/company-admin/update-status/assignment-1')
        .send({ status: 'inactive' });

      expect(response.status).toBe(404);
      expect(settingService.activateUserRole).not.toHaveBeenCalled();
      expect(settingService.deactivateUserRole).not.toHaveBeenCalled();
      expect(settingService.suspendUserRole).not.toHaveBeenCalled();
    });

    it('no longer routes update-system-settings', async () => {
      const response = await request(app.getHttpServer())
        .patch(
          '/setting/access-control/company-admin/update-system-settings/assignment-1',
        )
        .send({ systemSettings: false });

      expect(response.status).toBe(404);
    });
  });
});
