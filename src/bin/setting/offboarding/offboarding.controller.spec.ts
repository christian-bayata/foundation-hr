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
});
