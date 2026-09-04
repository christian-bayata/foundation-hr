import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthUtility } from './auth.utility';
import { UserRepository } from './repository/user.repository';
import { TokenService } from './token.service';
import { EmailService } from '../../email/email.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OrganizationDetailsDto } from './dto/organization-details.dto';
import { ProductChoiceDto } from './dto/product-choice.dto';
import { AppResponse } from '../../common/response/app-response';
import { hash, compare } from 'bcryptjs';
import { MailDispatcherDto } from '../../email/dto/send-mail.dto';
import { RefreshTokenEntry } from './interface/auth.interface';
import { passwordResetTemplate } from '../../email/template/password-reset.template';
import { emailVerificationTemplate } from '../../email/template/email-verification.template';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { Product } from './enum/product.enum';
import { UserType } from './enum/user.enum';
import { existsSync } from 'fs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(UserRepository) private readonly userRepository: UserRepository,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AuthUtility) private readonly authUtility: AuthUtility,
    @Inject(OrganizationRepository)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * @Responsibility: Register a new user with hashed password and send a
   * link-based email verification token.
   *
   * @param signUpDto - Registration data: firstName, lastName, email, password, optional userType
   * @returns Created user profile (email and verification status)
   *
   * Checks for duplicate email (case-insensitive), hashes password, creates user,
   * generates a verification token, and sends the confirmation link via email.
   *
   * @throws {409} Email already exists
   * @throws {500} Internal server error
   */
  async signUp(signUpDto: SignUpDto): Promise<unknown> {
    const { firstName, lastName, password } = signUpDto;
    const email = signUpDto.email.toLowerCase();
    try {
      const existing = await this.userRepository.findUser({ email });
      if (existing) {
        AppResponse.error({
          message: `Email already exists`,
          status: HttpStatus.CONFLICT,
        });
      }

      const hashedPassword = await hash(password, 10);

      const user = await this.userRepository.createUser({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        userType: signUpDto.userType ?? UserType.COMPANY,
        isEmailVerified: false,
      });

      await this.issueVerificationToken(user);

      return { email: user?.email, isEmailVerified: user?.isEmailVerified };
    } catch (error: any) {
      error.location = `AuthServices.${this.signUp.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Verify user email using a time-limited token link
   *
   * @param verifyEmailDto - Token from the verification email
   * @returns Verified user email
   *
   * Finds user by hashed token, validates expiry, marks email as verified,
   * and clears the verification token.
   *
   * @throws {400} Invalid or expired verification token
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<unknown> {
    const { token } = verifyEmailDto;

    try {
      const tokenHash = this.authUtility.hash(token);
      const existing = await this.userRepository.findUser({
        'emailVerificationToken.tokenHash': tokenHash,
      });
      const user =
        existing ??
        AppResponse.error({
          message: `Invalid or expired verification link`,
          status: HttpStatus.BAD_REQUEST,
        });

      if (
        user?.emailVerificationToken?.expiresAt &&
        new Date() > new Date(user.emailVerificationToken.expiresAt)
      ) {
        AppResponse.error({
          message: `Verification link has expired`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = null;

      await user.save();

      this.logger.log(`Email verified for: ${user?.email}`);

      return { email: user?.email };
    } catch (error: any) {
      error.location = `AuthServices.${this.verifyEmail.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Resend the email verification link ("Resend email")
   *
   * @param resendVerificationDto - Email address to resend verification to
   * @returns Generic success message (never reveals whether the email exists)
   *
   * If the email is registered and not yet verified, a fresh verification
   * token is issued and emailed.
   */
  async resendVerification(
    resendVerificationDto: ResendVerificationDto,
  ): Promise<unknown> {
    const email = resendVerificationDto.email.toLowerCase();

    try {
      const user = await this.userRepository.findUser({ email });
      if (user && !user.isEmailVerified) {
        await this.issueVerificationToken(user);
        this.logger.log(`Verification email resent to: ${email}`);
      }

      return `If this email is registered, a new verification link has been sent`;
    } catch (error: any) {
      error.location = `AuthServices.${this.resendVerification.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Authenticate user and issue JWT access/refresh tokens
   *
   * @param signInDto - User credentials (email and password)
   * @returns JWT access token and refresh token pair
   *
   * Validates email exists, checks email verification status,
   * compares password against stored hash, and generates token pair.
   *
   * @throws {400} Invalid email or password, or email not verified
   * @throws {404} Email not found
   */
  async signIn(signInDto: SignInDto): Promise<unknown> {
    const email = signInDto.email.toLowerCase();
    const { password } = signInDto;

    try {
      const existing = await this.userRepository.findUser({ email });
      const user =
        existing ??
        AppResponse.error({
          message: `User not found`,
          status: HttpStatus.NOT_FOUND,
        });

      if (!user?.isEmailVerified) {
        AppResponse.error({
          message: `Please verify your email to sign in`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const passwordValid = await compare(password, user?.password);
      if (!passwordValid) {
        AppResponse.error({
          message: `Invalid email or password`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const payload = {
        sub: user?._id?.toString(),
        email: user?.email,
        userType: user?.userType,
      };
      const tokens = await this.tokenService?.generateTokenPair(payload);

      user.refreshTokens = [
        ...(user?.refreshTokens ?? []),
        {
          tokenHash: this.authUtility.hash(tokens?.refreshToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ];

      await user.save();

      return {
        accessToken: tokens?.accessToken,
        refreshToken: tokens?.refreshToken,
      };
    } catch (error: any) {
      error.location = `AuthServices.${this.signIn.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Refresh expired access token using valid refresh token
   *
   * @param refreshTokenDto - Refresh token to validate and rotate
   * @returns New JWT access and refresh token pair
   *
   * Verifies refresh token JWT, finds user by ID, validates token exists
   * in user's active sessions, rotates token (removes old, issues new pair).
   *
   * @throws {400} Invalid refresh token, or user not found
   */
  async refresh(refreshTokenDto: RefreshTokenDto): Promise<unknown> {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = await this.tokenService?.verifyRefreshToken(refreshToken);

      const existing = await this.userRepository.findUser({
        _id: payload?.sub,
      });
      const user =
        existing ??
        AppResponse.error({
          message: `User not found`,
          status: HttpStatus.NOT_FOUND,
        });

      const tokenHash = this.authUtility.hash(refreshToken);
      const tokenExists = user?.refreshTokens?.some(
        (t: RefreshTokenEntry) => t?.tokenHash === tokenHash,
      );
      if (!tokenExists) {
        AppResponse.error({
          message: `Invalid refresh token`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      user.refreshTokens =
        user?.refreshTokens?.filter(
          (t: RefreshTokenEntry) => t?.tokenHash !== tokenHash,
        ) ?? [];

      const newPayload = {
        sub: user?._id?.toString(),
        email: user?.email,
        userType: user?.userType,
      };
      const tokens = await this.tokenService?.generateTokenPair(newPayload);

      user.refreshTokens = [
        ...(user?.refreshTokens ?? []),
        {
          tokenHash: this.authUtility.hash(tokens?.refreshToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ];

      await user.save();

      return {
        accessToken: tokens?.accessToken,
        refreshToken: tokens?.refreshToken,
      };
    } catch (error: any) {
      error.location = `AuthServices.${this.refresh.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Generate password reset token and send reset link via email
   *
   * @param forgotPasswordDto - Email address of user requesting password reset
   * @returns Generic success message (never reveals whether the email exists)
   *
   * If the email is registered and verified, a hashed reset token is stored
   * (30-minute expiry) and the reset link is emailed.
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<unknown> {
    const email = forgotPasswordDto.email.toLowerCase();

    try {
      const user = await this.userRepository.findUser({ email });

      if (user?.isEmailVerified) {
        const rawToken = this.authUtility.randomToken();
        const tokenHash = this.authUtility.hash(rawToken);
        const resetTokenTtlMinutes =
          Number(this.configService.get<string>('RESET_TOKEN_TTL')) || 30;

        user.resetToken = {
          tokenHash,
          expiresAt: new Date(Date.now() + resetTokenTtlMinutes * 60 * 1000),
        };

        await user.save();

        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

        function emailDispatcherPayload(): MailDispatcherDto {
          return {
            to: `${user?.email}`,
            from: 'Foundation HR <no-reply@foundationhr.com>',
            subject: 'Password Token Request',
            html: passwordResetTemplate(user?.email as string, resetLink),
          };
        }
        /* Send email to user */
        await this.emailService.brevoEmailDispatcher(emailDispatcherPayload());
      }

      return `If this email is registered, a reset link has been sent`;
    } catch (error: any) {
      error.location = `AuthServices.${this.forgotPassword.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Reset user password using valid reset token
   *
   * @param resetPasswordDto - Reset token and new password
   * @returns Success message after password reset
   *
   * Finds user by hashed reset token, validates token expiry,
   * hashes and updates password, clears reset token and all
   * existing refresh tokens (invalidates all sessions).
   *
   * @throws {400} Invalid or expired reset token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<unknown> {
    const { token, password } = resetPasswordDto;

    try {
      const tokenHash = this.authUtility.hash(token);
      const existing = await this.userRepository.findUser({
        'resetToken.tokenHash': tokenHash,
      });
      const account =
        existing ??
        AppResponse.error({
          message: `Invalid or expired reset token`,
          status: HttpStatus.BAD_REQUEST,
        });

      if (
        account?.resetToken?.expiresAt &&
        new Date() > new Date(account?.resetToken?.expiresAt)
      ) {
        AppResponse.error({
          message: `Reset token has expired`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      account.password = await hash(password, 10);
      account.resetToken = null;
      account.refreshTokens = [];

      await account.save();

      return `Password reset successful for: ${account?.email}`;
    } catch (error: any) {
      error.location = `AuthServices.${this.resetPassword.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Retrieve the authenticated user's profile
   *
   * @param userId - ID of the authenticated user
   * @returns User profile data without sensitive fields
   *
   * Finds user by ID and returns email, verification status, and user type.
   *
   * @throws {404} User not found
   */
  async userProfile(userId: string): Promise<unknown> {
    try {
      const existing = await this.userRepository.findUser({
        _id: userId,
      });
      const user =
        existing ??
        AppResponse.error({
          message: `User not found`,
          status: HttpStatus.NOT_FOUND,
        });

      const { password: _password, ...newUser } = user.toObject();

      return newUser;
    } catch (error: any) {
      error.location = `AuthServices.${this.userProfile.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Log out a user by revoking their refresh token(s)
   *
   * @param userId - ID of the authenticated user
   * @param refreshToken - Optional refresh token to revoke; when omitted, all sessions are cleared
   * @returns Success confirmation
   *
   * Finds user by ID, removes the specified refresh token (or all sessions
   * when no token is provided), and persists the change.
   *
   * @throws {404} User not found
   */
  async logout(userId: string, refreshToken?: string): Promise<unknown> {
    try {
      const existing = await this.userRepository.findUser({ _id: userId });
      const user =
        existing ??
        AppResponse.error({
          message: `User not found`,
          status: HttpStatus.NOT_FOUND,
        });

      if (refreshToken) {
        const tokenHash = this.authUtility.hash(refreshToken);
        user.refreshTokens =
          user?.refreshTokens?.filter(
            (t: RefreshTokenEntry) => t?.tokenHash !== tokenHash,
          ) ?? [];
      } else {
        user.refreshTokens = [];
      }

      await user.save();

      return 'Logged out successfully';
    } catch (error: any) {
      error.location = `AuthServices.${this.logout.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Step 2 of onboarding — store the user's organization details
   *
   * @param userId - Owner (authenticated user) ID
   * @param organizationDetailsDto - Organisation name, size, country, ToS acceptance, marketing opt-in
   * @returns The created organization
   *
   * @throws {400} Terms must be accepted
   * @throws {404} User not found
   */
  async organizationDetails(
    userId: string,
    organizationDetailsDto: OrganizationDetailsDto,
  ): Promise<unknown> {
    const {
      organisationName,
      organisationSize,
      country,
      acceptTerms,
      marketingOptIn,
    } = organizationDetailsDto;

    try {
      if (!acceptTerms) {
        AppResponse.error({
          message: `You must accept the Terms of Service to continue`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const user = await this.userRepository.findUser({ _id: userId });
      const owner =
        user ??
        AppResponse.error({
          message: `User not found`,
          status: HttpStatus.NOT_FOUND,
        });

      const organization = await this.organizationRepository.createOrganization(
        {
          name: organisationName,
          size: organisationSize,
          country,
          owner: owner?._id,
          products: [],
          marketingOptIn,
          termsAcceptedAt: new Date(),
        },
      );

      return organization;
    } catch (error: any) {
      error.location = `AuthServices.${this.organizationDetails.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Step 3 of onboarding — record the user's product choice(s)
   *
   * @param userId - Owner (authenticated user) ID
   * @param productChoiceDto - Ordered products; the first entry becomes the user's top interest
   * @returns The updated organization
   *
   * @throws {403} Organization not set up yet (run Step 2 first)
   * @throws {404} User not found
   */
  async productChoice(
    userId: string,
    productChoiceDto: ProductChoiceDto,
  ): Promise<unknown> {
    const { products } = productChoiceDto;

    try {
      const user = await this.userRepository.findUser({ _id: userId });
      const owner =
        user ??
        AppResponse.error({
          message: `User not found`,
          status: HttpStatus.NOT_FOUND,
        });

      const organization =
        await this.organizationRepository.findOrganizationByOwner(owner?._id);

      if (!organization) {
        AppResponse.error({
          message: `Organization not set up yet. Please complete step 2 first.`,
          status: HttpStatus.FORBIDDEN,
        });
        return;
      }

      const validProducts = products.filter((p) =>
        (Object.values(Product) as string[]).includes(p),
      );

      organization.products = validProducts;
      organization.topInterest = validProducts[0] ?? null;

      await organization.save();

      return organization;
    } catch (error: any) {
      error.location = `AuthServices.${this.productChoice.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Generate and persist a fresh email-verification token,
   * then dispatch the verification link via email.
   */
  private async issueVerificationToken(user: any): Promise<void> {
    const rawToken = this.authUtility.randomToken();
    const tokenHash = this.authUtility.hash(rawToken);
    const verifyTokenTtlMinutes =
      Number(this.configService.get<string>('VERIFY_TOKEN_TTL')) || 1440;

    user.emailVerificationToken = {
      tokenHash,
      expiresAt: new Date(Date.now() + verifyTokenTtlMinutes * 60 * 1000),
    };

    await user.save();

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verifyLink = `${frontendUrl}/verify-email?token=${rawToken}`;

    const email_user = this.configService.get('EMAIL_USER');
    function emailDispatcherPayload(): MailDispatcherDto {
      return {
        to: `${user?.email}`,
        from: email_user,
        subject: `Confirm your email address`,
        html: emailVerificationTemplate(user?.email, verifyLink),
      };
    }
    await this.emailService.brevoEmailDispatcher(emailDispatcherPayload());
  }
}
