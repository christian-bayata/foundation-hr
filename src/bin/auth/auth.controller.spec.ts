import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { AuthUtility } from './auth.utility';
import { UserRepository } from './repository/user.repository';
import { EmailService } from '../../email/email.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { SettingService } from '../setting/setting.service';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { SystemRole } from './enum/role.enum';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

const EMAIL = 'john@example.com';

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let authService: {
    signIn: jest.Mock<AnyPromiseFn>;
    refresh: jest.Mock<AnyPromiseFn>;
    forgotPassword: jest.Mock<AnyPromiseFn>;
    resetPassword: jest.Mock<AnyPromiseFn>;
    logout: jest.Mock<AnyPromiseFn>;
    userProfile: jest.Mock<AnyPromiseFn>;
  };
  let authenticatedUser: Record<string, any>;

  beforeEach(async () => {
    jest.clearAllMocks();

    authService = {
      signIn: jest.fn<AnyPromiseFn>().mockResolvedValue({}),
      refresh: jest.fn<AnyPromiseFn>().mockResolvedValue({}),
      forgotPassword: jest.fn<AnyPromiseFn>().mockResolvedValue('sent'),
      resetPassword: jest.fn<AnyPromiseFn>().mockResolvedValue('reset'),
      logout: jest.fn<AnyPromiseFn>().mockResolvedValue('Logged out successfully'),
      userProfile: jest.fn<AnyPromiseFn>().mockResolvedValue({}),
    };
    authenticatedUser = {
      userId: '64f1b2c3d4e5f678901234ac',
      email: EMAIL,
      principalType: 'both',
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TokenService, useValue: {} },
        { provide: AuthUtility, useValue: {} },
        { provide: UserRepository, useValue: {} },
        { provide: EmployeeRepository, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: OrganizationRepository, useValue: {} },
        { provide: SettingService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          if (!req.headers['authorization']) return true;
          req.user = authenticatedUser;
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('returns employeeAuth and adminAuth for a dual-identity person', async () => {
      authService.signIn.mockResolvedValue({
        employeeAuth: {
          accessToken: 'a',
          refreshToken: 'r',
          role: [SystemRole.EMPLOYEE],
          employeeId: 'emp-1',
        },
        adminAuth: {
          accessToken: 'a',
          refreshToken: 'r',
          role: [SystemRole.COMPANY_OWNER],
          adminUserId: 'adm-1',
        },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: EMAIL, password: 'secret123' })
        .expect(200);

      expect(res.body.status).toBe(true);
      expect(res.body.data.employeeAuth.role).toEqual([SystemRole.EMPLOYEE]);
      expect(res.body.data.adminAuth.role).toEqual([SystemRole.COMPANY_OWNER]);
    });

    it('returns only employeeAuth for an employee-only person', async () => {
      authService.signIn.mockResolvedValue({
        employeeAuth: { accessToken: 'a', refreshToken: 'r' },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: EMAIL, password: 'secret123' })
        .expect(200);

      expect(res.body.data.employeeAuth).toBeDefined();
      expect(res.body.data.adminAuth).toBeUndefined();
    });

    it('rejects a missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'secret123' })
        .expect(400);
      expect(authService.signIn).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/refresh', () => {
    it('passes the refresh token through', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'old-refresh' })
        .expect(200);

      expect(res.body.data.accessToken).toBe('new-access');
      expect(authService.refresh).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'old-refresh' }),
      );
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('returns the generic message', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: EMAIL })
        .expect(200);

      expect(res.body.message).toBe('Reset link sent');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('lifts the token from the query string into the dto', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password?token=raw-token')
        .send({ password: 'brandnew1' })
        .expect(200);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'raw-token', password: 'brandnew1' }),
      );
    });

    it('rejects a password below the minimum length', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password?token=raw-token')
        .send({ password: 'short' })
        .expect(400);
      expect(authService.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/me', () => {
    it('returns both data blocks', async () => {
      authService.userProfile.mockResolvedValue({
        employeeData: { email: EMAIL, status: 'active' },
        adminData: { email: EMAIL, role: [SystemRole.COMPANY_OWNER] },
      });

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(res.body.data.employeeData.status).toBe('active');
      expect(res.body.data.adminData.role).toEqual([SystemRole.COMPANY_OWNER]);
      expect(authService.userProfile).toHaveBeenCalledWith(EMAIL);
    });

    it('resolves the profile by email rather than by id', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(authService.userProfile).toHaveBeenCalledWith(
        authenticatedUser.email,
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes by email and forwards the optional refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer token')
        .send({ refreshToken: 'goodbye' })
        .expect(200);

      expect(authService.logout).toHaveBeenCalledWith(EMAIL, 'goodbye');
    });

    it('clears all sessions when no refresh token is sent', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer token')
        .send({})
        .expect(200);

      expect(authService.logout).toHaveBeenCalledWith(EMAIL, undefined);
    });
  });
});