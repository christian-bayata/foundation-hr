import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';

const mockHash = jest.fn();
const mockCompare = jest.fn();
const mockGenerateOtp = jest.fn();
const mockCryptoHash = jest.fn();
const mockRandomToken = jest.fn();

jest.unstable_mockModule('bcryptjs', () => ({
  hash: mockHash,
  compare: mockCompare,
}));

const mockAuthUtility = {
  generateOtp: mockGenerateOtp,
  hash: mockCryptoHash,
  randomToken: mockRandomToken,
};

jest.unstable_mockModule('./auth.utility', () => ({
  AuthUtility: jest.fn().mockImplementation(() => mockAuthUtility),
}));

const { AuthService } = await import('./auth.service');
const { TokenService } = await import('./token.service');
const { UserRepository } = await import('./repository/user.repository');
const { EmailService } = await import('../email/email.service');
const { AuthUtility } = await import('./auth.utility');
const { ConfigService } = await import('@nestjs/config');

function makeUser(overrides: Partial<User> = {}): any {
  return {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    email: 'johndoe@gmail.com',
    password: 'hashedPassword',
    isEmailVerified: false,
    userType: undefined,
    otp: null,
    otpAttempts: 0,
    resetToken: null,
    refreshTokens: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: {
    findUser: jest.Mock;
    createUser: jest.Mock;
    save: jest.Mock;
  };
  let tokenService: {
    generateAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
    generateTokenPair: jest.Mock;
    verifyRefreshToken: jest.Mock;
  };
  let emailService: { emailDispatcher: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockHash.mockResolvedValue('hashed-password');
    mockCompare.mockResolvedValue(false);
    mockGenerateOtp.mockReturnValue('1234');
    mockCryptoHash.mockImplementation((v: string) => `hashed-${v}`);
    mockRandomToken.mockReturnValue('raw-reset-token');

    userRepository = {
      findUser: jest.fn(),
      createUser: jest.fn(),
      save: jest.fn(),
    };
    tokenService = {
      generateAccessToken: jest.fn().mockResolvedValue('access-token'),
      generateRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
      generateTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
      verifyRefreshToken: jest.fn(),
    };
    emailService = {
      emailDispatcher: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          OTP_TTL: '10',
          OTP_MAX_ATTEMPTS: '5',
          RESET_TOKEN_TTL: '30',
          JWT_REFRESH_EXPIRES_IN: '7d',
          FRONTEND_URL: 'http://localhost:3000',
        };
        return map[key];
      }),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: userRepository },
        { provide: TokenService, useValue: tokenService },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
        { provide: AuthUtility, useValue: mockAuthUtility },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signUp', () => {
    it('should throw when email already exists', async () => {
      userRepository.findUser.mockResolvedValue(makeUser());
      await expect(
        service.signUp({ email: 'johndoe@gmail.com', password: 'password1' }),
      ).rejects.toThrow('already exists');
    });

    it('should create a hashed user and send OTP email', async () => {
      userRepository.findUser.mockResolvedValue(null);
      const created = makeUser();
      userRepository.createUser.mockResolvedValue(created);

      const result = await service.signUp({
        email: 'JohnDoe@gmail.com',
        password: 'password1',
      });

      expect(userRepository.createUser).toHaveBeenCalledWith({
        email: 'johndoe@gmail.com',
        password: 'hashed-password',
        isEmailVerified: false,
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(emailService.emailDispatcher).toHaveBeenCalled();
      expect(result).toEqual({
        email: 'johndoe@gmail.com',
        isEmailVerified: false,
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify with correct OTP', async () => {
      const user = makeUser({
        otp: { codeHash: 'hashed-1234', expiresAt: new Date(Date.now() + 600000) },
      });
      userRepository.findUser.mockResolvedValue(user);

      const result = await service.verifyEmail({
        email: 'johndoe@gmail.com',
        otp: '1234',
      });

      expect(user.isEmailVerified).toBe(true);
      expect(user.otp).toBeNull();
      expect(result).toEqual({ email: 'johndoe@gmail.com' });
    });

    it('should throw on wrong OTP and increment attempts', async () => {
      const user = makeUser({
        otp: { codeHash: 'hashed-1234', expiresAt: new Date(Date.now() + 600000) },
      });
      userRepository.findUser.mockResolvedValue(user);
      mockCryptoHash.mockImplementation((v: string) => `other-${v}`);

      await expect(
        service.verifyEmail({ email: 'johndoe@gmail.com', otp: '9999' }),
      ).rejects.toThrow('Invalid verification code');
      expect(user.otpAttempts).toBe(1);
    });

    it('should throw on expired OTP', async () => {
      const user = makeUser({
        otp: { codeHash: 'hashed-1234', expiresAt: new Date(Date.now() - 1000) },
      });
      userRepository.findUser.mockResolvedValue(user);
      await expect(
        service.verifyEmail({ email: 'johndoe@gmail.com', otp: '1234' }),
      ).rejects.toThrow('has expired');
    });
  });

  describe('signIn', () => {
    it('should reject unverified users', async () => {
      const user = makeUser({ isEmailVerified: false });
      userRepository.findUser.mockResolvedValue(user);
      mockCompare.mockResolvedValue(true);
      await expect(
        service.signIn({ email: 'johndoe@gmail.com', password: 'password1' }),
      ).rejects.toThrow('verify your email');
    });

    it('should reject wrong password', async () => {
      const user = makeUser({ isEmailVerified: true });
      userRepository.findUser.mockResolvedValue(user);
      mockCompare.mockResolvedValue(false);
      await expect(
        service.signIn({ email: 'johndoe@gmail.com', password: 'wrongpass1' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should return tokens on success', async () => {
      const user = makeUser({ isEmailVerified: true });
      userRepository.findUser.mockResolvedValue(user);
      mockCompare.mockResolvedValue(true);

      const result = await service.signIn({
        email: 'johndoe@gmail.com',
        password: 'password1',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should reject an unknown refresh token', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: '507f1f77bcf86cd799439011' });
      userRepository.findUser.mockResolvedValue(makeUser({ refreshTokens: [] }));
      await expect(
        service.refresh({ refreshToken: 'some-refresh-token' }),
      ).rejects.toThrow();
    });

    it('should rotate and issue a new pair', async () => {
      mockCryptoHash.mockImplementation((v: string) => `hashed-${v}`);
      const user = makeUser({
        isEmailVerified: true,
        refreshTokens: [
          {
            tokenHash: 'hashed-refresh-token',
            expiresAt: new Date(Date.now() + 1000000),
            createdAt: new Date(),
          },
        ],
      });
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: user._id.toString() });
      userRepository.findUser.mockResolvedValue(user);

      const result = await service.refresh({ refreshToken: 'refresh-token' });
      expect(result.accessToken).toBe('access-token');
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('forgotPassword + resetPassword', () => {
    it('forgotPassword sends reset link for verified user', async () => {
      const user = makeUser({ isEmailVerified: true });
      userRepository.findUser.mockResolvedValue(user);
      const result = await service.forgotPassword({ email: 'johndoe@gmail.com' });
      expect(userRepository.save).toHaveBeenCalled();
      expect(emailService.emailDispatcher).toHaveBeenCalled();
      expect(result).toEqual({ email: 'johndoe@gmail.com' });
    });

    it('resetPassword errors on invalid token', async () => {
      userRepository.findUser.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: 'bad-token', password: 'newpass1' }),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('resetPassword resets password and clears sessions', async () => {
      const user = makeUser({
        isEmailVerified: true,
        resetToken: { tokenHash: 'hashed-raw-reset-token', expiresAt: new Date(Date.now() + 1000000) },
        refreshTokens: [{ tokenHash: 'x', expiresAt: new Date(), createdAt: new Date() }],
      });
      userRepository.findUser.mockResolvedValue(user);

      const result = await service.resetPassword({ token: 'raw-reset-token', password: 'newpass1' });
      expect(user.password).toBe('hashed-password');
      expect(user.resetToken).toBeNull();
      expect(user.refreshTokens).toEqual([]);
      expect(result).toContain('johndoe@gmail.com');
    });
  });
});