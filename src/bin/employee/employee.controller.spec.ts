import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailService } from '../../email/email.service';
import { hash } from 'bcryptjs';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { EmployeeRepository } from './repository/employee.repository';
import { EmployeeUtility } from './repository/employee.utility';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { TokenService } from '../auth/token.service';
import { AuthUtility } from '../auth/auth.utility';
import { EmployeeStatus } from './enum/employee.enum';

const INVITE_ID = '64f1b2c3d4e5f678901234ab';
const ORG_ID = '64f1b2c3d4e5f678901234ac';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('EmployeeController (integration)', () => {
  let app: INestApplication<App>;
  let employeeRepository: {
    create: jest.Mock<AnyPromiseFn>;
    findOne: jest.Mock<AnyPromiseFn>;
    findByEmployeeId: jest.Mock<AnyPromiseFn>;
    findByEmail: jest.Mock<AnyPromiseFn>;
    findByEmailWithPassword: jest.Mock<AnyPromiseFn>;
    findById: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
    updateByEmployeeId: jest.Mock<AnyPromiseFn>;
    paginatedQuery: jest.Mock<AnyPromiseFn>;
  };
  let emailService: { brevoEmailDispatcher: jest.Mock<AnyPromiseFn> };
  let employeeUtility: { generateUniqueId: jest.Mock };
  let organizationRepository: {
    findOrg: jest.Mock<AnyPromiseFn>;
    findBySlug: jest.Mock<AnyPromiseFn>;
  };
  let tokenService: {
    generateTokenPair: jest.Mock<AnyPromiseFn>;
    generateAccessToken: jest.Mock<AnyPromiseFn>;
    generateRefreshToken: jest.Mock<AnyPromiseFn>;
    verifyRefreshToken: jest.Mock<AnyPromiseFn>;
  };
  let authUtility: { hash: jest.Mock; randomToken: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    employeeRepository = {
      create: jest.fn<AnyPromiseFn>(),
      findOne: jest.fn<AnyPromiseFn>(),
      findByEmployeeId: jest.fn<AnyPromiseFn>(),
      findByEmail: jest.fn<AnyPromiseFn>(),
      findByEmailWithPassword: jest.fn<AnyPromiseFn>(),
      findById: jest.fn<AnyPromiseFn>(),
      updateById: jest.fn<AnyPromiseFn>(),
      updateByEmployeeId: jest.fn<AnyPromiseFn>(),
      paginatedQuery: jest.fn<AnyPromiseFn>(),
    };
    emailService = {
      brevoEmailDispatcher: jest.fn<AnyPromiseFn>().mockResolvedValue(undefined),
    };
    employeeUtility = {
      generateUniqueId: jest.fn(() => 'UNIQUEID123'),
    };
    organizationRepository = {
      findOrg: jest.fn<AnyPromiseFn>(),
      findBySlug: jest.fn<AnyPromiseFn>(),
    };
    tokenService = {
      generateTokenPair: jest
        .fn<AnyPromiseFn>()
        .mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' }),
      generateAccessToken: jest.fn<AnyPromiseFn>(),
      generateRefreshToken: jest.fn<AnyPromiseFn>(),
      verifyRefreshToken: jest
        .fn<AnyPromiseFn>()
        .mockResolvedValue({ sub: INVITE_ID }),
    };
    authUtility = {
      hash: jest.fn((value: string) => `hashed-${value}`),
      randomToken: jest.fn(() => 'raw-token'),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [
        EmployeeService,
        { provide: EmployeeRepository, useValue: employeeRepository },
        { provide: OrganizationRepository, useValue: organizationRepository },
        { provide: EmployeeUtility, useValue: employeeUtility },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:3000' },
        },
        { provide: TokenService, useValue: tokenService },
        { provide: AuthUtility, useValue: authUtility },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = {
            userId: INVITE_ID,
            email: 'admin@example.com',
            organizationId: 'org123',
          };
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

  describe('POST /employees/create/step-one', () => {
    const payload = {
      employeeType: 'employee',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      employmentDate: '2024-03-01',
    };

    it('creates a draft employee', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      employeeRepository.create.mockResolvedValue({
        ...payload,
        employmentDate: new Date(payload.employmentDate),
        status: EmployeeStatus.DRAFT,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/create/step-one')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(EmployeeStatus.DRAFT);
    });

    it('completes basic info for the employee invited via inviteId', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      const res = await request(app.getHttpServer())
        .post('/employees/create/step-one')
        .send({ ...payload, inviteId: INVITE_ID });

      expect(res.status).toBe(201);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({ firstName: 'Jane' }),
      );
    });

    it('rejects when the email does not match the invited account', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'other@example.com',
        status: EmployeeStatus.DRAFT,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/create/step-one')
        .send({ ...payload, inviteId: INVITE_ID });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/create/step-one')
        .send({ ...payload, email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid employee type', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/create/step-one')
        .send({ ...payload, employeeType: 'freelancer' });

      expect(res.status).toBe(400);
    });

    it('rejects a missing employee type', async () => {
      const { employeeType: _, ...payloadWithoutType } = payload;
      const res = await request(app.getHttpServer())
        .post('/employees/create/step-one')
        .send(payloadWithoutType);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /employees/create/step-two/:employeeId', () => {
    const payload = {
      contractDuration: 'indefinite',
      jobType: 'full_time',
      workMode: 'hybrid',
      department: 'engineering',
      jobTitle: 'Backend Engineer',
    };

    it('saves contract details and activates the employee', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        ...payload,
        salaryCurrency: 'NGN',
        status: EmployeeStatus.ACTIVE,
      });

      const res = await request(app.getHttpServer())
        .post(`/employees/create/step-two/${INVITE_ID}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({ status: EmployeeStatus.ACTIVE }),
      );
    });

    it('rejects an invalid inviteId', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/create/step-two/not-an-id')
        .send(payload);

      expect(res.status).toBe(400);
    });

    it('rejects an invalid contract duration', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/create/step-two/${INVITE_ID}`)
        .send({ ...payload, contractDuration: 'not-a-duration' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid work mode', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/create/step-two/${INVITE_ID}`)
        .send({ ...payload, workMode: 'not-a-mode' });

      expect(res.status).toBe(400);
    });

    it('rejects a missing job title', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/create/step-two/${INVITE_ID}`)
        .send({ ...payload, jobTitle: '' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid probation period', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/create/step-two/${INVITE_ID}`)
        .send({ ...payload, probationPeriod: '7 years' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /employees/retrieve/:employeeId', () => {
    it('returns the employee for the summary screen', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
      });

      const res = await request(app.getHttpServer()).get(
        `/employees/retrieve/${INVITE_ID}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('jane@example.com');
    });

    it('returns 404 for an unknown employee', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      const res = await request(app.getHttpServer()).get(
        `/employees/retrieve/${INVITE_ID}`,
      );

      expect(res.status).toBe(404);
    });
  });

  describe('POST /employees/save-draft/:employeeId', () => {
    it('saves the employee as a draft', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });

      const res = await request(app.getHttpServer()).post(
        `/employees/save-draft/${INVITE_ID}`,
      );

      expect(res.status).toBe(200);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        { status: EmployeeStatus.DRAFT },
      );
    });
  });

  describe('POST /employees/invite', () => {
    it('creates sparse employee accounts and sends invite emails', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);
      employeeRepository.create.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        organizationId: 'org123',
        status: EmployeeStatus.DRAFT,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/invite')
        .send({ invitees: ['Jane@Example.com'] });

      expect(res.status).toBe(200);
      expect(employeeRepository.create).toHaveBeenCalledWith({
        email: 'jane@example.com',
        organizationId: 'org123',
        status: EmployeeStatus.DRAFT,
        inviteExpiresAt: expect.any(Date),
      });
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalled();
      expect(res.body.data.invited).toEqual([
        { email: 'jane@example.com', inviteId: INVITE_ID },
      ]);
    });

    it('skips emails that already have an employee account', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        email: 'jane@example.com',
      });

      const res = await request(app.getHttpServer())
        .post('/employees/invite')
        .send({ invitees: ['jane@example.com'] });

      expect(res.status).toBe(200);
      expect(employeeRepository.create).not.toHaveBeenCalled();
      expect(emailService.brevoEmailDispatcher).not.toHaveBeenCalled();
      expect(res.body.data.skipped).toEqual([
        { email: 'jane@example.com' },
      ]);
    });

    it('rejects an invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/invite')
        .send({ invitees: ['not-an-email'] });

      expect(res.status).toBe(400);
    });

    it('rejects an empty invite list', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/invite')
        .send({ invitees: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /employees/invite/accept?orgSlug', () => {
    const INVITE_ORG_ID = '64f1b2c3d4e5f678901234ac';

    it('accepts the invite and marks the employee as having joined', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        organizationId: INVITE_ORG_ID,
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: INVITE_ORG_ID,
        slug: 'acme',
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        hasJoinedOrg: true,
        organizationId: INVITE_ORG_ID,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/invite/accept?orgSlug=acme')
        .send({ email: 'jane@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.hasJoinedOrg).toBe(true);
      expect(employeeRepository.findByEmail).toHaveBeenCalledWith(
        'jane@example.com',
      );
      expect(organizationRepository.findBySlug).toHaveBeenCalledWith('acme');
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({ hasJoinedOrg: true }),
      );
    });

    it('rejects an invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/invite/accept?orgSlug=acme')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('returns 404 when the employee is unknown', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/employees/invite/accept?orgSlug=acme')
        .send({ email: 'jane@example.com' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /employees/invite/set-password?orgSlug', () => {
    const INVITE_ORG_ID = '64f1b2c3d4e5f678901234ac';

    it('stores a hashed password and marks the employee as joined', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        organizationId: INVITE_ORG_ID,
        inviteExpiresAt: new Date(Date.now() + 3600000),
        onboarding: null,
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: INVITE_ORG_ID,
        slug: 'acme',
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        hasJoinedOrg: true,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/invite/set-password?orgSlug=acme')
        .send({
          email: 'jane@example.com',
          password: 'supersecret',
          confirmPassword: 'supersecret',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        email: 'jane@example.com',
        isEmailVerified: true,
      });
      expect(employeeRepository.findByEmail).toHaveBeenCalledWith(
        'jane@example.com',
      );
      expect(organizationRepository.findBySlug).toHaveBeenCalledWith('acme');
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          hasJoinedOrg: true,
          password: expect.any(String),
        }),
      );
    });

    it('rejects an invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/invite/set-password?orgSlug=acme')
        .send({
          email: 'not-an-email',
          password: 'supersecret',
          confirmPassword: 'supersecret',
        });

      expect(res.status).toBe(400);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('rejects a password shorter than 8 characters', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/invite/set-password?orgSlug=acme')
        .send({
          email: 'jane@example.com',
          password: 'short',
          confirmPassword: 'short',
        });

      expect(res.status).toBe(400);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('returns 404 when the employee is unknown', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/employees/invite/set-password?orgSlug=acme')
        .send({
          email: 'jane@example.com',
          password: 'supersecret',
          confirmPassword: 'supersecret',
        });

      expect(res.status).toBe(404);
    });

    it('returns 403 when the invite does not match the employee organization', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        organizationId: 'another-org',
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: INVITE_ORG_ID,
        slug: 'acme',
      });

      const res = await request(app.getHttpServer())
        .post('/employees/invite/set-password?orgSlug=acme')
        .send({
          email: 'jane@example.com',
          password: 'supersecret',
          confirmPassword: 'supersecret',
        });

      expect(res.status).toBe(403);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('returns 410 when the invite link has expired', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        organizationId: INVITE_ORG_ID,
        inviteExpiresAt: new Date(Date.now() - 1000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: INVITE_ORG_ID,
        slug: 'acme',
      });

      const res = await request(app.getHttpServer())
        .post('/employees/invite/set-password?orgSlug=acme')
        .send({
          email: 'jane@example.com',
          password: 'supersecret',
          confirmPassword: 'supersecret',
        });

      expect(res.status).toBe(410);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('POST /employees/login', () => {
    it('returns a token pair for valid credentials', async () => {
      const hashedPassword = await hash('secret123', 4);
      employeeRepository.findByEmailWithPassword.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        password: hashedPassword,
        organizationId: ORG_ID,
        refreshTokens: [],
        status: EmployeeStatus.ACTIVE,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/login')
        .send({ email: 'jane@example.com', password: 'secret123' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe('access-token');
      expect(res.body.data.role).toEqual(['employee']);
      expect(employeeRepository.findByEmailWithPassword).toHaveBeenCalledWith(
        'jane@example.com',
      );
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({ refreshTokens: expect.any(Array) }),
      );
    });

    it('rejects invalid credentials', async () => {
      const hashedPassword = await hash('secret123', 4);
      employeeRepository.findByEmailWithPassword.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        password: hashedPassword,
        organizationId: ORG_ID,
        refreshTokens: [],
        status: EmployeeStatus.ACTIVE,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/login')
        .send({ email: 'jane@example.com', password: 'wrong-password' });

      expect(res.status).toBe(400);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('rejects an account with no password set', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        password: null,
        refreshTokens: [],
      });

      const res = await request(app.getHttpServer())
        .post('/employees/login')
        .send({ email: 'jane@example.com', password: 'secret123' });

      expect(res.status).toBe(400);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('rejects an invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/login')
        .send({ email: 'not-an-email', password: 'secret123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /employees/forgot-password', () => {
    it('sends a reset email for a joined employee', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: true,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/forgot-password')
        .send({ email: 'jane@example.com' });

      expect(res.status).toBe(200);
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@example.com',
          subject: 'Password Token Request',
          html: expect.stringContaining('token=raw-token'),
        }),
      );
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          resetToken: expect.objectContaining({
            tokenHash: 'hashed-raw-token',
          }),
        }),
      );
    });

    it('returns a generic message without emailing unknown accounts', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/employees/forgot-password')
        .send({ email: 'jane@example.com' });

      expect(res.status).toBe(200);
      expect(emailService.brevoEmailDispatcher).not.toHaveBeenCalled();
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('does not email un-accepted invitees', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        hasJoinedOrg: false,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/forgot-password')
        .send({ email: 'jane@example.com' });

      expect(res.status).toBe(200);
      expect(emailService.brevoEmailDispatcher).not.toHaveBeenCalled();
    });

    it('rejects an invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/forgot-password')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /employees/reset-password?token', () => {
    it('resets the password and clears sessions', async () => {
      employeeRepository.findOne.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        resetToken: {
          tokenHash: 'hashed-raw-token',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const res = await request(app.getHttpServer())
        .post('/employees/reset-password?token=raw-token')
        .send({ password: 'newsecret123' });

      expect(res.status).toBe(200);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          password: expect.any(String),
          resetToken: null,
          refreshTokens: [],
        }),
      );
    });

    it('rejects an invalid token', async () => {
      employeeRepository.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/employees/reset-password?token=bad-token')
        .send({ password: 'newsecret123' });

      expect(res.status).toBe(400);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      employeeRepository.findOne.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        resetToken: {
          tokenHash: 'hashed-raw-token',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const res = await request(app.getHttpServer())
        .post('/employees/reset-password?token=raw-token')
        .send({ password: 'newsecret123' });

      expect(res.status).toBe(400);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('POST /employees/refresh', () => {
    it('rotates the token pair', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        organizationId: ORG_ID,
        refreshTokens: [
          {
            tokenHash: 'hashed-refresh-token',
            expiresAt: new Date(),
            createdAt: new Date(),
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/employees/refresh')
        .send({ refreshToken: 'refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe('access-token');
      expect(res.body.data.refreshToken).toBe('refresh-token');
    });

    it('rejects an unknown refresh token', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        refreshTokens: [],
      });

      const res = await request(app.getHttpServer())
        .post('/employees/refresh')
        .send({ refreshToken: 'refresh-token' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /employees/logout', () => {
    it('revokes all sessions when no refresh token is provided', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        refreshTokens: [
          {
            tokenHash: 'hashed-refresh-token',
            expiresAt: new Date(),
            createdAt: new Date(),
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/employees/logout')
        .send({});

      expect(res.status).toBe(200);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({ refreshTokens: [] }),
      );
    });

    it('revokes a single refresh token when provided', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        refreshTokens: [
          {
            tokenHash: 'hashed-refresh-token',
            expiresAt: new Date(),
            createdAt: new Date(),
          },
          {
            tokenHash: 'hashed-other-token',
            expiresAt: new Date(),
            createdAt: new Date(),
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/employees/logout')
        .send({ refreshToken: 'refresh-token' });

      expect(res.status).toBe(200);
      const [, update] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      expect(update.refreshTokens).toHaveLength(1);
      expect(update.refreshTokens[0].tokenHash).toBe('hashed-other-token');
    });
  });

  describe('employee onboarding (authenticated)', () => {
    const EMAIL = 'admin@example.com';

    it('GET /employees/onboarding/retrieve returns the onboarding payload', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: EMAIL,
        hasJoinedOrg: true,
        status: EmployeeStatus.DRAFT,
        onboarding: null,
        contacts: [],
      });

      const res = await request(app.getHttpServer()).get(
        '/employees/onboarding/retrieve',
      );

      expect(res.status).toBe(200);
      expect(res.body.data.employeeId).toBe(INVITE_ID);
      expect(res.body.data.progress).toBe(0);
    });

    it('GET /employees/onboarding/retrieve returns 403 when invite not accepted', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: EMAIL,
        hasJoinedOrg: false,
      });

      const res = await request(app.getHttpServer()).get(
        '/employees/onboarding/retrieve',
      );

      expect(res.status).toBe(403);
    });

    it('POST /employees/onboarding/basic-information saves personal details', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: EMAIL,
        hasJoinedOrg: true,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        personalDetails: { phone: '08012345678' },
      });

      const res = await request(app.getHttpServer())
        .post('/employees/onboarding/basic-information')
        .send({ personalDetails: { phone: '08012345678', sex: 'female' } });

      expect(res.status).toBe(200);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          'personalDetails.phone': '08012345678',
          'personalDetails.sex': 'female',
        }),
      );
    });

    it('POST /employees/onboarding/basic-information rejects an invalid sex', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/onboarding/basic-information')
        .send({ personalDetails: { sex: 'unknown' } });

      expect(res.status).toBe(400);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('POST /employees/onboarding/basic-information rejects an invalid date of birth', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/onboarding/basic-information')
        .send({ personalDetails: { dateOfBirth: 'not-a-date' } });

      expect(res.status).toBe(400);
    });

    it('POST /employees/onboarding/associated-contacts saves the contact list', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: EMAIL,
        hasJoinedOrg: true,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        contacts: [],
      });

      const res = await request(app.getHttpServer())
        .post('/employees/onboarding/associated-contacts')
        .send({ contacts: [{ type: 'guarantor', fullName: 'Jane Doe' }] });

      expect(res.status).toBe(200);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          contacts: [
            expect.objectContaining({ type: 'guarantor', fullName: 'Jane Doe' }),
          ],
        }),
      );
    });

    it('POST /employees/onboarding/associated-contacts rejects an invalid contact type', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/onboarding/associated-contacts')
        .send({ contacts: [{ type: 'boss' }] });

      expect(res.status).toBe(400);
    });

    it('POST /employees/onboarding/finance-information saves finance details and finalizes', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: EMAIL,
        hasJoinedOrg: true,
        onboarding: {
          completedSteps: ['basic_information', 'associated_contacts'],
        },
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.ACTIVE,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/onboarding/finance-information')
        .send({ bankDetails: { bank: 'Kuda', accountNumber: '12345' } });

      expect(res.status).toBe(200);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          status: EmployeeStatus.ACTIVE,
        }),
      );
    });

    it('POST /employees/onboarding/finance-information rejects an invalid voluntary contribution', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/onboarding/finance-information')
        .send({ pensionDetails: { voluntaryContribution: 'maybe' } });

      expect(res.status).toBe(400);
    });
  });
});