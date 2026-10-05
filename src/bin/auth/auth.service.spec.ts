import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/response/app-exception';
import { EmailService } from '../../email/email.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { AuthUtility } from './auth.utility';
import { UserRepository } from './repository/user.repository';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { SettingService } from '../setting/setting.service';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { PrincipalType } from './enum/principal-type.enum';
import { SystemRole } from './enum/role.enum';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(async (value: string) => `hashed:${value}`),
  compare: jest.fn(
    async (plain: string, hashed: string) => hashed === `hashed:${plain}`,
  ),
}));

type AnyPromiseFn = (...args: any[]) => Promise<any>;

const EMPLOYEE_ID = '64f1b2c3d4e5f678901234ab';
const ADMIN_ID = '64f1b2c3d4e5f678901234ac';
const ORG_ID = '64f1b2c3d4e5f678901234ad';
const EMAIL = 'john@example.com';

describe('AuthService (unified principal flow)', () => {
  let service: any;
  let userRepository: {
    findUser: jest.Mock<AnyPromiseFn>;
    createUser: jest.Mock<AnyPromiseFn>;
    updateUser: jest.Mock<AnyPromiseFn>;
  };
  let employeeRepository: {
    findByEmailWithPassword: jest.Mock<AnyPromiseFn>;
    findByEmail: jest.Mock<AnyPromiseFn>;
    findOne: jest.Mock<AnyPromiseFn>;
    findById: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
  };
  let tokenService: {
    generateTokenPair: jest.Mock<AnyPromiseFn>;
    generateAccessToken: jest.Mock<AnyPromiseFn>;
    generateRefreshToken: jest.Mock<AnyPromiseFn>;
    verifyRefreshToken: jest.Mock<AnyPromiseFn>;
  };
  let authUtility: {
    hash: jest.Mock<(value: string) => string>;
    randomToken: jest.Mock<() => string>;
  };
  let emailService: { brevoEmailDispatcher: jest.Mock<AnyPromiseFn> };
  let organizationRepository: { findOrg: jest.Mock<AnyPromiseFn> };
  let settingService: {
    getUserSystemRoles: jest.Mock<AnyPromiseFn>;
    findOrganizationForUser: jest.Mock<AnyPromiseFn>;
  };
  let configService: { get: jest.Mock<(key: string) => string | undefined> };

  const employee = (overrides: Record<string, any> = {}) => ({
    _id: { toString: () => EMPLOYEE_ID },
    email: EMAIL,
    firstName: 'John',
    lastName: 'Doe',
    status: 'active',
    organizationId: ORG_ID,
    hasJoinedOrg: true,
    isEmailVerified: true,
    password: `hashed:secret123`,
    refreshTokens: [],
    onboarding: { completedSteps: [] },
    toObject: () => ({
      _id: EMPLOYEE_ID,
      email: EMAIL,
      firstName: 'John',
      status: 'active',
      password: `hashed:secret123`,
      refreshTokens: [],
      resetToken: { tokenHash: 'leak', expiresAt: new Date() },
      __v: 0,
    }),
    ...overrides,
  });

  const adminUser = (overrides: Record<string, any> = {}) => ({
    _id: { toString: () => ADMIN_ID },
    email: EMAIL,
    firstName: 'John',
    lastName: 'Doe',
    isEmailVerified: true,
    userType: 'company',
    password: `hashed:secret123`,
    refreshTokens: [],
    toObject: () => ({
      _id: ADMIN_ID,
      email: EMAIL,
      firstName: 'John',
      isEmailVerified: true,
      userType: 'company',
      password: `hashed:secret123`,
      refreshTokens: [],
      resetToken: { tokenHash: 'leak', expiresAt: new Date() },
      emailVerificationToken: { tokenHash: 'leak', expiresAt: new Date() },
      __v: 0,
    }),
    ...overrides,
  });

  const organization = () => ({
    _id: { toString: () => ORG_ID },
    name: 'Acme',
    products: ['hr'],
    topInterest: 'hr',
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    userRepository = {
      findUser: jest.fn<AnyPromiseFn>().mockResolvedValue(null),
      createUser: jest.fn<AnyPromiseFn>(),
      updateUser: jest.fn<AnyPromiseFn>().mockResolvedValue(null),
    };
    employeeRepository = {
      findByEmailWithPassword: jest.fn<AnyPromiseFn>().mockResolvedValue(null),
      findByEmail: jest.fn<AnyPromiseFn>().mockResolvedValue(null),
      findOne: jest.fn<AnyPromiseFn>().mockResolvedValue(null),
      findById: jest.fn<AnyPromiseFn>().mockResolvedValue(null),
      updateById: jest.fn<AnyPromiseFn>().mockResolvedValue(null),
    };
    tokenService = {
      generateTokenPair: jest
        .fn<AnyPromiseFn>()
        .mockResolvedValue({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      generateAccessToken: jest.fn<AnyPromiseFn>(),
      generateRefreshToken: jest.fn<AnyPromiseFn>(),
      verifyRefreshToken: jest.fn<AnyPromiseFn>(),
    };
    authUtility = {
      hash: jest.fn<(value: string) => string>((value) => `hashed-${value}`),
      randomToken: jest.fn<() => string>(() => 'raw-reset-token'),
    };
    emailService = {
      brevoEmailDispatcher: jest.fn<AnyPromiseFn>().mockResolvedValue(undefined),
    };
    organizationRepository = {
      findOrg: jest.fn<AnyPromiseFn>().mockResolvedValue(organization()),
    };
    settingService = {
      getUserSystemRoles: jest
        .fn<AnyPromiseFn>()
        .mockResolvedValue([SystemRole.COMPANY_OWNER]),
      findOrganizationForUser: jest.fn<AnyPromiseFn>().mockResolvedValue(ORG_ID),
    };
    configService = {
      get: jest.fn<(key: string) => string | undefined>((key) => {
        const map: Record<string, string> = {
          FRONTEND_URL: 'http://localhost:3000',
          RESET_TOKEN_TTL: '30',
          EMAIL_USER: 'no-reply@foundationhr.com',
        };
        return map[key];
      }),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: userRepository },
        { provide: EmployeeRepository, useValue: employeeRepository },
        { provide: TokenService, useValue: tokenService },
        { provide: AuthUtility, useValue: authUtility },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
        { provide: OrganizationRepository, useValue: organizationRepository },
        { provide: SettingService, useValue: settingService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('signIn', () => {
    it('returns only employeeAuth for an employee-only person', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(employee());

      const result: any = await service.signIn({
        email: 'John@Example.com',
        password: 'secret123',
      });

      expect(result.employeeAuth).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        role: [SystemRole.EMPLOYEE],
        organizationId: ORG_ID,
        status: 'active',
        employeeId: EMPLOYEE_ID,
      });
      expect(result.adminAuth).toBeUndefined();
    });

    it('returns only adminAuth for an admin-only person', async () => {
      userRepository.findUser.mockResolvedValue(adminUser());

      const result: any = await service.signIn({
        email: EMAIL,
        password: 'secret123',
      });

      expect(result.employeeAuth).toBeUndefined();
      expect(result.adminAuth).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        role: [SystemRole.COMPANY_OWNER],
        organizationId: ORG_ID,
        adminUserId: ADMIN_ID,
      });
    });

    it('returns both blocks sharing one token pair for a dual-identity person', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(employee());
      userRepository.findUser.mockResolvedValue(adminUser());

      const result: any = await service.signIn({
        email: EMAIL,
        password: 'secret123',
      });

      expect(result.employeeAuth).toBeDefined();
      expect(result.adminAuth).toBeDefined();
      expect(result.employeeAuth.accessToken).toBe(result.adminAuth.accessToken);
      expect(result.employeeAuth.refreshToken).toBe(
        result.adminAuth.refreshToken,
      );
      expect(result.employeeAuth.role).toEqual([SystemRole.EMPLOYEE]);
      expect(result.adminAuth.role).toEqual([SystemRole.COMPANY_OWNER]);
    });

    it('stamps the admin user id as sub and both ids as claims', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(employee());
      userRepository.findUser.mockResolvedValue(adminUser());

      await service.signIn({ email: EMAIL, password: 'secret123' });

      const [payload] = tokenService.generateTokenPair.mock.calls[0] as [
        Record<string, any>,
      ];
      expect(payload.sub).toBe(ADMIN_ID);
      expect(payload.principalType).toBe(PrincipalType.BOTH);
      expect(payload.employeeId).toBe(EMPLOYEE_ID);
      expect(payload.adminUserId).toBe(ADMIN_ID);
    });

    it('stamps the employee id as sub when there is no admin record', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(employee());

      await service.signIn({ email: EMAIL, password: 'secret123' });

      const [payload] = tokenService.generateTokenPair.mock.calls[0] as [
        Record<string, any>,
      ];
      expect(payload.sub).toBe(EMPLOYEE_ID);
      expect(payload.principalType).toBe(PrincipalType.EMPLOYEE);
    });

    it('stores the refresh hash on both records for a dual-identity person', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(employee());
      userRepository.findUser.mockResolvedValue(adminUser());

      await service.signIn({ email: EMAIL, password: 'secret123' });

      const [, employeeUpdate] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      const [where, adminUpdate] = userRepository.updateUser.mock.calls[0] as [
        Record<string, any>,
        Record<string, any>,
      ];
      expect(employeeUpdate.refreshTokens[0].tokenHash).toBe(
        'hashed-refresh-token',
      );
      expect(adminUpdate.refreshTokens[0].tokenHash).toBe(
        'hashed-refresh-token',
      );
      expect(where).toEqual({ _id: ADMIN_ID });
    });

    it('fails without consulting the admin record when the employee password mismatches', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        employee({ password: 'hashed:someemployeepassword' }),
      );
      userRepository.findUser.mockResolvedValue(adminUser());

      await expect(
        service.signIn({ email: EMAIL, password: 'secret123' }),
      ).rejects.toThrow(AppException);

      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
      expect(userRepository.updateUser).not.toHaveBeenCalled();
    });

    it('blocks sign-in when only the admin email is unverified', async () => {
      userRepository.findUser.mockResolvedValue(
        adminUser({ isEmailVerified: false }),
      );

      await expect(
        service.signIn({ email: EMAIL, password: 'secret123' }),
      ).rejects.toThrow(AppException);
    });

    it('does not require email verification for an employee-only person', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        employee({ isEmailVerified: false }),
      );

      const result: any = await service.signIn({
        email: EMAIL,
        password: 'secret123',
      });
      expect(result.employeeAuth).toBeDefined();
    });

    it('rejects when the employee has no password set', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        employee({ password: null }),
      );

      await expect(
        service.signIn({ email: EMAIL, password: 'secret123' }),
      ).rejects.toThrow(AppException);
    });

    it('throws 404 when no record exists for the email', async () => {
      await expect(
        service.signIn({ email: EMAIL, password: 'secret123' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('refresh', () => {
    const dto = { refreshToken: 'old-refresh-token' };

    it('rotates the token hash across both records', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: ADMIN_ID,
        email: EMAIL,
        principalType: PrincipalType.BOTH,
      });
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        employee({
          refreshTokens: [{ tokenHash: 'hashed-old-refresh-token' }],
        }),
      );
      userRepository.findUser.mockResolvedValue(
        adminUser({
          refreshTokens: [{ tokenHash: 'hashed-old-refresh-token' }],
        }),
      );

      const result: any = await service.refresh(dto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const [, employeeUpdate] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      const [, adminUpdate] = userRepository.updateUser.mock.calls[0] as [
        Record<string, any>,
        Record<string, any>,
      ];
      for (const update of [employeeUpdate, adminUpdate]) {
        expect(update.refreshTokens).toHaveLength(1);
        expect(update.refreshTokens[0].tokenHash).toBe('hashed-refresh-token');
      }
    });

    it('preserves organizationId for a non-owner admin', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: ADMIN_ID,
        email: EMAIL,
        principalType: PrincipalType.ADMIN,
      });
      organizationRepository.findOrg.mockResolvedValue(null);
      userRepository.findUser.mockResolvedValue(
        adminUser({ refreshTokens: [{ tokenHash: 'hashed-old-refresh-token' }] }),
      );

      await service.refresh(dto);

      const [payload] = tokenService.generateTokenPair.mock.calls[0] as [
        Record<string, any>,
      ];
      expect(payload.organizationId).toBe(ORG_ID);
    });

    it('rejects a token whose hash is on no record', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: ADMIN_ID,
        email: EMAIL,
        principalType: PrincipalType.BOTH,
      });
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        employee({ refreshTokens: [] }),
      );
      userRepository.findUser.mockResolvedValue(
        adminUser({ refreshTokens: [] }),
      );

      await expect(service.refresh(dto)).rejects.toThrow(AppException);
      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('writes the same reset token to both records and emails once', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(employee());
      userRepository.findUser.mockResolvedValue(adminUser());

      const result: any = await service.forgotPassword({ email: EMAIL });

      expect(result).toBe(
        'If this email is registered, a reset link has been sent',
      );

      const [, employeeUpdate] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      const [, adminUpdate] = userRepository.updateUser.mock.calls[0] as [
        Record<string, any>,
        Record<string, any>,
      ];
      expect(employeeUpdate.resetToken.tokenHash).toBe(
        'hashed-raw-reset-token',
      );
      expect(adminUpdate.resetToken.tokenHash).toBe('hashed-raw-reset-token');
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalledTimes(1);
    });

    it('sends the link for an eligible employee-only person', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        employee({ hasJoinedOrg: true }),
      );

      await service.forgotPassword({ email: EMAIL });

      expect(userRepository.updateUser).not.toHaveBeenCalled();
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalledTimes(1);
    });

    it('sends nothing when neither record is eligible', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        employee({ hasJoinedOrg: false }),
      );
      userRepository.findUser.mockResolvedValue(
        adminUser({ isEmailVerified: false }),
      );

      const result: any = await service.forgotPassword({ email: EMAIL });

      expect(result).toBe(
        'If this email is registered, a reset link has been sent',
      );
      expect(emailService.brevoEmailDispatcher).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const dto = { token: 'raw-reset-token', password: 'brandnew123' };

    it('writes the same password hash to both records and clears sessions', async () => {
      employeeRepository.findOne.mockResolvedValue({
        email: EMAIL,
        resetToken: { tokenHash: 'hashed-raw-reset-token', expiresAt: null },
      });
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        employee({ refreshTokens: [{ tokenHash: 'old' }] }),
      );
      userRepository.findUser.mockResolvedValue(
        adminUser({ refreshTokens: [{ tokenHash: 'old' }] }),
      );

      const result: any = await service.resetPassword(dto);

      expect(result).toBe(`Password reset successful for: ${EMAIL}`);

      const [, employeeUpdate] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      const [, adminUpdate] = userRepository.updateUser.mock.calls[0] as [
        Record<string, any>,
        Record<string, any>,
      ];
      expect(employeeUpdate.password).toBe('hashed:brandnew123');
      expect(adminUpdate.password).toBe(employeeUpdate.password);
      for (const update of [employeeUpdate, adminUpdate]) {
        expect(update.resetToken).toBeNull();
        expect(update.refreshTokens).toEqual([]);
      }
    });

    it('resolves the token held on the admin record alone', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      userRepository.findUser.mockResolvedValue(
        adminUser({
          resetToken: {
            tokenHash: 'hashed-raw-reset-token',
            expiresAt: null,
          },
        }),
      );

      await service.resetPassword(dto);

      const [, adminUpdate] = userRepository.updateUser.mock.calls[0] as [
        Record<string, any>,
        Record<string, any>,
      ];
      expect(adminUpdate.password).toBe('hashed:brandnew123');
    });

    it('rejects an unknown token', async () => {
      await expect(service.resetPassword(dto)).rejects.toThrow(AppException);
    });

    it('rejects an expired token', async () => {
      employeeRepository.findOne.mockResolvedValue({
        email: EMAIL,
        resetToken: {
          tokenHash: 'hashed-raw-reset-token',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(AppException);
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('userProfile', () => {
    it('returns both blocks for a dual-identity person', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(employee());
      userRepository.findUser.mockResolvedValue(adminUser());

      const result: any = await service.userProfile('John@Example.com');

      expect(result.employeeData).toMatchObject({ email: EMAIL, firstName: 'John' });
      expect(result.adminData).toMatchObject({
        email: EMAIL,
        role: [SystemRole.COMPANY_OWNER],
      });
      expect(result.adminData.orgDetails).toMatchObject({ name: 'Acme' });
    });

    it('omits adminData for an employee-only person', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(employee());

      const result: any = await service.userProfile(EMAIL);

      expect(result.employeeData).toBeDefined();
      expect(result.adminData).toBeUndefined();
    });

    it('omits employeeData for an admin-only person', async () => {
      userRepository.findUser.mockResolvedValue(adminUser());

      const result: any = await service.userProfile(EMAIL);

      expect(result.employeeData).toBeUndefined();
      expect(result.adminData).toBeDefined();
    });

    it('strips passwords, sessions and token hashes from both blocks', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(employee());
      userRepository.findUser.mockResolvedValue(adminUser());

      const result: any = await service.userProfile(EMAIL);

      expect(result.employeeData).not.toHaveProperty('password');
      expect(result.employeeData).not.toHaveProperty('refreshTokens');
      expect(result.employeeData).not.toHaveProperty('resetToken');
      expect(result.adminData).not.toHaveProperty('password');
      expect(result.adminData).not.toHaveProperty('refreshTokens');
      expect(result.adminData).not.toHaveProperty('resetToken');
      expect(result.adminData).not.toHaveProperty('emailVerificationToken');
    });

    it('throws 404 when no record matches', async () => {
      await expect(service.userProfile(EMAIL)).rejects.toThrow(AppException);
    });
  });

  describe('logout', () => {
    it('clears sessions on both records when no token is supplied', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        employee({ refreshTokens: [{ tokenHash: 'a' }] }),
      );
      userRepository.findUser.mockResolvedValue(
        adminUser({ refreshTokens: [{ tokenHash: 'a' }] }),
      );

      const result: any = await service.logout(EMAIL);

      expect(result).toBe('Logged out successfully');
      const [, employeeUpdate] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      const [, adminUpdate] = userRepository.updateUser.mock.calls[0] as [
        Record<string, any>,
        Record<string, any>,
      ];
      expect(employeeUpdate.refreshTokens).toEqual([]);
      expect(adminUpdate.refreshTokens).toEqual([]);
    });

    it('revokes only the supplied token on both records', async () => {
      employeeRepository.findByEmailWithPassword.mockResolvedValue(
        employee({
          refreshTokens: [
            { tokenHash: 'hashed-goodbye' },
            { tokenHash: 'hashed-keepme' },
          ],
        }),
      );
      userRepository.findUser.mockResolvedValue(
        adminUser({
          refreshTokens: [
            { tokenHash: 'hashed-goodbye' },
            { tokenHash: 'hashed-keepme' },
          ],
        }),
      );

      await service.logout(EMAIL, 'goodbye');

      const [, employeeUpdate] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      const [, adminUpdate] = userRepository.updateUser.mock.calls[0] as [
        Record<string, any>,
        Record<string, any>,
      ];
      expect(employeeUpdate.refreshTokens).toEqual([
        { tokenHash: 'hashed-keepme' },
      ]);
      expect(adminUpdate.refreshTokens).toEqual([
        { tokenHash: 'hashed-keepme' },
      ]);
    });
  });
});