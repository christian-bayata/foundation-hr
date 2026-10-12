import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { OnboardingController } from './onboarding.controller';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('OnboardingController (integration)', () => {
  let app: INestApplication<App>;
  let organisationService: {
    getOnboardingSettings: jest.Mock<AnyPromiseFn>;
    updateOnboardingSettings: jest.Mock<AnyPromiseFn>;
    addOnboardingDocument: jest.Mock<AnyPromiseFn>;
    updateOnboardingDocument: jest.Mock<AnyPromiseFn>;
    deleteOnboardingDocument: jest.Mock<AnyPromiseFn>;
    addEmployerIssuedDocument: jest.Mock<AnyPromiseFn>;
    updateEmployerIssuedDocument: jest.Mock<AnyPromiseFn>;
    deleteEmployerIssuedDocument: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organisationService = {
      getOnboardingSettings: jest.fn(),
      updateOnboardingSettings: jest.fn(),
      addOnboardingDocument: jest.fn(),
      updateOnboardingDocument: jest.fn(),
      deleteOnboardingDocument: jest.fn(),
      addEmployerIssuedDocument: jest.fn(),
      updateEmployerIssuedDocument: jest.fn(),
      deleteEmployerIssuedDocument: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [OnboardingController],
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

  describe('GET /setting/onboarding/retrieve', () => {
    it('retrieves the onboarding settings', async () => {
      const settings = {
        welcomeMessage: { enabled: false, message: null },
        defaultOnboardingDuration: { enabled: false, value: null },
        personalIdentificationDocuments: [],
        educationalProfessionalCerts: [],
        medicalHealthRecords: [],
        employerIssuedDocuments: [],
      };
      organisationService.getOnboardingSettings.mockResolvedValue(settings);

      const response = await request(app.getHttpServer()).get(
        '/setting/onboarding/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(settings);
      expect(organisationService.getOnboardingSettings).toHaveBeenCalledWith(
        ORG_ID,
      );
    });
  });

  describe('PATCH /setting/onboarding/update', () => {
    it('updates the onboarding settings with a valid payload', async () => {
      const payload = {
        welcomeMessageEnabled: true,
        welcomeMessage: 'Welcome aboard!',
        defaultDurationEnabled: true,
        defaultDuration: '2 weeks',
      };
      organisationService.updateOnboardingSettings.mockResolvedValue(payload);

      const response = await request(app.getHttpServer())
        .patch('/setting/onboarding/update')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(organisationService.updateOnboardingSettings).toHaveBeenCalledWith(
        ORG_ID,
        payload,
      );
    });

    it('rejects a non-boolean enable flag', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/onboarding/update')
        .send({ welcomeMessageEnabled: 'yes' });

      expect(response.status).toBe(400);
      expect(
        organisationService.updateOnboardingSettings,
      ).not.toHaveBeenCalled();
    });
  });

  describe('POST /setting/onboarding/documentation/document/add', () => {
    it('adds a document to a valid category', async () => {
      const created = {
        id: 'national_id_card',
        label: 'National ID Card',
        selected: true,
        optional: false,
      };
      organisationService.addOnboardingDocument.mockResolvedValue(created);

      const response = await request(app.getHttpServer())
        .post('/setting/onboarding/documentation/document/add')
        .send({
          category: 'personalIdentificationDocuments',
          label: 'National ID Card',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(created);
      expect(organisationService.addOnboardingDocument).toHaveBeenCalledWith(
        ORG_ID,
        {
          category: 'personalIdentificationDocuments',
          label: 'National ID Card',
        },
      );
    });

    it('rejects an invalid category', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/onboarding/documentation/document/add')
        .send({ category: 'not_a_category', label: 'Something' });

      expect(response.status).toBe(400);
      expect(organisationService.addOnboardingDocument).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/onboarding/documentation/document/update', () => {
    it('updates a document', async () => {
      const updated = {
        id: 'national_id_card',
        label: 'National ID',
        selected: false,
        optional: true,
      };
      organisationService.updateOnboardingDocument.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch(
          '/setting/onboarding/documentation/document/update?documentId=national_id_card',
        )
        .send({ selected: false, optional: true });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updated);
      expect(
        organisationService.updateOnboardingDocument,
      ).toHaveBeenCalledWith(ORG_ID, 'national_id_card', {
        selected: false,
        optional: true,
      });
    });
  });

  describe('DELETE /setting/onboarding/documentation/document/delete', () => {
    it('deletes a document', async () => {
      organisationService.deleteOnboardingDocument.mockResolvedValue(
        'Deleted onboarding document',
      );

      const response = await request(app.getHttpServer()).delete(
        '/setting/onboarding/documentation/document/delete?documentId=national_id_card',
      );

      expect(response.status).toBe(200);
      expect(organisationService.deleteOnboardingDocument).toHaveBeenCalledWith(
        ORG_ID,
        'national_id_card',
      );
    });
  });

  describe('POST /setting/onboarding/employer-issued-document/add', () => {
    it('adds an employer-issued document', async () => {
      const created = {
        id: 'offer_letter',
        name: 'Offer letter',
        fileType: null,
        requiresSignature: false,
      };
      organisationService.addEmployerIssuedDocument.mockResolvedValue(created);

      const response = await request(app.getHttpServer())
        .post('/setting/onboarding/employer-issued-document/add')
        .send({ name: 'Offer letter' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(created);
      expect(
        organisationService.addEmployerIssuedDocument,
      ).toHaveBeenCalledWith(ORG_ID, { name: 'Offer letter' });
    });

    it('rejects a missing name', async () => {
      const response = await request(app.getHttpServer())
        .post('/setting/onboarding/employer-issued-document/add')
        .send({});

      expect(response.status).toBe(400);
      expect(
        organisationService.addEmployerIssuedDocument,
      ).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /setting/onboarding/employer-issued-document/update', () => {
    it('updates an employer-issued document', async () => {
      const updated = {
        id: 'offer_letter',
        name: 'Offer letter',
        fileType: null,
        requiresSignature: true,
      };
      organisationService.updateEmployerIssuedDocument.mockResolvedValue(
        updated,
      );

      const response = await request(app.getHttpServer())
        .patch(
          '/setting/onboarding/employer-issued-document/update?documentId=offer_letter',
        )
        .send({ requiresSignature: true });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updated);
      expect(
        organisationService.updateEmployerIssuedDocument,
      ).toHaveBeenCalledWith(ORG_ID, 'offer_letter', {
        requiresSignature: true,
      });
    });
  });

  describe('DELETE /setting/onboarding/employer-issued-document/delete', () => {
    it('deletes an employer-issued document', async () => {
      organisationService.deleteEmployerIssuedDocument.mockResolvedValue(
        'Deleted employer-issued document',
      );

      const response = await request(app.getHttpServer()).delete(
        '/setting/onboarding/employer-issued-document/delete?documentId=offer_letter',
      );

      expect(response.status).toBe(200);
      expect(
        organisationService.deleteEmployerIssuedDocument,
      ).toHaveBeenCalledWith(ORG_ID, 'offer_letter');
    });
  });
});
