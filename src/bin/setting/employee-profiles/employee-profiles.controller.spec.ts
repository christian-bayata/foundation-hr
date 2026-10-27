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
    getEmployeeWorkflow: jest.Mock<AnyPromiseFn>;
    addWorkflowStep: jest.Mock<AnyPromiseFn>;
    updateWorkflowStep: jest.Mock<AnyPromiseFn>;
    deleteWorkflowStep: jest.Mock<AnyPromiseFn>;
    completeWorkflowStep: jest.Mock<AnyPromiseFn>;
    getResponsibleParties: jest.Mock<AnyPromiseFn>;
    addResponsibleParty: jest.Mock<AnyPromiseFn>;
    getPensionFundAdministrators: jest.Mock<AnyPromiseFn>;
    addPensionFundAdministrator: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organisationService = {
      getEmployeeProfileSettings: jest.fn(),
      updateEmployeeProfileSettings: jest.fn(),
      getEmployeeWorkflow: jest.fn(),
      addWorkflowStep: jest.fn(),
      updateWorkflowStep: jest.fn(),
      deleteWorkflowStep: jest.fn(),
      completeWorkflowStep: jest.fn(),
      getResponsibleParties: jest.fn(),
      addResponsibleParty: jest.fn(),
      getPensionFundAdministrators: jest.fn(),
      addPensionFundAdministrator: jest.fn(),
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

  describe('GET /setting/employee-profiles/general-settings/retrieve', () => {
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
        '/setting/employee-profiles/general-settings/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(settings);
      expect(
        organisationService.getEmployeeProfileSettings,
      ).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('PATCH /setting/employee-profiles/general-settings/update', () => {
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
        .patch('/setting/employee-profiles/general-settings/update')
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
        .patch('/setting/employee-profiles/general-settings/update')
        .send({ useEmployeeIdGenerator: 'yes' });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateEmployeeProfileSettings,
      ).not.toHaveBeenCalled();
    });

    it('rejects a payload with an invalid document format', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/employee-profiles/general-settings/update')
        .send({ documentFormats: ['pdf', 'not_a_format'] });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateEmployeeProfileSettings,
      ).not.toHaveBeenCalled();
    });

    it('rejects a payload with an invalid employment type', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/employee-profiles/general-settings/update')
        .send({ employmentTypes: ['full_time', 'freelance'] });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateEmployeeProfileSettings,
      ).not.toHaveBeenCalled();
    });
  });

  describe('GET /setting/employee-profiles/workflow/retrieve', () => {
    it('retrieves the organization employee workflow settings', async () => {
      const workflow = {
        onboarding: [
          {
            id: '64f1b2c3d4e5f678901234ff',
            stepName: 'Sign employee agreement',
            responsibleParty: 'New hire',
            taskType: null,
            dueDate: 'Within 1 day',
            instructions: null,
            attachmentUrls: [],
            completionRequirements: ['marked_as_complete'],
          },
        ],
        leave: [],
        offboarding: [],
      };
      organisationService.getEmployeeWorkflow.mockResolvedValue(workflow);

      const response = await request(app.getHttpServer()).get(
        '/setting/employee-profiles/workflow/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(workflow);
      expect(organisationService.getEmployeeWorkflow).toHaveBeenCalledWith(
        ORG_ID,
      );
    });
  });

  describe('POST /setting/employee-profiles/workflow/add', () => {
    it('adds a workflow step with a valid payload', async () => {
      const payload = {
        type: 'onboarding',
        stepName: 'Sign employee agreement',
        responsibleParty: 'New hire',
        taskType: 'upload_documents',
        dueDate: '1_day_after_joining',
        completionRequirements: [
          { step: 'Admin adds employment details', isCompleted: true },
        ],
      };
      const created = { id: '64f1b2c3d4e5f678901234ff', ...payload };
      organisationService.addWorkflowStep.mockResolvedValue(created);

      const response = await request(app.getHttpServer())
        .post('/setting/employee-profiles/workflow/add')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(created);
      expect(organisationService.addWorkflowStep).toHaveBeenCalledWith(
        ORG_ID,
        payload,
      );
    });

    it('rejects a step with a missing step name', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/employee-profiles/workflow/add')
        .send({ type: 'onboarding' });

      expect(response.status).toBe(400);
      expect(organisationService.addWorkflowStep).not.toHaveBeenCalled();
    });

    it('rejects a step with an invalid workflow type', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/employee-profiles/workflow/add')
        .send({ type: 'missing', stepName: 'Sign employee agreement' });

      expect(response.status).toBe(400);
      expect(organisationService.addWorkflowStep).not.toHaveBeenCalled();
    });

    it('rejects a step with an invalid completion requirement', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/employee-profiles/workflow/add')
        .send({
          type: 'onboarding',
          stepName: 'Sign employee agreement',
          completionRequirements: [{ step: '', isCompleted: true }],
        });

      expect(response.status).toBe(400);
      expect(organisationService.addWorkflowStep).not.toHaveBeenCalled();
    });

    it('rejects a step with an invalid task type', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/employee-profiles/workflow/add')
        .send({
          type: 'onboarding',
          stepName: 'Sign employee agreement',
          taskType: 'not_a_task_type',
        });

      expect(response.status).toBe(400);
      expect(organisationService.addWorkflowStep).not.toHaveBeenCalled();
    });

    it('rejects a step with an invalid due date', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/employee-profiles/workflow/add')
        .send({
          type: 'onboarding',
          stepName: 'Sign employee agreement',
          dueDate: 'within_1_day',
        });

      expect(response.status).toBe(400);
      expect(organisationService.addWorkflowStep).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/employee-profiles/workflow/update', () => {
    it('updates a workflow step with a valid payload', async () => {
      const stepId = '64f1b2c3d4e5f678901234ff';
      const payload = { stepName: 'Updated step' };
      organisationService.updateWorkflowStep.mockResolvedValue({
        id: stepId,
        ...payload,
      });

      const response = await request(app.getHttpServer())
        .patch(`/setting/employee-profiles/workflow/update?stepId=${stepId}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(organisationService.updateWorkflowStep).toHaveBeenCalledWith(
        ORG_ID,
        stepId,
        payload,
      );
    });

    it('rejects a step with an invalid completion requirement', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/employee-profiles/workflow/update?stepId=abc')
        .send({ completionRequirements: ['not_a_requirement'] });

      expect(response.status).toBe(400);
      expect(organisationService.updateWorkflowStep).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /setting/employee-profiles/workflow/delete', () => {
    it('deletes a workflow step', async () => {
      const stepId = '64f1b2c3d4e5f678901234ff';
      organisationService.deleteWorkflowStep.mockResolvedValue({ id: stepId });

      const response = await request(app.getHttpServer()).delete(
        `/setting/employee-profiles/workflow/delete?stepId=${stepId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual({ id: stepId });
      expect(organisationService.deleteWorkflowStep).toHaveBeenCalledWith(
        ORG_ID,
        stepId,
      );
    });
  });

  describe('PATCH /setting/employee-profiles/workflow/complete', () => {
    it('completes a workflow step with a valid payload', async () => {
      const stepId = '64f1b2c3d4e5f678901234ff';
      const payload = {
        completionRequirements: [
          { step: 'Admin adds employment details', isCompleted: true },
        ],
        isCompleted: true,
      };
      organisationService.completeWorkflowStep.mockResolvedValue({
        id: stepId,
        ...payload,
      });

      const response = await request(app.getHttpServer())
        .patch(`/setting/employee-profiles/workflow/complete?stepId=${stepId}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual({
        id: stepId,
        ...payload,
      });
      expect(organisationService.completeWorkflowStep).toHaveBeenCalledWith(
        ORG_ID,
        stepId,
        payload,
      );
    });

    it('rejects a completion with missing completion requirements', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/employee-profiles/workflow/complete?stepId=abc')
        .send({ isCompleted: true });

      expect(response.status).toBe(400);
      expect(organisationService.completeWorkflowStep).not.toHaveBeenCalled();
    });
  });

  describe('GET /setting/employee-profiles/workflow/responsible-parties/retrieve', () => {
    it('retrieves the default and custom responsible parties', async () => {
      const parties = {
        defaultParties: ['admin', 'new_hire'],
        customParties: ['Payroll'],
      };
      organisationService.getResponsibleParties.mockResolvedValue(parties);

      const response = await request(app.getHttpServer()).get(
        '/setting/employee-profiles/workflow/responsible-parties/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(parties);
      expect(organisationService.getResponsibleParties).toHaveBeenCalledWith(
        ORG_ID,
      );
    });
  });

  describe('POST /setting/employee-profiles/workflow/responsible-parties/add', () => {
    it('adds a custom responsible party with a valid payload', async () => {
      const payload = { name: 'Payroll' };
      const result = {
        defaultParties: ['admin', 'new_hire'],
        customParties: ['Payroll'],
      };
      organisationService.addResponsibleParty.mockResolvedValue(result);

      const response = await request(app.getHttpServer())
        .post('/setting/employee-profiles/workflow/responsible-parties/add')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(result);
      expect(organisationService.addResponsibleParty).toHaveBeenCalledWith(
        ORG_ID,
        payload,
      );
    });

    it('rejects a party with a missing name', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/employee-profiles/workflow/responsible-parties/add')
        .send({});

      expect(response.status).toBe(400);
      expect(organisationService.addResponsibleParty).not.toHaveBeenCalled();
    });
  });

  describe('GET /setting/employee-profiles/pension-fund-administrators/retrieve', () => {
    it('retrieves the pension fund administrators', async () => {
      const administrators = {
        administrators: [
          { id: '64f1b2c3d4e5f678901234ff', name: 'Access Pensions Limited' },
        ],
      };
      organisationService.getPensionFundAdministrators.mockResolvedValue(
        administrators,
      );

      const response = await request(app.getHttpServer()).get(
        '/setting/employee-profiles/pension-fund-administrators/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(administrators);
      expect(
        organisationService.getPensionFundAdministrators,
      ).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('POST /setting/employee-profiles/pension-fund-administrators/add', () => {
    it('adds a pension fund administrator with a valid payload', async () => {
      const payload = { name: 'Access Pensions Limited' };
      const created = { id: '64f1b2c3d4e5f678901234ff', ...payload };
      organisationService.addPensionFundAdministrator.mockResolvedValue(created);

      const response = await request(app.getHttpServer())
        .post('/setting/employee-profiles/pension-fund-administrators/add')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(created);
      expect(
        organisationService.addPensionFundAdministrator,
      ).toHaveBeenCalledWith(ORG_ID, payload);
    });

    it('rejects an administrator with a missing name', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/employee-profiles/pension-fund-administrators/add')
        .send({});

      expect(response.status).toBe(400);
      expect(
        organisationService.addPensionFundAdministrator,
      ).not.toHaveBeenCalled();
    });
  });
});
