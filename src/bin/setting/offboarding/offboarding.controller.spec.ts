import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { OffboardingController } from './offboarding.controller';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('OffboardingController (integration)', () => {
  let app: INestApplication<App>;
  let organisationService: {
    getOffboardingSettings: jest.Mock<AnyPromiseFn>;
    addOffboardingType: jest.Mock<AnyPromiseFn>;
    removeOffboardingType: jest.Mock<AnyPromiseFn>;
    addExitReason: jest.Mock<AnyPromiseFn>;
    removeExitReason: jest.Mock<AnyPromiseFn>;
    addExitChecklistItem: jest.Mock<AnyPromiseFn>;
    updateExitChecklistItem: jest.Mock<AnyPromiseFn>;
    removeExitChecklistItem: jest.Mock<AnyPromiseFn>;
    getOffboardingDocumentsSettings: jest.Mock<AnyPromiseFn>;
    addEmployerExitDocument: jest.Mock<AnyPromiseFn>;
    updateEmployerExitDocument: jest.Mock<AnyPromiseFn>;
    removeEmployerExitDocument: jest.Mock<AnyPromiseFn>;
    addComplianceChecklistItem: jest.Mock<AnyPromiseFn>;
    updateComplianceChecklistItem: jest.Mock<AnyPromiseFn>;
    removeComplianceChecklistItem: jest.Mock<AnyPromiseFn>;
    updateDataRetention: jest.Mock<AnyPromiseFn>;
  };

  const settings = {
    offboardingTypes: [{ id: 'resignation', label: 'Resignation' }],
    exitReasons: [{ id: 'relocation', label: 'Relocation' }],
    exitChecklist: [
      {
        id: 'asset_return',
        label: 'Asset return',
        description: 'Return of laptop',
        selected: true,
      },
    ],
  };

  const documentsSettings = {
    employerExitDocuments: [
      {
        id: 'relieving_letter',
        name: 'Experience/Relieving Letter',
        fileType: 'PDF',
        requiresSignature: false,
      },
    ],
    complianceChecklist: [
      {
        id: 'nda_reminders',
        label: 'NDA Reminders',
        description: 'Return of laptop',
        selected: true,
      },
    ],
    dataRetentionPeriod: '6_months',
    dataRetentionPeriodLabel: '6 months',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organisationService = {
      getOffboardingSettings: jest.fn(),
      addOffboardingType: jest.fn(),
      removeOffboardingType: jest.fn(),
      addExitReason: jest.fn(),
      removeExitReason: jest.fn(),
      addExitChecklistItem: jest.fn(),
      updateExitChecklistItem: jest.fn(),
      removeExitChecklistItem: jest.fn(),
      getOffboardingDocumentsSettings: jest.fn(),
      addEmployerExitDocument: jest.fn(),
      updateEmployerExitDocument: jest.fn(),
      removeEmployerExitDocument: jest.fn(),
      addComplianceChecklistItem: jest.fn(),
      updateComplianceChecklistItem: jest.fn(),
      removeComplianceChecklistItem: jest.fn(),
      updateDataRetention: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [OffboardingController],
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

  describe('GET /setting/offboarding/general/retrieve', () => {
    it('retrieves the off-boarding settings', async () => {
      organisationService.getOffboardingSettings.mockResolvedValue(settings);

      const response = await request(app.getHttpServer()).get(
        '/setting/offboarding/general/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.getOffboardingSettings).toHaveBeenCalledWith(
        ORG_ID,
      );
    });
  });

  describe('POST /setting/offboarding/general/offboarding-type/add', () => {
    it('adds an off-boarding type', async () => {
      organisationService.addOffboardingType.mockResolvedValue(settings);

      const response = await request(app.getHttpServer())
        .post('/setting/offboarding/general/offboarding-type/add')
        .send({ label: 'Resignation' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.addOffboardingType).toHaveBeenCalledWith(
        ORG_ID,
        { label: 'Resignation' },
      );
    });

    it('rejects a missing label', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/offboarding/general/offboarding-type/add')
        .send({});

      expect(response.status).toBe(400);
      expect(organisationService.addOffboardingType).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /setting/offboarding/general/offboarding-type/remove', () => {
    it('removes an off-boarding type by id', async () => {
      organisationService.removeOffboardingType.mockResolvedValue(settings);

      const response = await request(app.getHttpServer()).delete(
        '/setting/offboarding/general/offboarding-type/remove?id=resignation',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.removeOffboardingType).toHaveBeenCalledWith(
        ORG_ID,
        'resignation',
      );
    });

    it('rejects a missing id', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/setting/offboarding/general/offboarding-type/remove',
      );

      expect(response.status).toBe(400);
      expect(organisationService.removeOffboardingType).not.toHaveBeenCalled();
    });
  });

  describe('POST /setting/offboarding/general/exit-reason/add', () => {
    it('adds an exit reason', async () => {
      organisationService.addExitReason.mockResolvedValue(settings);

      const response = await request(app.getHttpServer())
        .post('/setting/offboarding/general/exit-reason/add')
        .send({ label: 'Relocation' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.addExitReason).toHaveBeenCalledWith(ORG_ID, {
        label: 'Relocation',
      });
    });

    it('rejects a missing label', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/offboarding/general/exit-reason/add')
        .send({});

      expect(response.status).toBe(400);
      expect(organisationService.addExitReason).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /setting/offboarding/general/exit-reason/remove', () => {
    it('removes an exit reason by id', async () => {
      organisationService.removeExitReason.mockResolvedValue(settings);

      const response = await request(app.getHttpServer()).delete(
        '/setting/offboarding/general/exit-reason/remove?id=relocation',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.removeExitReason).toHaveBeenCalledWith(
        ORG_ID,
        'relocation',
      );
    });

    it('rejects a missing id', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/setting/offboarding/general/exit-reason/remove',
      );

      expect(response.status).toBe(400);
      expect(organisationService.removeExitReason).not.toHaveBeenCalled();
    });
  });

  describe('POST /setting/offboarding/general/exit-checklist/add', () => {
    it('adds an exit checklist item', async () => {
      organisationService.addExitChecklistItem.mockResolvedValue(settings);

      const response = await request(app.getHttpServer())
        .post('/setting/offboarding/general/exit-checklist/add')
        .send({ label: 'Asset return', description: 'Return of laptop' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.addExitChecklistItem).toHaveBeenCalledWith(
        ORG_ID,
        { label: 'Asset return', description: 'Return of laptop' },
      );
    });

    it('rejects a missing label', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/offboarding/general/exit-checklist/add')
        .send({ description: 'Return of laptop' });

      expect(response.status).toBe(400);
      expect(organisationService.addExitChecklistItem).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/offboarding/general/exit-checklist/update', () => {
    it('updates an exit checklist item by id', async () => {
      organisationService.updateExitChecklistItem.mockResolvedValue(settings);

      const response = await request(app.getHttpServer())
        .patch(
          '/setting/offboarding/general/exit-checklist/update?id=asset_return',
        )
        .send({ selected: false });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.updateExitChecklistItem).toHaveBeenCalledWith(
        ORG_ID,
        'asset_return',
        { selected: false },
      );
    });

    it('rejects an invalid selected flag', async () => {
      const response = await request(app.getHttpServer())
        .patch(
          '/setting/offboarding/general/exit-checklist/update?id=asset_return',
        )
        .send({ selected: 'not-a-boolean' });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateExitChecklistItem,
      ).not.toHaveBeenCalled();
    });

    it('rejects a missing id', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/offboarding/general/exit-checklist/update')
        .send({ selected: false });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateExitChecklistItem,
      ).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /setting/offboarding/general/exit-checklist/remove', () => {
    it('removes an exit checklist item by id', async () => {
      organisationService.removeExitChecklistItem.mockResolvedValue(settings);

      const response = await request(app.getHttpServer()).delete(
        '/setting/offboarding/general/exit-checklist/remove?id=asset_return',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.removeExitChecklistItem).toHaveBeenCalledWith(
        ORG_ID,
        'asset_return',
      );
    });

    it('rejects a missing id', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/setting/offboarding/general/exit-checklist/remove',
      );

      expect(response.status).toBe(400);
      expect(
        organisationService.removeExitChecklistItem,
      ).not.toHaveBeenCalled();
    });
  });

  describe('GET /setting/offboarding/exit-documents/retrieve', () => {
    it('retrieves the exit documents settings', async () => {
      organisationService.getOffboardingDocumentsSettings.mockResolvedValue(
        documentsSettings,
      );

      const response = await request(app.getHttpServer()).get(
        '/setting/offboarding/exit-documents/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(documentsSettings);
      expect(
        organisationService.getOffboardingDocumentsSettings,
      ).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('POST /setting/offboarding/exit-documents/employer-document/add', () => {
    it('adds an employer exit document', async () => {
      organisationService.addEmployerExitDocument.mockResolvedValue(
        documentsSettings,
      );

      const response = await request(app.getHttpServer())
        .post('/setting/offboarding/exit-documents/employer-document/add')
        .send({ name: 'Experience/Relieving Letter', fileType: 'PDF' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(documentsSettings);
      expect(organisationService.addEmployerExitDocument).toHaveBeenCalledWith(
        ORG_ID,
        {
          name: 'Experience/Relieving Letter',
          fileType: 'PDF',
        },
      );
    });

    it('rejects a missing name', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/offboarding/exit-documents/employer-document/add')
        .send({ fileType: 'PDF' });

      expect(response.status).toBe(400);
      expect(
        organisationService.addEmployerExitDocument,
      ).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/offboarding/exit-documents/employer-document/update', () => {
    it('updates an employer exit document by id', async () => {
      organisationService.updateEmployerExitDocument.mockResolvedValue(
        documentsSettings,
      );

      const response = await request(app.getHttpServer())
        .patch(
          '/setting/offboarding/exit-documents/employer-document/update?id=relieving_letter',
        )
        .send({ requiresSignature: true });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(documentsSettings);
      expect(
        organisationService.updateEmployerExitDocument,
      ).toHaveBeenCalledWith(ORG_ID, 'relieving_letter', {
        requiresSignature: true,
      });
    });

    it('rejects a missing id', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/offboarding/exit-documents/employer-document/update')
        .send({ requiresSignature: true });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateEmployerExitDocument,
      ).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /setting/offboarding/exit-documents/employer-document/remove', () => {
    it('removes an employer exit document by id', async () => {
      organisationService.removeEmployerExitDocument.mockResolvedValue(
        documentsSettings,
      );

      const response = await request(app.getHttpServer()).delete(
        '/setting/offboarding/exit-documents/employer-document/remove?id=relieving_letter',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(documentsSettings);
      expect(
        organisationService.removeEmployerExitDocument,
      ).toHaveBeenCalledWith(ORG_ID, 'relieving_letter');
    });

    it('rejects a missing id', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/setting/offboarding/exit-documents/employer-document/remove',
      );

      expect(response.status).toBe(400);
      expect(
        organisationService.removeEmployerExitDocument,
      ).not.toHaveBeenCalled();
    });
  });

  describe('POST /setting/offboarding/exit-documents/compliance-checklist/add', () => {
    it('adds a compliance checklist item', async () => {
      organisationService.addComplianceChecklistItem.mockResolvedValue(
        documentsSettings,
      );

      const response = await request(app.getHttpServer())
        .post('/setting/offboarding/exit-documents/compliance-checklist/add')
        .send({ label: 'NDA Reminders', description: 'Return of laptop' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(documentsSettings);
      expect(
        organisationService.addComplianceChecklistItem,
      ).toHaveBeenCalledWith(ORG_ID, {
        label: 'NDA Reminders',
        description: 'Return of laptop',
      });
    });

    it('rejects a missing label', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/offboarding/exit-documents/compliance-checklist/add')
        .send({ description: 'Return of laptop' });

      expect(response.status).toBe(400);
      expect(
        organisationService.addComplianceChecklistItem,
      ).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/offboarding/exit-documents/compliance-checklist/update', () => {
    it('updates a compliance checklist item by id', async () => {
      organisationService.updateComplianceChecklistItem.mockResolvedValue(
        documentsSettings,
      );

      const response = await request(app.getHttpServer())
        .patch(
          '/setting/offboarding/exit-documents/compliance-checklist/update?id=nda_reminders',
        )
        .send({ selected: false });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(documentsSettings);
      expect(
        organisationService.updateComplianceChecklistItem,
      ).toHaveBeenCalledWith(ORG_ID, 'nda_reminders', { selected: false });
    });

    it('rejects a missing id', async () => {
      const response = await request(app.getHttpServer())
        .patch(
          '/setting/offboarding/exit-documents/compliance-checklist/update',
        )
        .send({ selected: false });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateComplianceChecklistItem,
      ).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /setting/offboarding/exit-documents/compliance-checklist/remove', () => {
    it('removes a compliance checklist item by id', async () => {
      organisationService.removeComplianceChecklistItem.mockResolvedValue(
        documentsSettings,
      );

      const response = await request(app.getHttpServer()).delete(
        '/setting/offboarding/exit-documents/compliance-checklist/remove?id=nda_reminders',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(documentsSettings);
      expect(
        organisationService.removeComplianceChecklistItem,
      ).toHaveBeenCalledWith(ORG_ID, 'nda_reminders');
    });

    it('rejects a missing id', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/setting/offboarding/exit-documents/compliance-checklist/remove',
      );

      expect(response.status).toBe(400);
      expect(
        organisationService.removeComplianceChecklistItem,
      ).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/offboarding/exit-documents/data-retention/update', () => {
    it('updates the data retention period', async () => {
      organisationService.updateDataRetention.mockResolvedValue(
        documentsSettings,
      );

      const response = await request(app.getHttpServer())
        .patch('/setting/offboarding/exit-documents/data-retention/update')
        .send({ dataRetentionPeriod: '6_months' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(documentsSettings);
      expect(organisationService.updateDataRetention).toHaveBeenCalledWith(
        ORG_ID,
        { dataRetentionPeriod: '6_months' },
      );
    });

    it('clears the data retention period', async () => {
      organisationService.updateDataRetention.mockResolvedValue(
        documentsSettings,
      );

      const response = await request(app.getHttpServer())
        .patch('/setting/offboarding/exit-documents/data-retention/update')
        .send({ dataRetentionPeriod: null });

      expect(response.status).toBe(200);
      expect(organisationService.updateDataRetention).toHaveBeenCalledWith(
        ORG_ID,
        { dataRetentionPeriod: null },
      );
    });

    it('rejects an invalid data retention period', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/offboarding/exit-documents/data-retention/update')
        .send({ dataRetentionPeriod: '9_months' });

      expect(response.status).toBe(400);
      expect(organisationService.updateDataRetention).not.toHaveBeenCalled();
    });
  });
});
