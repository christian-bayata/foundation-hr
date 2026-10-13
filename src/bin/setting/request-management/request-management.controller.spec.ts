import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { RequestManagementController } from './request-management.controller';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('RequestManagementController (integration)', () => {
  let app: INestApplication<App>;
  let organisationService: {
    getRequestWorkflows: jest.Mock<AnyPromiseFn>;
    getRequestWorkflow: jest.Mock<AnyPromiseFn>;
    addRequestWorkflow: jest.Mock<AnyPromiseFn>;
    updateRequestWorkflow: jest.Mock<AnyPromiseFn>;
    deleteRequestWorkflow: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organisationService = {
      getRequestWorkflows: jest.fn(),
      getRequestWorkflow: jest.fn(),
      addRequestWorkflow: jest.fn(),
      updateRequestWorkflow: jest.fn(),
      deleteRequestWorkflow: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [RequestManagementController],
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

  describe('GET /setting/request-management/workflow/retrieve', () => {
    it('retrieves the request workflows grouped by request type', async () => {
      const data = {
        requestTypes: [
          {
            type: 'employee_termination',
            label: 'Employee termination',
            workflows: [],
          },
        ],
      };
      organisationService.getRequestWorkflows.mockResolvedValue(data);

      const response = await request(app.getHttpServer()).get(
        '/setting/request-management/workflow/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(data);
      expect(organisationService.getRequestWorkflows).toHaveBeenCalledWith(
        ORG_ID,
        undefined,
      );
    });

    it('passes a request type filter through', async () => {
      organisationService.getRequestWorkflows.mockResolvedValue({
        requestTypes: [],
      });

      const response = await request(app.getHttpServer()).get(
        '/setting/request-management/workflow/retrieve?requestType=query_request',
      );

      expect(response.status).toBe(200);
      expect(organisationService.getRequestWorkflows).toHaveBeenCalledWith(
        ORG_ID,
        'query_request',
      );
    });

    it('rejects an invalid request type filter', async () => {
      const response = await request(app.getHttpServer()).get(
        '/setting/request-management/workflow/retrieve?requestType=not_a_type',
      );

      expect(response.status).toBe(400);
      expect(organisationService.getRequestWorkflows).not.toHaveBeenCalled();
    });
  });

  describe('GET /setting/request-management/workflow/retrieve/:workflowId', () => {
    it('retrieves a single workflow', async () => {
      const workflow = {
        id: 'wf-1',
        requestType: 'employee_termination',
        name: 'Employee termination workflow',
        isDefault: false,
        steps: [{ id: 's-1', order: 1, responsibleParty: 'Admin' }],
      };
      organisationService.getRequestWorkflow.mockResolvedValue(workflow);

      const response = await request(app.getHttpServer()).get(
        '/setting/request-management/workflow/retrieve/wf-1',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(workflow);
      expect(organisationService.getRequestWorkflow).toHaveBeenCalledWith(
        ORG_ID,
        'wf-1',
      );
    });
  });

  describe('POST /setting/request-management/workflow/add', () => {
    it('adds a workflow', async () => {
      const created = {
        id: 'wf-1',
        requestType: 'employee_termination',
        name: 'Employee termination workflow',
        isDefault: false,
        steps: [],
      };
      organisationService.addRequestWorkflow.mockResolvedValue(created);

      const response = await request(app.getHttpServer())
        .post('/setting/request-management/workflow/add')
        .send({
          requestType: 'employee_termination',
          steps: [{ responsibleParty: 'Admin' }],
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(created);
      expect(organisationService.addRequestWorkflow).toHaveBeenCalledWith(
        ORG_ID,
        {
          requestType: 'employee_termination',
          steps: [{ responsibleParty: 'Admin' }],
        },
      );
    });

    it('rejects an invalid request type', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/request-management/workflow/add')
        .send({ requestType: 'not_a_type' });

      expect(response.status).toBe(400);
      expect(organisationService.addRequestWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/request-management/workflow/update/:workflowId', () => {
    it('updates a workflow', async () => {
      const updated = {
        id: 'wf-1',
        requestType: 'employee_termination',
        name: 'Renamed',
        isDefault: true,
        steps: [],
      };
      organisationService.updateRequestWorkflow.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/setting/request-management/workflow/update/wf-1')
        .send({ name: 'Renamed', isDefault: true });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updated);
      expect(organisationService.updateRequestWorkflow).toHaveBeenCalledWith(
        ORG_ID,
        'wf-1',
        { name: 'Renamed', isDefault: true },
      );
    });

    it('rejects a non-boolean default flag', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/request-management/workflow/update/wf-1')
        .send({ isDefault: 'yes' });

      expect(response.status).toBe(400);
      expect(organisationService.updateRequestWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /setting/request-management/workflow/delete/:workflowId', () => {
    it('deletes a workflow', async () => {
      organisationService.deleteRequestWorkflow.mockResolvedValue(
        'Request workflow deleted',
      );

      const response = await request(app.getHttpServer()).delete(
        '/setting/request-management/workflow/delete/wf-1',
      );

      expect(response.status).toBe(200);
      expect(organisationService.deleteRequestWorkflow).toHaveBeenCalledWith(
        ORG_ID,
        'wf-1',
      );
    });
  });
});
