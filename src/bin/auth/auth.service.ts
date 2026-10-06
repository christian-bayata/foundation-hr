import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthUtility } from './auth.utility';
import { UserRepository } from './repository/user.repository';
import { TokenService } from './token.service';
import { AccessTokenPayload } from './token.service';
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
import {
  AdminAuthBlock,
  AuthPrincipals,
  AuthProfileResponse,
  EmployeeAuthBlock,
  LoginResponse,
  RefreshTokenEntry,
} from './interface/auth.interface';
import { passwordResetTemplate } from '../../email/template/password-reset.template';
import { emailVerificationTemplate } from '../../email/template/email-verification.template';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { OrganizationDocument } from '../organization/entity/organization.schema';
import { SettingService } from '../setting/setting.service';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { PrincipalType } from './enum/principal-type.enum';
import { SystemRole } from './enum/role.enum';
import { Product } from './enum/product.enum';
import { UserType } from './enum/user.enum';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const EMPLOYEE_PRIVATE_FIELDS = [
  'password',
  'refreshTokens',
  'resetToken',
  '__v',
];

const ADMIN_PRIVATE_FIELDS = [
  'password',
  'refreshTokens',
  'resetToken',
  'emailVerificationToken',
  '__v',
];

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
    @Inject(SettingService) private readonly settingService: SettingService,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
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
   * @Responsibility: Authenticate a person who may hold an employee record, an
   * admin user record, or both, and issue a single JWT access/refresh token pair
   *
   * @param signInDto - Credentials (email and password)
   * @returns employeeAuth and/or adminAuth blocks, each omitting the one that does not apply
   *
   * Both records are resolved by email. Credential lookup is strictly
   * employee-first: when an employee record exists the supplied password is
   * checked against it and a mismatch fails without consulting the admin record.
   * Email verification is only enforced for the admin user record, since
   * employees have no such flag. The issued token pair is shared by both
   * blocks and its refresh hash is stored on every matching record so that a
   * rotation or revocation applies to the whole person.
   *
   * @throws {404} No employee or admin user record for the email
   * @throws {400} Admin email unverified, or invalid email or password
   */
  async signIn(signInDto: SignInDto): Promise<unknown> {
    const email = signInDto.email.toLowerCase();
    const { password } = signInDto;

    try {
      const { employee, adminUser } = await this.resolvePrincipals(email);

      if (!employee && !adminUser) {
        AppResponse.error({
          message: `User not found`,
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (adminUser && !adminUser.isEmailVerified) {
        AppResponse.error({
          message: `Please verify your email to sign in`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const credentialHolder = employee ?? adminUser;
      if (!credentialHolder?.password) {
        AppResponse.error({
          message: `No password has been set yet`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const passwordValid = await compare(password, credentialHolder.password);
      if (!passwordValid) {
        AppResponse.error({
          message: `Invalid email or password`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const organizationId = await this.resolveOrganizationId(
        employee,
        adminUser,
      );
      const tokens = await this.tokenService.generateTokenPair(
        this.buildTokenPayload({ employee, adminUser }, email, organizationId),
      );

      await this.appendRefreshToken(
        { employee, adminUser },
        tokens.refreshToken,
      );

      return this.buildLoginResponse(
        { employee, adminUser },
        tokens,
        organizationId,
      );
    } catch (error: any) {
      error.location = `AuthServices.${this.signIn.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Refresh an expired access token using a valid refresh token
   *
   * @param refreshTokenDto - Refresh token to validate and rotate
   * @returns New JWT access and refresh token pair
   *
   * Verifies the refresh token JWT, resolves every record sharing the token's
   * email, validates the token hash is present on at least one of them, then
   * rotates the hash across all of them and reissues a pair. The organization
   * and roles are re-resolved exactly as they are at sign-in, so a refreshed
   * token carries the same claims the original did.
   *
   * @throws {400} Invalid refresh token, or no matching record
   */
  async refresh(refreshTokenDto: RefreshTokenDto): Promise<unknown> {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      const email = payload.email?.toLowerCase() ?? '';

      if (!email) {
        AppResponse.error({
          message: `Invalid refresh token`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const { employee, adminUser } = await this.resolvePrincipals(email);

      if (!employee && !adminUser) {
        AppResponse.error({
          message: `User not found`,
          status: HttpStatus.NOT_FOUND,
        });
      }

      const tokenHash = this.authUtility.hash(refreshToken);
      const tokenExists = this.hasRefreshToken(
        { employee, adminUser },
        tokenHash,
      );
      if (!tokenExists) {
        AppResponse.error({
          message: `Invalid refresh token`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const organizationId = await this.resolveOrganizationId(
        employee,
        adminUser,
      );
      const tokens = await this.tokenService.generateTokenPair(
        this.buildTokenPayload({ employee, adminUser }, email, organizationId),
      );

      await this.replaceRefreshToken(
        { employee, adminUser },
        tokenHash,
        tokens.refreshToken,
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: any) {
      error.location = `AuthServices.${this.refresh.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Generate a password reset token and send the reset link via email
   *
   * @param forgotPasswordDto - Email address of the person requesting a reset
   * @returns Generic success message (never reveals whether the account exists)
   *
   * A single reset token is written to every record sharing the email — the
   * employee record and/or the admin user record — so a single link resets every
   * identity the person holds. The link is emailed once.
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<unknown> {
    const email = forgotPasswordDto.email.toLowerCase();

    try {
      const { employee, adminUser } = await this.resolvePrincipals(email);

      const eligible = Boolean(
        adminUser?.isEmailVerified || employee?.hasJoinedOrg,
      );

      if (eligible) {
        const rawToken = this.authUtility.randomToken();
        const tokenHash = this.authUtility.hash(rawToken);
        const resetTokenTtlMinutes =
          Number(this.configService.get<string>('RESET_TOKEN_TTL')) || 30;
        const expiresAt = new Date(
          Date.now() + resetTokenTtlMinutes * 60 * 1000,
        );

        await this.setResetToken({ employee, adminUser }, tokenHash, expiresAt);

        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        const resetLink = `${frontendUrl}/auth/reset-password?token=${rawToken}`;

        function emailDispatcherPayload(): MailDispatcherDto {
          return {
            to: `${email}`,
            from: 'Foundation HR <no-reply@foundationhr.com>',
            subject: 'Password Token Request',
            html: passwordResetTemplate(email, resetLink),
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
   * @Responsibility: Reset the password of a person who may hold both an employee
   * record and an admin user record
   *
   * @param resetPasswordDto - Reset token and new password
   * @returns Success message after password reset
   *
   * Finds whichever record holds the token, derives the email from it, then
   * writes the same new hash to every record sharing that email and clears the
   * reset token plus all sessions on each of them. This keeps one password
   * across both identities.
   *
   * @throws {400} Invalid or expired reset token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<unknown> {
    const { token, password } = resetPasswordDto;

    try {
      const tokenHash = this.authUtility.hash(token);

      const [employeeWithToken, adminUserWithToken] = await Promise.all([
        this.employeeRepository.findOne({ 'resetToken.tokenHash': tokenHash }),
        this.userRepository.findUser({
          'resetToken.tokenHash': tokenHash,
        }),
      ]);

      if (!employeeWithToken && !adminUserWithToken) {
        AppResponse.error({
          message: `Invalid or expired reset token`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const holders = { employeeWithToken, adminUserWithToken };

      if (this.isResetTokenExpired(holders)) {
        AppResponse.error({
          message: `Reset token has expired`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const email = (
        employeeWithToken?.email ??
        adminUserWithToken?.email ??
        ''
      ).toLowerCase();
      const { employee, adminUser } = await this.resolvePrincipals(email);

      const hashedPassword = await hash(password, 10);

      await this.writePasswordAndClearSessions(
        { employee, adminUser },
        hashedPassword,
      );

      this.logger.log(`Password reset successful for: ${email}`);

      return `Password reset successful for: ${email}`;
    } catch (error: any) {
      error.location = `AuthServices.${this.resetPassword.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Retrieve the profile of the authenticated person, covering
   * both the employee identity and the admin identity
   *
   * @param email - Email of the authenticated person
   * @returns employeeData and/or adminData blocks, each omitting the one that does not apply
   *
   * Resolves both records by email. adminData carries the resolved system roles
   * and organization details. Passwords, refresh tokens and token hashes are
   * stripped from both blocks.
   *
   * @throws {404} No employee or admin user record for the email
   */
  async userProfile(email: string): Promise<unknown> {
    try {
      const normalizedEmail = email?.toLowerCase();
      const { employee, adminUser } =
        await this.resolvePrincipals(normalizedEmail);

      if (!employee && !adminUser) {
        AppResponse.error({
          message: `User not found`,
          status: HttpStatus.NOT_FOUND,
        });
      }

      const response: AuthProfileResponse = {};

      if (employee) {
        response.employeeData = this.toPlainObject(
          employee,
          EMPLOYEE_PRIVATE_FIELDS,
        );
      }

      if (adminUser) {
        const adminUserId = adminUser._id.toString();
        const organizationId = await this.resolveOrganizationId(
          null,
          adminUser,
        );

        const organization =
          (await this.organizationRepository.findOrg({
            ownerId: adminUserId,
          })) ??
          (organizationId
            ? await this.organizationRepository.findOrg({
                _id: organizationId,
              })
            : null);

        response.adminData = {
          ...this.toPlainObject(adminUser, ADMIN_PRIVATE_FIELDS),
          role: organizationId
            ? await this.settingService.getUserSystemRoles(
                adminUserId,
                organizationId,
              )
            : [],
          orgDetails: organization,
        };
      }

      return response;
    } catch (error: any) {
      error.location = `AuthServices.${this.userProfile.name} method`;
      AppResponse.error(error);
    }
  }

  /**
   * @Responsibility: Log a person out by revoking their refresh token(s) on every
   * identity they hold
   *
   * @param email - Email of the authenticated person
   * @param refreshToken - Optional refresh token to revoke; when omitted, all sessions are cleared
   * @returns Success confirmation
   *
   * @throws {404} No employee or admin user record for the email
   */
  async logout(email: string, refreshToken?: string): Promise<unknown> {
    try {
      const principals = await this.resolvePrincipals(email?.toLowerCase());

      if (!principals.employee && !principals.adminUser) {
        AppResponse.error({
          message: `User not found`,
          status: HttpStatus.NOT_FOUND,
        });
      }

      const tokenHash = refreshToken
        ? this.authUtility.hash(refreshToken)
        : undefined;

      await this.removeRefreshToken(principals, tokenHash);

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
          slug: `oRg-${uuidv4()}`,
          ownerId: owner?._id.toString(),
          products: [],
          marketingOptIn,
          termsAcceptedAt: new Date(),
        },
      );

      const organizationId = organization._id?.toString();
      await this.settingService.initializeSystemRoles(organizationId);
      await this.settingService.assignCompanyOwner(
        owner._id.toString(),
        organizationId,
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

      const organization = await this.organizationRepository.findOrg({
        ownerId: owner?._id.toString(),
      });

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
   * @Responsibility: Resolve every identity a person holds for a given email
   *
   * @param email - Lowercased email address
   * @returns The employee record (with password selected) and/or the admin user record
   *
   * `users` and `employees` share no id, so email is the only join key. Both
   * lookups run together and either may be absent.
   */
  private async resolvePrincipals(
    email: string,
  ): Promise<Required<AuthPrincipals>> {
    const [employee, adminUser] = await Promise.all([
      this.employeeRepository.findByEmailWithPassword(email),
      this.userRepository.findUser({ email }, '-refreshTokens'),
    ]);

    return { employee, adminUser };
  }

  /**
   * @Responsibility: Determine which identities a resolved principal set holds
   */
  private determinePrincipalType({
    employee,
    adminUser,
  }: AuthPrincipals): PrincipalType {
    if (employee && adminUser) return PrincipalType.BOTH;
    return adminUser ? PrincipalType.ADMIN : PrincipalType.EMPLOYEE;
  }

  /**
   * @Responsibility: Resolve the organization a principal set belongs to
   *
   * The admin identity is preferred because the token's `sub` is the admin user
   * id and the role guard resolves roles against the admin's organization. The
   * employee's own organization is the fallback.
   *
   * @returns The organization id, or undefined when the person belongs to none
   */
  private async resolveOrganizationId(
    employee: any | null,
    adminUser: any | null,
  ): Promise<string | undefined> {
    if (adminUser) {
      const adminUserId = adminUser._id?.toString();
      const owned = await this.organizationRepository.findOrg({
        ownerId: adminUserId,
      });

      const adminOrganizationId =
        owned?._id?.toString() ??
        (await this.settingService.findOrganizationForUser(adminUserId));

      if (adminOrganizationId) return adminOrganizationId;
    }

    return employee?.organizationId ?? undefined;
  }

  /**
   * @Responsibility: Build the JWT access token payload for a principal set
   *
   * `sub` prefers the admin user id so that role-gated endpoints keep resolving
   * for people who hold both identities; the employee id rides along separately.
   */
  private buildTokenPayload(
    principals: AuthPrincipals,
    email: string,
    organizationId?: string,
  ): AccessTokenPayload {
    const { employee, adminUser } = principals;

    return {
      sub: adminUser?._id?.toString() ?? employee?._id?.toString(),
      email,
      userType: adminUser?.userType,
      principalType: this.determinePrincipalType(principals),
      employeeId: employee?._id?.toString(),
      adminUserId: adminUser?._id?.toString(),
      organizationId,
    };
  }

  /**
   * @Responsibility: Shape the login response into the identity blocks that apply
   *
   * Both blocks carry the same token pair because one session covers every
   * identity the person holds; they differ in roles, organization and status.
   */
  private async buildLoginResponse(
    principals: AuthPrincipals,
    tokens: { accessToken: string; refreshToken: string },
    organizationId?: string,
  ): Promise<LoginResponse> {
    const { employee, adminUser } = principals;
    const response: LoginResponse = {};

    if (employee) {
      const employeeAuth: EmployeeAuthBlock = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        role: [SystemRole.EMPLOYEE],
        organizationId,
        status: employee.status,
        employeeId: employee._id.toString(),
      };
      response.employeeAuth = employeeAuth;
    }

    if (adminUser) {
      const adminUserId = adminUser._id.toString();
      const organization =
        (await this.organizationRepository.findOrg({ ownerId: adminUserId })) ??
        (organizationId
          ? await this.organizationRepository.findOrg({
              _id: organizationId,
            })
          : null);

      const adminAuth: AdminAuthBlock = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        role: organizationId
          ? await this.settingService.getUserSystemRoles(
              adminUserId,
              organizationId,
            )
          : [],
        organizationId,
        kyc: this.getIncompleteKycFields(adminUser, organization),
        adminUserId,
      };
      response.adminAuth = adminAuth;
    }

    return response;
  }

  /**
   * @Responsibility: Convert a principal document to a plain object without the
   * given sensitive fields
   */
  private toPlainObject(
    document: any,
    privateFields: string[],
  ): Record<string, any> {
    const plain =
      typeof document?.toObject === 'function'
        ? document.toObject()
        : { ...document };

    for (const field of privateFields) {
      delete plain[field];
    }

    return plain;
  }

  /**
   * @Responsibility: Report whether a refresh token hash is active on any of the
   * principal's records
   */
  private hasRefreshToken(
    principals: AuthPrincipals,
    tokenHash: string,
  ): boolean {
    const { employee, adminUser } = principals;

    return [employee, adminUser].some((document) =>
      (document?.refreshTokens ?? []).some(
        (entry: RefreshTokenEntry) => entry?.tokenHash === tokenHash,
      ),
    );
  }

  /**
   * @Responsibility: Append a refresh token hash to every principal record so
   * that revocation and rotation apply to the whole person
   */
  private async appendRefreshToken(
    principals: AuthPrincipals,
    refreshToken: string,
  ): Promise<void> {
    const entry = this.buildRefreshTokenEntry(refreshToken);

    await this.persistRefreshTokens(principals, (current) => [
      ...current,
      entry,
    ]);
  }

  /**
   * @Responsibility: Swap one refresh token hash for a new one across every
   * principal record, dropping any other copy of the stale hash
   */
  private async replaceRefreshToken(
    principals: AuthPrincipals,
    staleTokenHash: string,
    refreshToken: string,
  ): Promise<void> {
    const entry = this.buildRefreshTokenEntry(refreshToken);

    await this.persistRefreshTokens(principals, (current) => [
      ...current.filter((token) => token?.tokenHash !== staleTokenHash),
      entry,
    ]);
  }

  /**
   * @Responsibility: Revoke a single refresh token, or every session when no
   * token hash is supplied, across all principal records
   */
  private async removeRefreshToken(
    principals: AuthPrincipals,
    tokenHash?: string,
  ): Promise<void> {
    await this.persistRefreshTokens(principals, (current) =>
      tokenHash
        ? current.filter((token) => token?.tokenHash !== tokenHash)
        : [],
    );
  }

  /**
   * @Responsibility: Build the stored refresh token entry for a raw token
   */
  private buildRefreshTokenEntry(refreshToken: string): RefreshTokenEntry {
    return {
      tokenHash: this.authUtility.hash(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      createdAt: new Date(),
    };
  }

  /**
   * @Responsibility: Apply a refresh token mutation to every principal record,
   * reading the current entries first so concurrent sessions are preserved
   */
  private async persistRefreshTokens(
    principals: AuthPrincipals,
    mutate: (current: RefreshTokenEntry[]) => RefreshTokenEntry[],
  ): Promise<void> {
    const { employee, adminUser } = principals;

    await Promise.all([
      employee
        ? this.employeeRepository.updateById(employee._id.toString(), {
            refreshTokens: mutate(employee.refreshTokens ?? []),
          })
        : Promise.resolve(null),
      adminUser
        ? this.userRepository.updateUser(
            { _id: adminUser._id.toString() },
            { refreshTokens: mutate(adminUser.refreshTokens ?? []) },
          )
        : Promise.resolve(null),
    ]);
  }

  /**
   * @Responsibility: Write one reset token onto every principal record
   */
  private async setResetToken(
    principals: AuthPrincipals,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    const { employee, adminUser } = principals;
    const resetToken = { tokenHash, expiresAt };

    await Promise.all([
      employee
        ? this.employeeRepository.updateById(employee._id.toString(), {
            resetToken,
          })
        : Promise.resolve(null),
      adminUser
        ? this.userRepository.updateUser(
            { _id: adminUser._id.toString() },
            { resetToken },
          )
        : Promise.resolve(null),
    ]);
  }

  /**
   * @Responsibility: Report whether any record holding the reset token has
   * already expired it
   */
  private isResetTokenExpired({
    employeeWithToken,
    adminUserWithToken,
  }: {
    employeeWithToken: any | null;
    adminUserWithToken: any | null;
  }): boolean {
    const now = new Date();

    return [employeeWithToken, adminUserWithToken].some(
      (document) =>
        document?.resetToken?.expiresAt &&
        now > new Date(document.resetToken.expiresAt),
    );
  }

  /**
   * @Responsibility: Write the same password hash to every principal record and
   * invalidate all of their sessions
   *
   * This is what keeps one password across both identities: a reset always
   * leaves the employee record and the admin user record in agreement.
   */
  private async writePasswordAndClearSessions(
    principals: AuthPrincipals,
    hashedPassword: string,
  ): Promise<void> {
    const { employee, adminUser } = principals;
    const update = {
      password: hashedPassword,
      resetToken: null,
      refreshTokens: [],
    };

    await Promise.all([
      employee
        ? this.employeeRepository.updateById(employee._id.toString(), update)
        : Promise.resolve(null),
      adminUser
        ? this.userRepository.updateUser(
            { _id: adminUser._id.toString() },
            update,
          )
        : Promise.resolve(null),
    ]);
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
    const verifyLink = `${frontendUrl}/auth/create-account/email-confirmation?token=${rawToken}`;

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

  /**
   * @Responsibility: Determine the KYC fields that are yet to be completed
   *
   * @param user - The authenticated user document
   * @param organization - The user's organization document (if any)
   * @returns Array of incomplete KYC field names
   */
  private getIncompleteKycFields(
    user: any,
    organization: OrganizationDocument | null,
  ): string[] {
    const kyc: string[] = [];

    if (!user?.firstName) kyc.push('firstName');
    if (!user?.lastName) kyc.push('lastName');

    if (!organization) {
      kyc.push('name', 'size', 'country', 'products', 'topInterest');
    } else {
      if (!organization.name) kyc.push('name');
      if (!organization.size) kyc.push('size');
      if (!organization.country) kyc.push('country');
      if (!organization.products || organization.products.length === 0) {
        kyc.push('products');
        kyc.push('topInterest');
      } else if (!organization.topInterest) {
        kyc.push('topInterest');
      }
    }

    return kyc;
  }
}
