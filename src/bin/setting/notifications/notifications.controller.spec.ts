import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { NotificationsController } from './notifications.controller';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('NotificationsController (integration)', () => {
  let app: INestApplication<App>;
  let organisationService: {
    getNotifications: jest.Mock<AnyPromiseFn>;
    updateNotifications: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organisationService = {
      getNotifications: jest.fn(),
      updateNotifications: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [NotificationsController],
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

  describe('GET /setting/notifications/retrieve', () => {
    it('retrieves the organization notification preferences', async () => {
      const preferences = {
        newsAndUpdates: true,
        remindersAndEvents: true,
        promotionsAndOffers: false,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        leaveAndAttendance: true,
        deadlineNotification: true,
      };
      organisationService.getNotifications.mockResolvedValue(preferences);

      const response = await request(app.getHttpServer()).get(
        '/setting/notifications/retrieve',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(preferences);
      expect(organisationService.getNotifications).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('PATCH /setting/notifications/update', () => {
    it('updates the notification preferences with a valid payload', async () => {
      const payload = { promotionsAndOffers: true, smsNotifications: true };
      const updated = {
        newsAndUpdates: true,
        remindersAndEvents: true,
        promotionsAndOffers: true,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: true,
        leaveAndAttendance: true,
        deadlineNotification: true,
      };
      organisationService.updateNotifications.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/setting/notifications/update')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toEqual(updated);
      expect(organisationService.updateNotifications).toHaveBeenCalledWith(
        ORG_ID,
        payload,
      );
    });

    it('rejects a payload with a non-boolean flag', async () => {
      const response = await request(app.getHttpServer())
        .patch('/setting/notifications/update')
        .send({ newsAndUpdates: 'yes' });

      expect(response.status).toBe(400);
      expect(organisationService.updateNotifications).not.toHaveBeenCalled();
    });
  });
});
