import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/response/app-exception';
import { EmailService } from '../../email/email.service';
import { hash } from 'bcryptjs';
import { EmployeeRepository } from './repository/employee.repository';
import { EmployeeUtility } from './repository/employee.utility';
import { EmployeeService } from './employee.service';
import { EmployeeStatus } from './enum/employee.enum';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { TokenService } from '../auth/token.service';
import { AuthUtility } from '../auth/auth.utility';

const INVITE_ID = '64f1b2c3d4e5f678901234ab';
const ORG_ID = '64f1b2c3d4e5f678901234ac';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('EmployeeService', () => {
  let service: EmployeeService;
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
  let configService: { get: jest.Mock };
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
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          FRONTEND_URL: 'http://localhost:3000',
          RESET_TOKEN_TTL: '30',
        };
        return map[key];
      }),
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
      providers: [
        EmployeeService,
        { provide: EmployeeRepository, useValue: employeeRepository },
        { provide: OrganizationRepository, useValue: organizationRepository },
        { provide: EmployeeUtility, useValue: employeeUtility },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
        { provide: TokenService, useValue: tokenService },
        { provide: AuthUtility, useValue: authUtility },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  describe('createBasicInfo', () => {
    const dto = {
      employeeType: 'employee',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      employmentDate: '2024-01-15',
    };

    it('creates a draft employee', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      employeeRepository.create.mockResolvedValue({
        ...dto,
        status: EmployeeStatus.DRAFT,
      });

      const result = await service.createBasicInfo(dto as any);

      expect(employeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeType: 'employee',
          firstName: 'John',
          lastName: 'Doe',
          middleName: null,
          employeeUniqueId: 'UNIQUEID123',
          email: 'john@example.com',
          employmentDate: expect.any(Date),
          status: EmployeeStatus.DRAFT,
        }),
      );
      expect(result.status).toBe(EmployeeStatus.DRAFT);
    });

    it('completes the basics of an invited employee when inviteId is provided', async () => {
      const invited = {
        _id: INVITE_ID,
        email: 'john@example.com',
        status: EmployeeStatus.DRAFT,
      };
      employeeRepository.findById.mockResolvedValue(invited);
      employeeRepository.updateById.mockResolvedValue({
        ...invited,
        ...dto,
        employmentDate: new Date(dto.employmentDate),
      });

      const result = await service.createBasicInfo({ ...dto, inviteId: INVITE_ID } as any);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          firstName: 'John',
          employeeType: 'employee',
          employmentDate: expect.any(Date),
        }),
      );
      expect(result.firstName).toBe('John');
    });

    it('throws 400 when the invite email does not match', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'other@example.com',
        status: EmployeeStatus.DRAFT,
      });

      await expect(
        service.createBasicInfo({ ...dto, inviteId: INVITE_ID } as any),
      ).rejects.toThrow(AppException);
    });

    it('throws 400 when the invited employee is already active', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        status: EmployeeStatus.ACTIVE,
      });

      await expect(
        service.createBasicInfo({ ...dto, inviteId: INVITE_ID } as any),
      ).rejects.toThrow(AppException);
    });

    it('throws 409 when the email already exists', async () => {
      employeeRepository.findOne.mockResolvedValue({ email: dto.email });

      await expect(service.createBasicInfo(dto as any)).rejects.toThrow(
        AppException,
      );
    });

    it('throws 409 when the create hits a duplicate key', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      employeeRepository.create.mockRejectedValue({ code: 11000 });

      await expect(service.createBasicInfo(dto as any)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('saveContractDetails', () => {
    const dto = {
      contractDuration: 'indefinite',
      jobType: 'full-time',
      workMode: 'hybrid',
      department: 'engineering',
      jobTitle: 'Backend Engineer',
    };

    it('updates contract details on a draft employee and activates it', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        ...dto,
        status: EmployeeStatus.ACTIVE,
      });

      const result = await service.saveContractDetails(INVITE_ID, dto as any);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          ...dto,
          salaryCurrency: 'NGN',
          status: EmployeeStatus.ACTIVE,
        }),
      );
      expect(result.jobTitle).toBe('Backend Engineer');
      expect(result.status).toBe(EmployeeStatus.ACTIVE);
    });

    it('throws 404 when the employee is not found', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(
        service.saveContractDetails(INVITE_ID, dto as any),
      ).rejects.toThrow(AppException);
    });

    it('throws 400 when the employee is already active', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.ACTIVE,
      });

      await expect(
        service.saveContractDetails(INVITE_ID, dto as any),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getEmployee', () => {
    it('returns the employee', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
      });

      const result = await service.getEmployee(INVITE_ID);

      expect(result).toEqual({ _id: INVITE_ID });
    });

    it('throws 404 when not found', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(service.getEmployee(INVITE_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('saveDraft', () => {
    it('persists the employee as a draft', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });

      const result = await service.saveDraft(INVITE_ID);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        { status: EmployeeStatus.DRAFT },
      );
      expect(result.status).toBe(EmployeeStatus.DRAFT);
    });

    it('throws 404 when not found', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(service.saveDraft(INVITE_ID)).rejects.toThrow(AppException);
    });
  });

  describe('inviteEmployees', () => {
    it('creates sparse employee accounts and sends invite emails', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);
      employeeRepository.create.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: 'org123',
        status: EmployeeStatus.DRAFT,
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
        name: 'Acme Inc',
      });

      const result = await service.inviteEmployees(
        ['John@Example.com'],
        'org123',
      );

      expect(employeeRepository.create).toHaveBeenCalledWith({
        email: 'john@example.com',
        organizationId: 'org123',
        status: EmployeeStatus.DRAFT,
        inviteExpiresAt: expect.any(Date),
      });
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: 'You have been invited to join',
          html: expect.stringContaining('orgSlug=acme'),
        }),
      );
      expect(result).toEqual({
        invited: [{ email: 'john@example.com', inviteId: INVITE_ID }],
        skipped: [],
        failed: [],
      });
    });

    it('deduplicates invitee emails and skips existing accounts', async () => {
      employeeRepository.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ email: 'jane@example.com' });
      employeeRepository.create.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: 'org123',
      });

      const result = await service.inviteEmployees(
        ['john@example.com', 'john@example.com', 'jane@example.com'],
        'org123',
      );

      expect(employeeRepository.create).toHaveBeenCalledTimes(1);
      expect(result.skipped).toEqual([{ email: 'jane@example.com' }]);
    });

    it('reports emails that fail to create or dispatch', async () => {
      employeeRepository.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      employeeRepository.create.mockResolvedValueOnce({
        _id: INVITE_ID,
        email: 'john@example.com',
      });
      emailService.brevoEmailDispatcher
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('SMTP down'));

      const result = await service.inviteEmployees(
        ['john@example.com', 'jane@example.com'],
        'org123',
      );

      expect(result.invited).toHaveLength(1);
      expect(result.failed).toEqual([{ email: 'jane@example.com' }]);
    });

    it('throws 400 when the organization ID is missing', async () => {
      await expect(service.inviteEmployees(['john@example.com'])).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('employeeAcceptInvite', () => {
    const dto = { email: 'John@Example.com', orgSlug: 'acme' };

    it('marks the employee as having joined the organization', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: true,
      });

      const result = (await service.employeeAcceptInvite(
        dto as any,
      )) as any;

      expect(employeeRepository.findByEmail).toHaveBeenCalledWith(
        'john@example.com',
      );
      expect(organizationRepository.findBySlug).toHaveBeenCalledWith('acme');
      expect(employeeRepository.updateById).toHaveBeenCalledWith(INVITE_ID, {
        hasJoinedOrg: true,
        organizationId: ORG_ID,
      });
      expect(result.hasJoinedOrg).toBe(true);
    });

    it('sets the organizationId when the employee has none yet', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: null,
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        hasJoinedOrg: true,
        organizationId: ORG_ID,
      });

      await service.employeeAcceptInvite(dto as any);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(INVITE_ID, {
        hasJoinedOrg: true,
        organizationId: ORG_ID,
      });
    });

    it('throws 404 when the employee does not exist', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);

      await expect(service.employeeAcceptInvite(dto as any)).rejects.toThrow(
        AppException,
      );
    });

    it('throws 404 when the organization does not exist', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
      });
      organizationRepository.findBySlug.mockResolvedValue(null);

      await expect(service.employeeAcceptInvite(dto as any)).rejects.toThrow(
        AppException,
      );
    });

    it('throws 403 when the invite does not match the employee organization', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: 'another-org',
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await expect(service.employeeAcceptInvite(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('returns the employee unchanged when already joined', async () => {
      const joined = {
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: true,
      };
      employeeRepository.findByEmail.mockResolvedValue(joined);
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      const result = await service.employeeAcceptInvite(dto as any);

      expect(result).toEqual({ hasJoinedOrg: true });
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws 410 when the invite link has expired', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() - 1000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await expect(service.employeeAcceptInvite(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws 410 when no expiry was recorded on the invite', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: false,
        inviteExpiresAt: null,
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await expect(service.employeeAcceptInvite(dto as any)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('employeeSetPassword', () => {
    const dto = {
      email: 'John@Example.com',
      password: 'supersecret',
      confirmPassword: 'supersecret',
      orgSlug: 'acme',
    };

    it('stores a hashed password and marks the employee as joined', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() + 3600000),
        onboarding: null,
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        hasJoinedOrg: true,
      });

      const result = await service.employeeSetPassword(dto as any);

      const [, update] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      expect(result).toEqual({
        email: 'john@example.com',
        isEmailVerified: true,
      });
      expect(update.password).not.toBe('supersecret');
      expect(update.hasJoinedOrg).toBe(true);
      expect(update['onboarding.startedAt']).toEqual(expect.any(Date));
    });

    it('preserves the existing onboarding start date', async () => {
      const startedAt = new Date('2024-01-01');
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        inviteExpiresAt: new Date(Date.now() + 3600000),
        onboarding: { startedAt },
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await service.employeeSetPassword(dto as any);

      const [, update] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      expect(update['onboarding.startedAt']).toEqual(startedAt);
    });

    it('throws 404 when the employee does not exist', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);

      await expect(service.employeeSetPassword(dto as any)).rejects.toThrow(
        AppException,
      );
    });

    it('throws 403 when the invite does not match the employee organization', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: 'another-org',
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await expect(service.employeeSetPassword(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws 410 when the invite link has expired', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        inviteExpiresAt: new Date(Date.now() - 1000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await expect(service.employeeSetPassword(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('employeeLogin (auth)', () => {
    const dto = { email: 'John@Example.com', password: 'secret123' };

    const joinedEmployee = (overrides: any = {}) => ({
      _id: INVITE_ID,
      email: 'john@example.com',
      password: 'stored-hash',
      organizationId: ORG_ID,
      refreshTokens: [],
      status: EmployeeStatus.ACTIVE,
      ...overrides,
    });

    it('issues a token pair and stores a hashed refresh token', async () => {
      const storedHash = await hash(dto.password, 4);
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        joinedEmployee({ password: storedHash }),
      );
      employeeRepository.updateById.mockResolvedValue({});

      const result = (await service.employeeLogin(
        dto as any,
      )) as any;

      expect(employeeRepository.findByEmailWithPassword).toHaveBeenCalledWith(
        'john@example.com',
      );
      expect(tokenService.generateTokenPair).toHaveBeenCalledWith({
        sub: INVITE_ID,
        email: 'john@example.com',
        userType: 'employee',
        organizationId: ORG_ID,
      });
      expect(authUtility.hash).toHaveBeenCalledWith('refresh-token');
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          refreshTokens: [
            {
              tokenHash: 'hashed-refresh-token',
              expiresAt: expect.any(Date),
              createdAt: expect.any(Date),
            },
          ],
        }),
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        role: ['employee'],
        organizationId: ORG_ID,
        status: EmployeeStatus.ACTIVE,
      });
    });

    it('throws 400 when the employee does not exist', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.employeeLogin(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws 400 when no password has been set', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        joinedEmployee({ password: null }),
      );

      await expect(service.employeeLogin(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws 400 when the password does not match', async () => {
      const storedHash = await hash('different-pass', 4);
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        joinedEmployee({ password: storedHash }),
      );

      await expect(service.employeeLogin(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('employeeRefresh (auth)', () => {
    it('rotates the refresh token and returns a new pair', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        refreshTokens: [
          {
            tokenHash: 'hashed-refresh-token',
            expiresAt: new Date(),
            createdAt: new Date(),
          },
        ],
      });

      const result = (await service.employeeRefresh({
        refreshToken: 'refresh-token',
      } as any)) as any;

      expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith(
        'refresh-token',
      );
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          refreshTokens: expect.arrayContaining([
            expect.objectContaining({ tokenHash: 'hashed-refresh-token' }),
          ]),
        }),
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('throws 404 when the employee does not exist', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(
        service.employeeRefresh({ refreshToken: 'refresh-token' } as any),
      ).rejects.toThrow(AppException);
    });

    it('throws 400 for an unknown refresh token', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        refreshTokens: [],
      });

      await expect(
        service.employeeRefresh({ refreshToken: 'refresh-token' } as any),
      ).rejects.toThrow(AppException);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('employeeForgotPassword (auth)', () => {
    it('stores a reset token and emails the reset link for a joined employee', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        hasJoinedOrg: true,
      });

      const result = await service.employeeForgotPassword({
        email: 'John@Example.com',
      } as any);

      expect(authUtility.randomToken).toHaveBeenCalled();
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          resetToken: expect.objectContaining({
            tokenHash: 'hashed-raw-token',
            expiresAt: expect.any(Date),
          }),
        }),
      );
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: 'Password Token Request',
          html: expect.stringContaining('token=raw-token'),
        }),
      );
      expect(result).toBe('If this email is registered, a reset link has been sent');
    });

    it('returns the generic message without emailing when the employee is unknown', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);

      const result = await service.employeeForgotPassword({
        email: 'John@Example.com',
      } as any);

      expect(employeeRepository.updateById).not.toHaveBeenCalled();
      expect(emailService.brevoEmailDispatcher).not.toHaveBeenCalled();
      expect(result).toBe('If this email is registered, a reset link has been sent');
    });

    it('does not email employees who have not joined', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        hasJoinedOrg: false,
      });

      await service.employeeForgotPassword({ email: 'John@Example.com' } as any);

      expect(emailService.brevoEmailDispatcher).not.toHaveBeenCalled();
    });
  });

  describe('employeeResetPassword (auth)', () => {
    it('stores a new hashed password and clears sessions', async () => {
      employeeRepository.findOne.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        resetToken: {
          tokenHash: 'hashed-raw-token',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const result = await service.employeeResetPassword({
        token: 'raw-token',
        password: 'newsecret123',
      } as any);

      const [, update] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      expect(update.password).not.toBe('newsecret123');
      expect(update.resetToken).toBeNull();
      expect(update.refreshTokens).toEqual([]);
      expect(result).toBe(`Password reset successful for: john@example.com`);
    });

    it('throws 400 when the reset token is invalid', async () => {
      employeeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.employeeResetPassword({
          token: 'bad-token',
          password: 'newsecret123',
        } as any),
      ).rejects.toThrow(AppException);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws 400 when the reset token has expired', async () => {
      employeeRepository.findOne.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        resetToken: {
          tokenHash: 'hashed-raw-token',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      await expect(
        service.employeeResetPassword({
          token: 'raw-token',
          password: 'newsecret123',
        } as any),
      ).rejects.toThrow(AppException);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('employeeLogout (auth)', () => {
    it('revokes a single refresh token when provided', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
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

      await service.employeeLogout(INVITE_ID, 'refresh-token');

      const [, update] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      expect(update.refreshTokens).toHaveLength(1);
      expect(update.refreshTokens[0].tokenHash).toBe('hashed-other-token');
    });

    it('clears all sessions when no refresh token is provided', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        refreshTokens: [
          {
            tokenHash: 'hashed-refresh-token',
            expiresAt: new Date(),
            createdAt: new Date(),
          },
        ],
      });

      await service.employeeLogout(INVITE_ID);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(INVITE_ID, {
        refreshTokens: [],
      });
    });

    it('throws 404 when the employee does not exist', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(service.employeeLogout(INVITE_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('onboarding (self-service)', () => {
    const EMAIL = 'john@example.com';
    const employee = (overrides: any = {}) => ({
      _id: INVITE_ID,
      email: EMAIL,
      firstName: 'John',
      lastName: 'Doe',
      hasJoinedOrg: true,
      status: EmployeeStatus.DRAFT,
      onboarding: null,
      contacts: [],
      ...overrides,
    });

    describe('getOnboarding', () => {
      it('returns the onboarding payload for an employee who has accepted', async () => {
        employeeRepository.findByEmail.mockResolvedValue(employee());

        const result = await service.getOnboarding(EMAIL);

        expect(employeeRepository.findByEmail).toHaveBeenCalledWith(EMAIL);
        expect(result).toEqual(
          expect.objectContaining({
            employeeId: INVITE_ID,
            email: EMAIL,
            completedSteps: [],
            progress: 0,
            status: EmployeeStatus.DRAFT,
          }),
        );
      });

      it('throws 403 when the invite has not been accepted', async () => {
        employeeRepository.findByEmail.mockResolvedValue(
          employee({ hasJoinedOrg: false }),
        );

        await expect(service.getOnboarding(EMAIL)).rejects.toThrow(
          AppException,
        );
      });

      it('throws 404 when the employee does not exist', async () => {
        employeeRepository.findByEmail.mockResolvedValue(null);

        await expect(service.getOnboarding(EMAIL)).rejects.toThrow(
          AppException,
        );
      });
    });

    describe('saveOnboardingBasicInformation', () => {
      it('persists personal details and marks the step complete', async () => {
        employeeRepository.findByEmail.mockResolvedValue(employee());
        employeeRepository.updateById.mockResolvedValue(employee());

        await service.saveOnboardingBasicInformation(
          EMAIL,
          {
            personalDetails: {
              phone: '08012345678',
              dateOfBirth: '1990-05-20',
              sex: 'male',
            },
          } as any,
        );

        expect(employeeRepository.updateById).toHaveBeenCalledWith(
          INVITE_ID,
          expect.objectContaining({
            'personalDetails.phone': '08012345678',
            'personalDetails.dateOfBirth': expect.any(Date),
            'personalDetails.sex': 'male',
            'onboarding.completedSteps': ['basic_information'],
            'onboarding.startedAt': expect.any(Date),
          }),
        );
      });

      it('normalizes blank values and only writes provided fields', async () => {
        employeeRepository.findByEmail.mockResolvedValue(employee());
        employeeRepository.updateById.mockResolvedValue(employee());

        await service.saveOnboardingBasicInformation(
          EMAIL,
          { homeAddress: { country: '' } } as any,
        );

        expect(employeeRepository.updateById).toHaveBeenCalledWith(
          INVITE_ID,
          expect.objectContaining({
            'homeAddress.country': null,
          }),
        );
        expect(
          (employeeRepository.updateById.mock.calls[0][1] as any)[
            'personalDetails.phone'
          ],
        ).toBeUndefined();
      });
    });

    describe('saveOnboardingAssociatedContacts', () => {
      it('replaces the contacts list and marks the step complete', async () => {
        employeeRepository.findByEmail.mockResolvedValue(employee());
        employeeRepository.updateById.mockResolvedValue(employee());

        await service.saveOnboardingAssociatedContacts(
          EMAIL,
          {
            contacts: [
              {
                type: 'emergency_contact',
                fullName: 'Jane Doe',
                phone: '09011111111',
              },
            ],
          } as any,
        );

        expect(employeeRepository.updateById).toHaveBeenCalledWith(
          INVITE_ID,
          expect.objectContaining({
            contacts: [
              {
                type: 'emergency_contact',
                fullName: 'Jane Doe',
                phone: '09011111111',
                relationship: null,
                email: null,
                address: null,
              },
            ],
            'onboarding.completedSteps': ['associated_contacts'],
          }),
        );
      });
    });

    describe('saveOnboardingFinanceInformation', () => {
      it('merges finance details and activates the employee on completion', async () => {
        employeeRepository.findByEmail.mockResolvedValue(
          employee({
            onboarding: {
              startedAt: new Date(),
              completedSteps: ['basic_information', 'associated_contacts'],
              completedAt: null,
            },
          }),
        );
        employeeRepository.updateById.mockResolvedValue(employee());

        await service.saveOnboardingFinanceInformation(
          EMAIL,
          { bankDetails: { bank: 'First bank', accountNumber: '0123456789' } } as any,
        );

        expect(employeeRepository.updateById).toHaveBeenCalledWith(
          INVITE_ID,
          expect.objectContaining({
            financeInformation: expect.objectContaining({
              bankDetails: expect.objectContaining({
                bank: 'First bank',
                accountNumber: '0123456789',
              }),
            }),
            'onboarding.completedSteps': [
              'basic_information',
              'associated_contacts',
              'finance_information',
            ],
            'onboarding.completedAt': expect.any(Date),
            status: EmployeeStatus.ACTIVE,
          }),
        );
      });

      it('preserves previously saved finance fields when sending partial data', async () => {
        employeeRepository.findByEmail.mockResolvedValue(
          employee({
            financeInformation: {
              bankDetails: { bank: 'GTCO', accountHolderName: 'John Doe' },
              pensionDetails: null,
              taxDetails: null,
            },
          }),
        );
        employeeRepository.updateById.mockResolvedValue(employee());

        await service.saveOnboardingFinanceInformation(
          EMAIL,
          { bankDetails: { bank: 'Zenith' } } as any,
        );

        expect(employeeRepository.updateById).toHaveBeenCalledWith(
          INVITE_ID,
          expect.objectContaining({
            financeInformation: expect.objectContaining({
              bankDetails: expect.objectContaining({
                bank: 'Zenith',
                accountHolderName: 'John Doe',
              }),
            }),
          }),
        );
      });

      it('throws 403 when the invite has not been accepted', async () => {
        employeeRepository.findByEmail.mockResolvedValue(
          employee({ hasJoinedOrg: false }),
        );

        await expect(
          service.saveOnboardingFinanceInformation(EMAIL, {} as any),
        ).rejects.toThrow(AppException);
      });
    });
  });
});