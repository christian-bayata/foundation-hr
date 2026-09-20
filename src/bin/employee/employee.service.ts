import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryFilter } from 'mongoose';
import { AppResponse } from '../../common/response/app-response';
import { EmailService } from '../../email/email.service';
import { MailDispatcherDto } from '../../email/dto/send-mail.dto';
import { employeeInviteTemplate } from '../../email/template/employee-invite.template';
import { passwordResetTemplate } from '../../email/template/password-reset.template';
import { StepOneDto } from './dto/step-one.dto';
import { StepTwoDto } from './dto/step-two.dto';
import { OnboardingBasicInformationDto } from './dto/onboarding-basic-info.dto';
import { OnboardingContactsDto } from './dto/onboarding-contacts.dto';
import { OnboardingFinanceInformationDto } from './dto/onboarding-finance.dto';
import { EmployeeStatus, OnboardingStep } from './enum/employee.enum';
import { EmployeeRepository } from './repository/employee.repository';
import {
  EmployeeContact,
  EmployeeDocument,
  FinanceInformation,
} from './entity/employee.schema';
import {
  HierarchyTreeNode,
  ListEmployeeFilters,
  ListEmployeeQuery,
  PaginatedResult,
} from './interface/employee.interface';
import { EmployeeUtility } from './repository/employee.utility';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { EmployeeAcceptInviteDto } from './dto/invite-employees.dto';
import { EmployeeSetPasswordDto } from './dto/set-password.dto';
import { EmployeeLoginDto } from './dto/login.dto';
import { EmployeeForgotPasswordDto } from './dto/forgot-password.dto';
import { EmployeeResetPasswordDto } from './dto/reset-password.dto';
import { EmployeeRefreshTokenDto } from './dto/refresh-token.dto';
import { TokenService } from '../auth/token.service';
import { AuthUtility } from '../auth/auth.utility';
import { SystemRole } from '../auth/enum/role.enum';
import { RefreshTokenEntry } from '../auth/interface/auth.interface';
import { compare, hash } from 'bcryptjs';
import moment from 'moment';

interface MongooseDuplicateError {
  code?: number;
}

const INVITE_LINK_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(OrganizationRepository)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(EmployeeUtility)
    private readonly employeeUtility: EmployeeUtility,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(AuthUtility) private readonly authUtility: AuthUtility,
  ) {}

  /**
   * @Responsibility: Step 1 — Create a new employee draft with basic info, or
   * complete the basic info of an employee invited via an inviteId link
   *
   * @param stepOneDto - Basic info: firstName, lastName, middleName(optional),
   * employeeId, email, employmentDate, inviteId(optional)
   * @returns The created/updated employee draft
   *
   * @throws {409} Email or employee ID already exists
   */
  async createBasicInfo(stepOneDto: StepOneDto): Promise<unknown> {
    const {
      inviteId,
      employeeType,
      firstName,
      lastName,
      middleName,
      email,
      employmentDate,
    } = stepOneDto;

    try {
      if (inviteId) {
        const invited =
          (await this.employeeRepository.findById(inviteId)) ??
          AppResponse.error({
            message: `Employee not found`,
            status: HttpStatus.NOT_FOUND,
          });

        if (invited.status === EmployeeStatus.ACTIVE) {
          AppResponse.error({
            message: `Employee already completed onboarding`,
            status: HttpStatus.BAD_REQUEST,
          });
        }

        if (email?.toLowerCase() !== invited.email) {
          AppResponse.error({
            message: `Email does not match the invited account`,
            status: HttpStatus.BAD_REQUEST,
          });
        }

        const updated = await this.employeeRepository.updateById(inviteId, {
          employeeType,
          firstName,
          lastName,
          middleName: middleName ?? null,
          employmentDate: new Date(employmentDate),
        });

        this.logger.log(
          `Basic info completed for invited employee: ${inviteId}`,
        );

        return updated;
      }

      const existingEmail = await this.employeeRepository.findOne({ email });
      if (existingEmail) {
        AppResponse.error({
          message: `An employee with this email already exists`,
          status: HttpStatus.CONFLICT,
        });
      }

      const employee = await this.employeeRepository.create({
        employeeType,
        firstName,
        lastName,
        middleName: middleName ?? null,
        email: email.toLowerCase(),
        employeeUniqueId: this.employeeUtility.generateUniqueId(),
        employmentDate: new Date(employmentDate),
        status: EmployeeStatus.DRAFT,
      });

      this.logger.log(`Employee draft created: ${email}`);

      return employee;
    } catch (error: any) {
      const duplicate = error as MongooseDuplicateError;
      if (duplicate?.code === 11000) {
        AppResponse.error({
          message: `An employee with this email or employee ID already exists`,
          status: HttpStatus.CONFLICT,
        });
      }
      error.location = `EmployeeServices.${this.createBasicInfo.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Step 2 — Save contract details for a draft employee and
   * mark them active once onboarding is complete
   *
   * @param inviteId - Mongo ID of the employee (invite/onboarding reference)
   * @param stepTwoDto - Contract details: contractDuration, jobType, workMode,
   * probationPeriod(optional), department, jobTitle, supervisor(optional),
   * salary(optional), salaryCurrency(optional)
   * @returns The updated employee
   *
   * @throws {404} Employee not found
   * @throws {400} Employee already finalized
   */
  async saveContractDetails(
    inviteId: string,
    stepTwoDto: StepTwoDto,
  ): Promise<unknown> {
    const {
      contractDuration,
      jobType,
      workMode,
      probationPeriod,
      department,
      jobTitle,
      supervisor,
      salary,
      salaryCurrency,
    } = stepTwoDto;

    try {
      const employee =
        (await this.employeeRepository.findById(inviteId)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      if (employee.status === EmployeeStatus.ACTIVE) {
        AppResponse.error({
          message: `Employee already finalized. Contract details cannot be updated.`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const updated = await this.employeeRepository.updateById(inviteId, {
        contractDuration,
        jobType,
        workMode,
        probationPeriod: probationPeriod ?? null,
        department,
        jobTitle,
        supervisor: supervisor ?? null,
        salary: salary ?? null,
        salaryCurrency: salaryCurrency ?? 'NGN',
      });

      this.logger.log(`Contract details saved for employee: ${inviteId}`);

      return updated;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveContractDetails.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Fetch a single employee by Mongo ID (summary screen)
   *
   * @param inviteId - Mongo ID of the employee (invite/onboarding reference)
   * @returns The employee document
   *
   * @throws {404} Employee not found
   */
  async getEmployee(inviteId: string): Promise<unknown> {
    try {
      const employee =
        (await this.employeeRepository.findById(inviteId)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      return employee;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.getEmployee.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Step 3 (Save draft) — Persist the employee as a draft,
   * ready to be invited later from the Onboarding page
   *
   * @param inviteId - Mongo ID of the employee (invite/onboarding reference)
   * @returns The draft employee
   *
   * @throws {404} Employee not found
   */
  async saveDraft(inviteId: string): Promise<unknown> {
    try {
      const employee =
        (await this.employeeRepository.findById(inviteId)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      if (employee.status === EmployeeStatus.ACTIVE) {
        return employee;
      }

      const updated = await this.employeeRepository.updateById(inviteId, {
        status: EmployeeStatus.DRAFT,
      });

      this.logger.log(`Employee draft saved: ${inviteId}`);

      return updated;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveDraft.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Invite employees by email — for each new email a sparse
   * employee account (email + organizationId, status DRAFT) is created the
   * moment the invite email is dispatched. Existing accounts are skipped. The
   * employee completes the remaining details during onboarding.
   *
   * @param invitees - Array of invitee email addresses
   * @param organizationId - Organization that issues the invites
   * @returns Per-email result: invited, skipped, failed
   *
   * @throws {400} Organization ID missing
   */
  async inviteEmployees(
    invitees: string[],
    organizationId?: string,
  ): Promise<unknown> {
    try {
      if (!organizationId) {
        AppResponse.error({
          message: `Organization not set up. Please complete organization setup first.`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const emails = [
        ...new Set(invitees.map((email) => email.trim().toLowerCase())),
      ];

      const result = {
        invited: [] as { email: string; inviteId?: string }[],
        skipped: [] as { email: string }[],
        failed: [] as { email: string }[],
      };

      for (const email of emails) {
        try {
          // const existing = await this.employeeRepository.findByEmail(email);
          // if (existing) {
          //   result.skipped.push({ email });
          //   continue;
          // }

          const inviteExpiresAt = new Date(Date.now() + INVITE_LINK_TTL_MS);
          const [_, organizationDetails] = await Promise.all([
            this.employeeRepository.updateEmployee(
              { email },
              {
                status: EmployeeStatus.ACTIVE,
                inviteExpiresAt,
              },
            ),
            this.organizationRepository.findOrg(
              { _id: organizationId },
              'slug name',
            ),
          ]);

          /* Send email to employee */
          await this.dispatchInvite(
            email,
            inviteExpiresAt,
            organizationDetails,
          );

          result.invited.push({
            email,
            // inviteId: employee._id?.toString() ?? '',
          });
        } catch (error: any) {
          if (error?.code === 11000) {
            result.skipped.push({ email });
            continue;
          }
          this.logger.error(`Failed to invite ${email}: ${error?.message}`);
          result.failed.push({ email });
        }
      }

      this.logger.log(
        `Invited ${result.invited.length}, skipped ${result.skipped.length}, failed ${result.failed.length}`,
      );

      return result;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.inviteEmployees.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Employee accepts the email invite to join an organization.
   * Marks the employee as having joined the organization, provided the invite
   * is still valid (found employee + org, org matches, link not expired).
   *
   * @param employeeAcceptInviteDto - email and orgSlug from the invite link
   * @returns The updated employee document
   *
   * @throws {404} Employee or organization not found
   * @throws {403} Invite does not match the employee's organization
   * @throws {410} Invite link has expired
   */
  async employeeAcceptInvite(
    employeeAcceptInviteDto: EmployeeAcceptInviteDto,
  ): Promise<unknown> {
    try {
      const { email, orgSlug } = employeeAcceptInviteDto;
      const normalizedEmail = email.trim().toLowerCase();

      const employee =
        (await this.employeeRepository.findByEmail(normalizedEmail)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      const organization =
        (await this.organizationRepository.findBySlug(orgSlug)) ??
        AppResponse.error({
          message: `Organization not found`,
          status: HttpStatus.NOT_FOUND,
        });

      const organizationId = organization._id?.toString();

      if (
        employee.organizationId &&
        employee.organizationId !== organizationId
      ) {
        AppResponse.error({
          message: `This invitation does not match your organization`,
          status: HttpStatus.FORBIDDEN,
        });
      }

      if (employee.hasJoinedOrg) {
        return { hasJoinedOrg: true };
      }

      if (
        !employee.inviteExpiresAt ||
        new Date() > new Date(employee.inviteExpiresAt)
      ) {
        AppResponse.error({
          message: `Invitation link has expired. Please request a new invitation.`,
          status: HttpStatus.GONE,
        });
      }

      await this.employeeRepository.updateById(employee._id.toString(), {
        hasJoinedOrg: true,
        organizationId: employee.organizationId ?? organizationId,
      });

      return { hasJoinedOrg: true };
    } catch (error: any) {
      error.location = `EmployeeServices.${this.employeeAcceptInvite.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: First step of the employee journey — set the account password.
   * Stores a hashed password on the employee record; does not create an auth User.
   * Idempotent: re-setting simply replaces the existing password.
   *
   * @param employeeSetPasswordDto - email, password and orgSlug from the invite link
   * @returns The employee email and verification status
   *
   * @throws {404} Employee or organization not found
   * @throws {403} Invite does not match the employee's organization
   * @throws {410} Invite link has expired
   */
  async employeeSetPassword(
    employeeSetPasswordDto: EmployeeSetPasswordDto,
  ): Promise<unknown> {
    try {
      const { email, password, confirmPassword, orgSlug } =
        employeeSetPasswordDto;
      const normalizedEmail = email.trim().toLowerCase();

      const employee =
        (await this.employeeRepository.findByEmail(normalizedEmail)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      const organization =
        (await this.organizationRepository.findBySlug(orgSlug)) ??
        AppResponse.error({
          message: `Organization not found`,
          status: HttpStatus.NOT_FOUND,
        });

      const organizationId = organization._id?.toString();

      if (
        employee.organizationId &&
        employee.organizationId !== organizationId
      ) {
        AppResponse.error({
          message: `This invitation does not match your organization`,
          status: HttpStatus.FORBIDDEN,
        });
      }

      if (
        !employee.inviteExpiresAt ||
        new Date() > new Date(employee.inviteExpiresAt)
      ) {
        AppResponse.error({
          message: `Invitation link has expired. Please request a new invitation.`,
          status: HttpStatus.GONE,
        });
      }

      if (password !== confirmPassword) {
        AppResponse.error({
          message: 'Passwords do not match',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const hashedPassword = await hash(password, 10);

      await this.employeeRepository.updateById(employee._id.toString(), {
        password: hashedPassword,
        hasJoinedOrg: true,
        organizationId: employee.organizationId ?? organizationId,
        onboarding: {
          startedAt: moment().toDate(),
        },
      });

      this.logger.log(`Password set for invited employee: ${normalizedEmail}`);

      return { email: normalizedEmail, isEmailVerified: true };
    } catch (error: any) {
      error.location = `EmployeeServices.${this.employeeSetPassword.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Authenticate an employee with email and password, issuing
   * a JWT access/refresh token pair. Mirrors the admin auth sign-in flow.
   *
   * @param employeeLoginDto - Email and password credentials
   * @returns accessToken, refreshToken, role, organizationId and employee status
   *
   * @throws {400} Invalid email or password (account missing or password unset)
   */
  async employeeLogin(employeeLoginDto: EmployeeLoginDto): Promise<unknown> {
    const email = employeeLoginDto.email.toLowerCase();
    const { password } = employeeLoginDto;

    try {
      const existing =
        await this.employeeRepository.findByEmailWithPassword(email);
      const employee =
        existing ??
        AppResponse.error({
          message: `Invalid email or password`,
          status: HttpStatus.BAD_REQUEST,
        });

      if (!employee?.password) {
        AppResponse.error({
          message: `Invalid email or password`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const passwordValid = await compare(password, employee?.password ?? '');
      if (!passwordValid) {
        AppResponse.error({
          message: `Invalid email or password`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const organizationId = employee?.organizationId ?? undefined;

      const payload = {
        sub: employee?._id?.toString(),
        email: employee?.email,
        userType: 'employee',
        organizationId,
      };
      const tokens = await this.tokenService?.generateTokenPair(payload);

      const refreshTokens: RefreshTokenEntry[] = [
        ...(employee?.refreshTokens ?? []),
        {
          tokenHash: this.authUtility.hash(tokens?.refreshToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ];

      await this.employeeRepository.updateById(employee._id.toString(), {
        refreshTokens,
      });

      this.logger.log(`Employee signed in: ${email}`);

      return {
        accessToken: tokens?.accessToken,
        refreshToken: tokens?.refreshToken,
        role: [SystemRole.EMPLOYEE],
        organizationId,
        status: employee.status,
      };
    } catch (error: any) {
      error.location = `EmployeeServices.${this.employeeLogin.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Refresh an expired employee access token using a valid
   * refresh token, rotating the refresh token. Mirrors the admin refresh flow.
   *
   * @param employeeRefreshTokenDto - Refresh token to validate and rotate
   * @returns New JWT access and refresh token pair
   *
   * @throws {400} Invalid refresh token, or employee not found
   */
  async employeeRefresh(
    employeeRefreshTokenDto: EmployeeRefreshTokenDto,
  ): Promise<unknown> {
    const { refreshToken } = employeeRefreshTokenDto;

    try {
      const payload = await this.tokenService?.verifyRefreshToken(refreshToken);

      const existing = await this.employeeRepository.findById(payload?.sub);
      const employee =
        existing ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      const tokenHash = this.authUtility.hash(refreshToken);
      const tokenExists = employee?.refreshTokens?.some(
        (t: RefreshTokenEntry) => t?.tokenHash === tokenHash,
      );
      if (!tokenExists) {
        AppResponse.error({
          message: `Invalid refresh token`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const refreshTokens: RefreshTokenEntry[] =
        employee?.refreshTokens?.filter(
          (t: RefreshTokenEntry) => t?.tokenHash !== tokenHash,
        ) ?? [];

      const newPayload = {
        sub: employee?._id?.toString(),
        email: employee?.email,
        userType: 'employee',
        organizationId: employee?.organizationId ?? undefined,
      };
      const tokens = await this.tokenService?.generateTokenPair(newPayload);

      refreshTokens.push({
        tokenHash: this.authUtility.hash(tokens?.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      await this.employeeRepository.updateById(employee._id.toString(), {
        refreshTokens,
      });

      return {
        accessToken: tokens?.accessToken,
        refreshToken: tokens?.refreshToken,
      };
    } catch (error: any) {
      error.location = `EmployeeServices.${this.employeeRefresh.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Generate a password reset token for a joined employee and
   * send the reset link via email. Returns a generic success message so the
   * response never reveals whether the account exists.
   *
   * @param employeeForgotPasswordDto - Email address requesting a reset
   * @returns Generic confirmation message
   */
  async employeeForgotPassword(
    employeeForgotPasswordDto: EmployeeForgotPasswordDto,
  ): Promise<unknown> {
    const email = employeeForgotPasswordDto.email.toLowerCase();

    try {
      const employee = await this.employeeRepository.findByEmail(email);

      if (employee?.hasJoinedOrg) {
        const rawToken = this.authUtility.randomToken();
        const tokenHash = this.authUtility.hash(rawToken);
        const resetTokenTtlMinutes =
          Number(this.configService.get<string>('RESET_TOKEN_TTL')) || 30;

        await this.employeeRepository.updateById(employee._id.toString(), {
          resetToken: {
            tokenHash,
            expiresAt: new Date(Date.now() + resetTokenTtlMinutes * 60 * 1000),
          },
        });

        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        const resetLink = `${frontendUrl}/auth/reset-password?token=${rawToken}`;

        function emailDispatcherPayload(): MailDispatcherDto {
          return {
            to: `${employee?.email}`,
            from: 'Foundation HR <no-reply@foundationhr.com>',
            subject: 'Password Token Request',
            html: passwordResetTemplate(employee?.email as string, resetLink),
          };
        }

        await this.emailService.brevoEmailDispatcher(emailDispatcherPayload());
        this.logger.log(`Password reset link sent to: ${email}`);
      }

      return `If this email is registered, a reset link has been sent`;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.employeeForgotPassword.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Reset an employee's password using a valid reset token.
   * Invalidates all existing sessions by clearing stored refresh tokens.
   *
   * @param employeeResetPasswordDto - Reset token and new password
   * @returns Success message after password reset
   *
   * @throws {400} Invalid or expired reset token
   */
  async employeeResetPassword(
    employeeResetPasswordDto: EmployeeResetPasswordDto,
  ): Promise<unknown> {
    const { token, password } = employeeResetPasswordDto;

    try {
      const tokenHash = this.authUtility.hash(token);
      const existing = await this.employeeRepository.findOne({
        'resetToken.tokenHash': tokenHash,
      });
      const employee =
        existing ??
        AppResponse.error({
          message: `Invalid or expired reset token`,
          status: HttpStatus.BAD_REQUEST,
        });

      if (
        employee?.resetToken?.expiresAt &&
        new Date() > new Date(employee?.resetToken?.expiresAt)
      ) {
        AppResponse.error({
          message: `Reset token has expired`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const hashedPassword = await hash(password, 10);

      await this.employeeRepository.updateById(employee._id.toString(), {
        password: hashedPassword,
        resetToken: null,
        refreshTokens: [],
      });

      this.logger.log(`Password reset successful for: ${employee?.email}`);

      return `Password reset successful for: ${employee?.email}`;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.employeeResetPassword.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Log an employee out by revoking their refresh token(s)
   *
   * @param employeeId - Mongo ID of the authenticated employee
   * @param refreshToken - Optional refresh token to revoke; when omitted, all sessions are cleared
   * @returns Success confirmation
   *
   * @throws {404} Employee not found
   */
  async employeeLogout(
    employeeId: string,
    refreshToken?: string,
  ): Promise<unknown> {
    try {
      const existing = await this.employeeRepository.findById(employeeId);
      const employee =
        existing ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      let revoked: RefreshTokenEntry[];
      if (refreshToken) {
        const tokenHash = this.authUtility.hash(refreshToken);
        revoked =
          employee?.refreshTokens?.filter(
            (t: RefreshTokenEntry) => t?.tokenHash !== tokenHash,
          ) ?? [];
      } else {
        revoked = [];
      }

      await this.employeeRepository.updateById(employeeId, {
        refreshTokens: revoked,
      });

      return 'Logged out successfully';
    } catch (error: any) {
      error.location = `EmployeeServices.${this.employeeLogout.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Load the onboarding payload for the authenticated employee
   *
   * @param email - Authenticated user's email
   * @returns The persisted onboarding data, completed steps and progress
   *
   * @throws {404} Employee not found
   * @throws {403} Invite has not been accepted yet
   */
  async getOnboarding(email: string): Promise<unknown> {
    try {
      const employee = await this.resolveOnboardingEmployee(email);

      return this.buildOnboardingPayload(employee);
    } catch (error: any) {
      error.location = `EmployeeServices.${this.getOnboarding.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Save step 1 (Basic information) — personal details, home
   * address and academic info. Supports partial saves ("Save & exit").
   *
   * @param email - Authenticated user's email
   * @param dto - personalDetails, homeAddress, academicInfo (all optional)
   * @returns The updated onboarding payload
   *
   * @throws {404} Employee not found
   * @throws {403} Invite has not been accepted yet
   */
  async saveOnboardingBasicInformation(
    email: string,
    onboardingBasicInformationDto: OnboardingBasicInformationDto,
  ): Promise<unknown> {
    try {
      const employee = await this.resolveOnboardingEmployee(email);

      const updated = await this.employeeRepository.updateById(
        employee._id.toString(),
        {
          ...onboardingBasicInformationDto,
          ...this.buildOnboardingUpdate(
            employee,
            OnboardingStep.BASIC_INFORMATION,
          ),
        },
      );

      return 'Onboarding basic information saved';
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveOnboardingBasicInformation.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Save step 3 (Associated contacts) — emergency contact,
   * guarantor and dependant records. The array replaces the persisted list.
   *
   * @param email - Authenticated user's email
   * @param dto - contacts array (optional, supports empty saves)
   * @returns The updated onboarding payload
   *
   * @throws {404} Employee not found
   * @throws {403} Invite has not been accepted yet
   */
  async saveOnboardingAssociatedContacts(
    email: string,
    onboardingContactsDto: OnboardingContactsDto,
  ): Promise<unknown> {
    try {
      const employee = await this.resolveOnboardingEmployee(email);

      await this.employeeRepository.updateById(employee._id.toString(), {
        ...onboardingContactsDto,
        ...this.buildOnboardingUpdate(
          employee,
          OnboardingStep.ASSOCIATED_CONTACTS,
        ),
      });

      return 'Onboarding contacts saved';
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveOnboardingAssociatedContacts.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Save step 4 (Finance information) — bank, pension and tax
   * details. Completing this final step marks the employee as active.
   *
   * @param email - Authenticated user's email
   * @param dto - bankDetails, pensionDetails, taxDetails (all optional)
   * @returns The updated onboarding payload
   *
   * @throws {404} Employee not found
   * @throws {403} Invite has not been accepted yet
   */
  async saveOnboardingFinanceInformation(
    email: string,
    onboardingFinanceInformationDto: OnboardingFinanceInformationDto,
  ): Promise<unknown> {
    try {
      const employee = await this.resolveOnboardingEmployee(email);

      const updated = await this.employeeRepository.updateById(
        employee._id.toString(),
        {
          ...onboardingFinanceInformationDto,
          ...this.buildOnboardingUpdate(
            employee,
            OnboardingStep.FINANCE_INFORMATION,
          ),
        },
      );

      return 'Onboarding finance information saved';
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveOnboardingFinanceInformation.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Resolve the employee behind an authenticated onboarding
   * request by email and verify their invite has been accepted
   */
  private async resolveOnboardingEmployee(
    email: string,
  ): Promise<EmployeeDocument> {
    const normalizedEmail = email?.trim().toLowerCase();

    const employee =
      (await this.employeeRepository.findByEmail(normalizedEmail)) ??
      AppResponse.error({
        message: `Employee not found`,
        status: HttpStatus.NOT_FOUND,
      });

    if (!employee.hasJoinedOrg) {
      AppResponse.error({
        message: `Please accept your invitation before completing onboarding`,
        status: HttpStatus.FORBIDDEN,
      });
    }

    return employee;
  }

  /**
   * @Responsibility: Compute the onboarding progression update for a completed
   * step, and finalize (completedAt + ACTIVE) when the last step is done
   */
  private buildOnboardingUpdate(
    employee: EmployeeDocument,
    step: OnboardingStep,
  ): Record<string, any> {
    const completed = [...(employee.onboarding?.completedSteps ?? [])];
    if (!completed.includes(step)) {
      completed.push(step);
    }

    const update: Record<string, any> = {
      'onboarding.startedAt': employee.onboarding?.startedAt ?? new Date(),
      'onboarding.completedSteps': completed,
    };

    if (
      step === OnboardingStep.FINANCE_INFORMATION &&
      !employee.onboarding?.completedAt &&
      this.isOnboardingComplete(completed)
    ) {
      update['onboarding.completedAt'] = new Date();
      update.status = EmployeeStatus.ACTIVE;
    }

    return update;
  }

  /**
   * @Responsibility: Report whether all onboarding steps have been completed
   */
  private isOnboardingComplete(steps: OnboardingStep[]): boolean {
    const required = Object.values(OnboardingStep);
    return required.every((step) => steps.includes(step as OnboardingStep));
  }

  /**
   * @Responsibility: Map completed steps to the design's progress percentages
   * (basic 20% -> contacts 60% -> finance 100%)
   */
  private computeProgress(steps: OnboardingStep[]): number {
    if (steps.includes(OnboardingStep.BASIC_INFORMATION)) {
      if (steps.includes(OnboardingStep.FINANCE_INFORMATION)) return 100;
      if (steps.includes(OnboardingStep.ASSOCIATED_CONTACTS)) return 60;
      return 20;
    }
    return 0;
  }

  /**
   * @Responsibility: Shape the persisted employee into the onboarding payload
   * returned to the frontend
   */
  private buildOnboardingPayload(
    employee: EmployeeDocument,
  ): Record<string, any> {
    const completedSteps = employee.onboarding?.completedSteps ?? [];

    return {
      employeeId: employee._id?.toString(),
      firstName: employee.firstName ?? null,
      lastName: employee.lastName ?? null,
      middleName: employee.middleName ?? null,
      email: employee.email,
      employeeType: employee.employeeType ?? null,
      employmentDate: employee.employmentDate ?? null,
      personalDetails: employee.personalDetails ?? null,
      homeAddress: employee.homeAddress ?? null,
      academicInfo: employee.academicInfo ?? null,
      contacts: employee.contacts ?? [],
      financeInformation: employee.financeInformation ?? null,
      completedSteps,
      progress: this.computeProgress(completedSteps),
      status: employee.status,
    };
  }

  /**
   * @Responsibility: Coerce empty/blank values to null for clean persistence
   */
  private normalize(value: any): any {
    if (value === undefined || value === null || value === '') return null;
    return value;
  }

  /**
   * @Responsibility: Build and dispatch the employee invitation email
   */
  private async dispatchInvite(
    email: any,
    inviteExpiresAt: Date,
    organizationDetails: any,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const inviteLink = `${frontendUrl}/auth/invite?orgSlug=${organizationDetails?.slug}`;
    const organizationName = organizationDetails?.name;
    const expiryDate = inviteExpiresAt
      ? new Date(inviteExpiresAt)
      : new Date(Date.now() + INVITE_LINK_TTL_MS);
    const expiryInfo = `This invitation link expires in 1 hour (on ${expiryDate.toLocaleString()}).`;

    const payload: MailDispatcherDto = {
      to: email,
      from: 'Foundation HR <no-reply@foundationhr.com>',
      subject: 'You have been invited to join',
      html: employeeInviteTemplate(inviteLink, organizationName, expiryInfo),
    };

    await this.emailService.brevoEmailDispatcher(payload);
  }

  /**
   * @Responsibility: Retrieve employees in batches with free-text search,
   * filters, sorting and pagination
   *
   * @param query - Search/filter/sort/page parameters
   * @returns Paginated result: items, total, page, pageSize, totalPages
   */
  async listEmployees(
    query: ListEmployeeQuery,
  ): Promise<PaginatedResult<unknown>> {
    try {
      const batch = query?.batch ?? 1;
      const limit = query?.limit ?? 10;

      const filters: ListEmployeeFilters = {
        // q: query.q,
        // employeeType: query.employeeType,
        // department: query.department,
        // jobTitle: query.jobTitle,
        // jobType: query.jobType,
        // status: query.status,
        // location: query.location,
        // supervisorId: query.supervisorId,
        organizationId: query.organizationId,
      };

      const sort = this.buildSort(
        query.sortBy ?? 'createdAt',
        query.sortDir ?? 'desc',
      );

      const { items, total } = await this.employeeRepository.paginatedQuery(
        filters,
        sort,
        batch,
        limit,
      );

      return { data: items, count: total };
    } catch (error: any) {
      error.location = `EmployeeServices.${this.listEmployees.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Assemble an organization's reporting hierarchy as a
   * nested tree. Employees whose supervisor field is null (or whose
   * supervisor does not belong to the organization) are the root nodes.
   *
   * @param organizationId - Organization to build the hierarchy for
   * @returns {Promise<HierarchyTreeNode[]>}
   */
  async getOrganisationHierarchy(
    organizationId: string,
  ): Promise<HierarchyTreeNode[]> {
    try {
      const employees = await this.employeeRepository.findByOrganization(
        organizationId,
        '_id firstName lastName employeeUniqueId department jobTitle supervisor',
      );

      const nodes = new Map<string, HierarchyTreeNode>();

      for (const employee of employees) {
        nodes.set(employee._id.toString(), {
          ...(employee as any).toObject(),
          children: [],
        });
      }

      const roots: HierarchyTreeNode[] = [];

      for (const node of nodes.values()) {
        const supervisorId = node.supervisor ? String(node.supervisor) : null;
        const parent = supervisorId ? nodes.get(supervisorId) : undefined;

        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }

      return roots;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.getOrganisationHierarchy.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Reassign an employee's supervisor (reporting line).
   * The supervisor is referenced by employee Mongo id. Passing a null
   * supervisorId makes the employee the root of the hierarchy (e.g. the CEO).
   *
   * @param employeeId - Mongo id of the employee being reassigned
   * @param supervisorId - Mongo id of the new supervisor, or null to unassign
   * @param organizationId - Organization scope for the assignment
   * @returns The updated employee
   *
   * @throws {400} Self-assignment or circular reporting line
   * @throws {404} Employee or supervisor not found
   */
  async updateSupervisor(
    employeeId: string,
    supervisorId: string | null,
    organizationId: string,
  ): Promise<EmployeeDocument> {
    try {
      const where: QueryFilter<EmployeeDocument> = {
        _id: employeeId,
        ...(organizationId ? { organizationId } : {}),
      };

      const employee = await this.employeeRepository.findOne(where);

      if (!employee) {
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (!supervisorId) {
        const updated = await this.employeeRepository.updateById(employeeId, {
          supervisor: null,
        });
        this.logger.log(
          `Unassigned supervisor for employee ${employeeId} (org ${organizationId})`,
        );
        return updated!;
      }

      if (supervisorId === employeeId) {
        AppResponse.error({
          message: `An employee cannot be their own supervisor`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const supervisor = await this.employeeRepository.findOne({
        _id: supervisorId,
        ...(organizationId ? { organizationId } : {}),
      });

      if (!supervisor) {
        AppResponse.error({
          message: `Supervisor not found`,
          status: HttpStatus.NOT_FOUND,
        });
      }

      const cycleDetected = await this.hasCycle(
        supervisorId,
        employeeId,
        organizationId,
      );

      if (cycleDetected) {
        AppResponse.error({
          message: `Reassigning this supervisor would create a circular reporting line`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const updated = await this.employeeRepository.updateById(employeeId, {
        supervisor: supervisorId,
      });

      this.logger.log(
        `Reassigned supervisor of employee ${employeeId} to ${supervisorId}`,
      );
      return updated!;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.updateSupervisor.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Walk the supervisor chain starting at the given employee
   * and report whether it would loop back to the employee being reassigned
   */
  private async hasCycle(
    startEmployeeId: string,
    targetEmployeeId: string,
    organizationId: string,
    visited: string[] = [],
  ): Promise<boolean> {
    if (startEmployeeId === targetEmployeeId) {
      return true;
    }

    if (visited.includes(startEmployeeId)) {
      return true;
    }

    const employee = await this.employeeRepository.findOne({
      _id: startEmployeeId,
      ...(organizationId ? { organizationId } : {}),
    });

    const nextSupervisorId = employee?.supervisor ?? null;

    if (!nextSupervisorId) {
      return false;
    }

    return this.hasCycle(nextSupervisorId, targetEmployeeId, organizationId, [
      ...visited,
      startEmployeeId,
    ]);
  }

  /**
   * @Responsibility: Build a Mongo sort specifier, resolving the UI's sortable
   * 'name' alias to firstName+lastName
   */
  private buildSort(sortBy: string, sortDir: string): Record<string, 1 | -1> {
    const direction = sortDir === 'asc' ? 1 : -1;

    if (sortBy === 'name') {
      return { firstName: direction, lastName: direction };
    }

    return { [sortBy]: direction };
  }
}
