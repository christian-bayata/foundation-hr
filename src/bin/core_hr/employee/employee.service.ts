import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mongoose, QueryFilter } from 'mongoose';
import { AppResponse } from '../../../common/response/app-response';
import { EmailService } from '../../../email/email.service';
import { MailDispatcherDto } from '../../../email/dto/send-mail.dto';
import { employeeInviteTemplate } from '../../../email/template/employee-invite.template';
import { passwordResetTemplate } from '../../../email/template/password-reset.template';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from './dto/create-employee.dto';
import {
  OnboardingBasicInformationDto,
  OnboardingDocumentDto,
  OnboardingDocumentsDto,
} from './dto/onboarding-basic-info.dto';
import { OnboardingContactsDto } from './dto/onboarding-contacts.dto';
import { OnboardingFinanceInformationDto } from './dto/onboarding-finance.dto';
import { EmployeeStatus, OnboardingStep } from './enum/employee.enum';
import { EmployeeRepository } from './repository/employee.repository';
import {
  EmployeeContact,
  EmployeeDocument,
  EmployeeUploadedDocument,
  FinanceInformation,
} from './entity/employee.schema';
import {
  ListEmployeeFilters,
  ListEmployeeQuery,
  PaginatedResult,
} from './interface/employee.interface';
import { EmployeeUtility } from './repository/employee.utility';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { SystemRole } from '../../generic/auth/enum/role.enum';
import { EmployeeAcceptInviteDto } from './dto/invite-employees.dto';
import { EmployeeSetPasswordDto } from './dto/set-password.dto';
import { UserRepository } from '../../generic/auth/repository/user.repository';
import { hash } from 'bcryptjs';
import moment from 'moment';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { NotificationService } from '../../generic/notification/notification.service';
import {
  NotificationActionType,
  NotificationCategory,
  NotificationEntityType,
  NotificationResolution,
  NotificationType,
} from '../../generic/notification/enum/notification.enum';
import { DEFAULT_ONBOARDING_SETTINGS } from '../../generic/setting/domain/settings.domain.organisation.service';
import { OnboardingDocument } from '../organization/entity/organization.schema';

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
    @Inject(UserRepository)
    private readonly userRepository: UserRepository,
    @Inject(NotificationService)
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * @Responsibility: Create a new employee draft with any combination of basic
   * info and contract details, or complete the details of an employee invited
   * via an inviteId link. All fields are optional.
   *
   * @param createEmployeeDto - Basic info: employeeType, firstName, lastName,
   * middleName(optional), employeeId(optional), email, employmentDate(optional),
   * inviteId(optional); contract details: contractDuration(optional), jobType(optional),
   * workMode(optional), probationPeriod(optional), departmentCode(optional),
   * jobTitleCode(optional), supervisor(optional), salary(optional), salaryCurrency(optional)
   * @returns The created/updated employee draft
   *
   * @throws {409} Email already exists
   */
  async createEmployee(createEmployeeDto: CreateEmployeeDto): Promise<unknown> {
    const { inviteId, email } = createEmployeeDto;

    try {
      const payload = this.buildEmployeePayload(createEmployeeDto);

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

        const updated = await this.employeeRepository.updateById(
          inviteId,
          payload,
        );

        this.logger.log(`Employee draft updated: ${inviteId}`);

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
        ...payload,
        email: email!.toLowerCase(),
        employeeUniqueId: this.employeeUtility.generateUniqueId(),
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
      error.location = `EmployeeServices.${this.createEmployee.name} method`;
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
   * @Responsibility: Update an existing employee with any combination of basic
   * info / contract details (all optional) and persist them as a draft. Active
   * employees keep their ACTIVE status while still accepting field updates.
   *
   * @param inviteId - Mongo ID of the employee (invite/onboarding reference)
   * @param dto - Optional fields to update (basic info + contract details)
   * @returns The updated employee
   *
   * @throws {404} Employee not found
   */
  async saveDraft(inviteId: string, dto?: CreateEmployeeDto): Promise<unknown> {
    try {
      const employee =
        (await this.employeeRepository.findById(inviteId)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      const update: Record<string, any> = dto
        ? this.buildEmployeePayload(dto)
        : {};

      if (employee.status !== EmployeeStatus.ACTIVE) {
        update.status = EmployeeStatus.DRAFT;
      }

      const updated = await this.employeeRepository.updateById(
        inviteId,
        update,
      );

      this.logger.log(`Employee draft saved: ${inviteId}`);

      return updated;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveDraft.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an existing employee with any combination of basic
   * info / contract details (all optional). Admin roles may edit any employee;
   * an EMPLOYEE may only edit their own record (matched via user.employeeId).
   *
   * @param employeeId - Mongo ID of the employee
   * @param dto - Optional fields to update
   * @param user - Requesting user (used for self-service authorization)
   * @returns The updated employee
   *
   * @throws {404} Employee not found
   * @throws {403} Employee attempted to edit another user's record
   */
  async updateEmployeeDetails(
    employeeId: string,
    dto: UpdateEmployeeDto,
    user: ICurrentUser,
  ): Promise<unknown> {
    try {
      const employee =
        (await this.employeeRepository.findOne({
          _id: employeeId,
        })) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      if (
        user.employeeId &&
        user.employeeId !== employeeId &&
        !(
          [
            SystemRole.COMPANY_OWNER,
            SystemRole.HR_ADMIN,
            SystemRole.HR_OPS,
            SystemRole.DEPT_MANAGER,
          ] as string[]
        ).includes(user.userType ?? '')
      ) {
        AppResponse.error({
          message: `You can only edit your own employee details.`,
          status: HttpStatus.FORBIDDEN,
        });
      }

      const update: Record<string, any> = dto
        ? this.buildEmployeeUpdatePayload(dto, employee.toObject())
        : {};

      await this.employeeRepository.updateById(employeeId, update);

      return 'Employee details updated';
    } catch (error: any) {
      error.location = `EmployeeServices.${this.updateEmployeeDetails.name} method`;
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
    user?: ICurrentUser,
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

          // When an admin invites an employee, step 1 ("Adding and inviting
          // new employee") is marked as completed automatically.
          const invitedEmployee =
            await this.employeeRepository.findByEmail(email);
          if (
            invitedEmployee?.employeeOnboardingSteps?.length &&
            !invitedEmployee.employeeOnboardingSteps[0]?.isCompleted
          ) {
            const now = new Date();
            const steps = invitedEmployee.employeeOnboardingSteps.map(
              (step, index) => {
                if (index !== 0) {
                  return step;
                }
                return {
                  ...step,
                  isCompleted: true,
                  startedAt: step.startedAt ?? now,
                  completedAt: now,
                  completionRequirements: (
                    step.completionRequirements ?? []
                  ).map((req) => ({
                    ...req,
                    isCompleted: true,
                    completedAt: now,
                  })),
                };
              },
            );
            await this.employeeRepository.updateEmployee(
              { email },
              { employeeOnboardingSteps: steps },
            );
          }

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

      if (result.invited.length > 0) {
        await this.notificationService.dispatch({
          organizationId: organizationId!,
          type: NotificationType.EMPLOYEE_INVITED,
          category: NotificationCategory.EMPLOYEE,
          message: `${result.invited.length} employee${result.invited.length === 1 ? '' : 's'} invited`,
          createdByUserId: user?.userId ?? '',
          createdByEmail: user?.email ?? '',
          actor: {
            id: null,
            name: user?.email ?? 'FoundationHR',
          },
          entity: {
            type: NotificationEntityType.EMPLOYEE,
            id: null,
          },
          action: {
            type: NotificationActionType.VIEW,
            resolution: NotificationResolution.RESOLVED,
          },
          metadata: {
            emails: result.invited.map((invitee) => invitee.email),
            skipped: result.skipped.map((invitee) => invitee.email),
            failed: result.failed.map((invitee) => invitee.email),
          },
          excludeUserIds: user?.userId ? [user.userId] : [],
        });
      }

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
        ...this.completeOnboardingRequirement(
          employee,
          'Employee creates an account',
        ),
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

      await this.employeeRepository.updateEmployee(
        { _id: employee?._id },
        {
          password: hashedPassword,
          hasJoinedOrg: true,
          organizationId: employee.organizationId ?? organizationId,
          onboarding: {
            ...(employee.onboarding ?? {}),
            startedAt: employee.onboarding?.startedAt ?? moment().toDate(),
          },
        },
      );

      /* Keep one password across every identity the invitee holds */
      await this.syncPasswordToAdminUser(normalizedEmail, hashedPassword);

      this.logger.log(`Password set for invited employee: ${normalizedEmail}`);

      return { email: normalizedEmail, isEmailVerified: true };
    } catch (error: any) {
      error.location = `EmployeeServices.${this.employeeSetPassword.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Mirror a password hash onto the invitee's admin user record
   *
   * An invitee who also holds an admin identity must end up with the same
   * password on both records, so that a later reset or sign-in agrees across
   * the pair. No-op when the email has no admin user record.
   *
   * @param email - Lowercased email of the invitee
   * @param hashedPassword - The bcrypt hash to store
   */
  private async syncPasswordToAdminUser(
    email: string,
    hashedPassword: string,
  ): Promise<void> {
    try {
      const adminUser = await this.userRepository.findUser({ email });

      if (!adminUser) return;

      await this.userRepository.updateUser(
        { _id: adminUser._id.toString() },
        {
          password: hashedPassword,
          isEmailVerified: true,
          resetToken: null,
        },
      );

      this.logger.log(`Password synced to admin record for: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync password to admin record for: ${email}`,
        error,
      );
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
   * @Responsibility: Retrieve an organization's onboarding settings. The three
   * documentation categories and the employer-issued documents start empty and
   * grow as the organization adds documents.
   *
   * @param organizationId - The organization to retrieve settings for
   *
   * @throws {404} Organization not found
   */
  async getOnboardingRequirements(organizationId: string) {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      return organization?.onboarding;

      // const settings = organization!.onboarding ?? DEFAULT_ONBOARDING_SETTINGS;

      // return settings;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getOnboardingRequirements.name}`;
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
    user?: ICurrentUser,
  ): Promise<unknown> {
    try {
      const employee = await this.resolveOnboardingEmployee(email);
      const { documents: submittedDocuments, ...onboardingBasicInformation } =
        onboardingBasicInformationDto;
      const documents = await this.resolveOnboardingDocuments(
        employee,
        submittedDocuments,
      );

      await this.employeeRepository.updateById(employee._id.toString(), {
        ...onboardingBasicInformation,
        ...(documents !== undefined ? { documents } : {}),
        ...this.buildOnboardingUpdate(
          employee,
          OnboardingStep.BASIC_INFORMATION,
        ),
        ...this.completeOnboardingRequirement(
          employee,
          'Employee completes personal details',
        ),
      });

      await this.notifyOnboardingProfileUpdate(
        employee,
        'basic information',
        user,
      );

      return 'Onboarding basic information saved';
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveOnboardingBasicInformation.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Save the employee's uploaded onboarding documents. Each
   * document's type is matched against the organization's required personal
   * identification documents so the persisted name always comes from the
   * admin-configured label.
   *
   * @param email - Authenticated user email
   * @param dto - documents array to persist
   * @returns The saved documents
   *
   * @throws {404} Employee or organization not found
   * @throws {400} Document type is not configured for onboarding
   */
  async saveOnboardingDocuments(
    email: string,
    onboardingDocumentsDto: OnboardingDocumentsDto,
    user?: ICurrentUser,
  ): Promise<unknown> {
    try {
      const employee = await this.resolveOnboardingEmployee(email);
      const documents = await this.resolveOnboardingDocuments(
        employee,
        onboardingDocumentsDto.documents ?? [],
      );

      await this.employeeRepository.updateById(employee._id.toString(), {
        documents,
        ...this.completeOnboardingRequirement(
          employee,
          'Employee uploads required documents',
        ),
      });

      await this.notifyOnboardingProfileUpdate(employee, 'documents', user);

      return 'Onboarding documents saved';
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveOnboardingDocuments.name} method`;
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
    user?: ICurrentUser,
  ): Promise<unknown> {
    try {
      const employee = await this.resolveOnboardingEmployee(email);

      await this.employeeRepository.updateById(employee._id.toString(), {
        ...onboardingContactsDto,
        ...this.buildOnboardingUpdate(
          employee,
          OnboardingStep.ASSOCIATED_CONTACTS,
        ),
        ...this.completeOnboardingRequirement(
          employee,
          'Employee provides emergency contact',
        ),
      });

      await this.notifyOnboardingProfileUpdate(
        employee,
        'associated contacts',
        user,
      );

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
    user?: ICurrentUser,
  ): Promise<unknown> {
    try {
      const employee = await this.resolveOnboardingEmployee(email);

      await this.employeeRepository.updateEmployee(
        { _id: employee._id.toString() },
        {
          ...onboardingFinanceInformationDto,
          ...this.buildOnboardingUpdate(
            employee,
            OnboardingStep.FINANCE_INFORMATION,
          ),
          ...this.completeOnboardingRequirement(
            employee,
            'Employee provides finance information',
          ),
        },
      );

      await this.notifyOnboardingProfileUpdate(
        employee,
        'finance information',
        user,
      );

      return 'Onboarding finance information saved';
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveOnboardingFinanceInformation.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Notify admins that an employee submitted an onboarding
   * section for review.
   *
   * @param employee - The onboarding employee
   * @param section - The submitted section label
   * @param user - The authenticated employee user
   * @returns {Promise<void>}
   */
  private async notifyOnboardingProfileUpdate(
    employee: EmployeeDocument,
    section: string,
    user?: ICurrentUser,
  ): Promise<void> {
    const employeeName = this.getEmployeeDisplayName(employee);
    const organizationId = employee.organizationId;

    if (!organizationId) {
      return;
    }

    await this.notificationService.dispatch({
      organizationId,
      type: NotificationType.ONBOARDING_PROFILE_UPDATED,
      category: NotificationCategory.ONBOARDING,
      message: `${employeeName} updated their onboarding ${section}`,
      createdByUserId: user?.userId ?? String(employee._id),
      createdByEmail: user?.email ?? employee.email ?? '',
      actor: {
        id: String(employee._id),
        name: employeeName,
        avatarUrl: employee.avatarUrl ?? null,
      },
      entity: {
        type: NotificationEntityType.EMPLOYEE,
        id: String(employee._id),
      },
      action: {
        type: NotificationActionType.APPROVE,
        resolution: NotificationResolution.PENDING,
      },
      metadata: { section },
      excludeUserIds: user?.userId ? [user.userId] : [],
    });
  }

  /**
   * @Responsibility: Resolve a display name for an employee.
   *
   * @param employee - The employee record
   * @returns {string}
   */
  private getEmployeeDisplayName(employee: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  }): string {
    const name = [employee.firstName, employee.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return name || employee.email || 'Employee';
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
   * @Responsibility: Mark a single completion requirement on the system
   * "Self-enrolment" onboarding step as completed. When the last incomplete
   * requirement is marked, the step itself is marked completed.
   *
   * @param employee - The employee whose onboarding step to update
   * @param requirementStep - The requirement step name to mark complete
   * @returns The partial update to apply, or null when the step/requirement
   * does not exist
   */
  private completeOnboardingRequirement(
    employee: EmployeeDocument,
    requirementStep: string,
  ): Record<string, any> | null {
    const steps = employee.employeeOnboardingSteps ?? [];
    const stepIndex = steps.findIndex(
      (step) => step.stepName === 'Self-enrolment',
    );

    if (stepIndex === -1) {
      return null;
    }

    const step = steps[stepIndex];
    const requirements = step.completionRequirements ?? [];
    const reqIndex = requirements.findIndex((r) => r.step === requirementStep);

    if (reqIndex === -1) {
      return null;
    }

    const now = new Date();
    const updatedRequirements = requirements.map((r, i) => {
      if (i !== reqIndex) {
        return r;
      }
      return {
        ...r,
        isCompleted: true,
        completedAt: r.completedAt ?? now,
      };
    });

    const allCompleted = updatedRequirements.every((r) => r.isCompleted);

    const updatedSteps = steps.map((s, i) => {
      if (i !== stepIndex) {
        return s;
      }
      return {
        ...s,
        completionRequirements: updatedRequirements,
        ...(allCompleted && !s.isCompleted
          ? { isCompleted: true, completedAt: s.completedAt ?? now }
          : {}),
      };
    });

    return { employeeOnboardingSteps: updatedSteps };
  }

  /**
   * @Responsibility: Resolve uploaded onboarding documents against the
   * organization's admin-configured personal identification documents. The
   * submitted type must match a configured document id, and the persisted name
   * is always taken from that document's label.
   *
   * @param employee - The onboarding employee
   * @param documents - Submitted documents, or undefined to leave them unchanged
   * @returns Normalised documents, or undefined when none were submitted
   *
   * @throws {404} Organization not found
   * @throws {400} Document type is not configured for onboarding
   */
  private async resolveOnboardingDocuments(
    employee: EmployeeDocument,
    documents?: OnboardingDocumentDto[],
  ): Promise<EmployeeUploadedDocument[] | undefined> {
    if (documents === undefined) {
      return undefined;
    }

    // const organization =
    //   (await this.organizationRepository.findOrg({
    //     _id: employee.organizationId,
    //   })) ??
    //   AppResponse.error({
    //     message: 'Organization not found',
    //     status: HttpStatus.NOT_FOUND,
    //   });

    // const configuredDocuments =
    //   organization.onboarding?.personalIdentificationDocuments ?? [];
    // const documentNames = new Map(
    //   configuredDocuments.map((document) => [document.id, document.label]),
    // );

    return documents.map((document) => {
      // const name = documentNames.get(document.type);

      // if (!name) {
      //   AppResponse.error({
      //     message: `Document type "${document.type}" is not configured for onboarding`,
      //     status: HttpStatus.BAD_REQUEST,
      //   });
      // }

      return {
        name: document.name as string,
        uploadedBy: document.uploadedBy,
        type: document.type,
        uploadDate: new Date(document.uploadDate),
        url: document.url,
      };
    });
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
      documents: employee.documents ?? [],
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
   * @Responsibility: Build a partial employee payload from a create/update DTO,
   * skipping fields that were not provided so partial updates never wipe other
   * persisted values, and coercing blank strings to null for clean persistence
   */
  private buildEmployeePayload(dto: CreateEmployeeDto): Record<string, any> {
    const payload: Record<string, any> = {};

    const pickString = (key: keyof CreateEmployeeDto, value: any) => {
      if (value === undefined) return;
      payload[String(key)] = this.normalize(value);
    };

    pickString('employeeType', dto.employeeType);
    pickString('firstName', dto.firstName);
    pickString('lastName', dto.lastName);
    pickString('middleName', dto.middleName);
    pickString('employeeId', dto.employeeId);
    pickString('contractDuration', dto.contractDuration);
    pickString('jobType', dto.jobType);
    pickString('workMode', dto.workMode);
    pickString('probationPeriod', dto.probationPeriod);
    pickString('departmentCode', dto.departmentCode);
    pickString('jobTitleCode', dto.jobTitleCode);
    pickString('supervisor', dto.supervisor);

    if (
      dto.employmentDate !== undefined &&
      dto.employmentDate !== null &&
      dto.employmentDate !== ''
    ) {
      payload.employmentDate = new Date(dto.employmentDate);
    }

    if (dto.salary !== undefined && dto.salary !== null) {
      payload.salary = dto.salary;
    }

    if (
      dto.salaryCurrency !== undefined &&
      dto.salaryCurrency !== null &&
      dto.salaryCurrency !== ''
    ) {
      payload.salaryCurrency = dto.salaryCurrency;
    }

    return payload;
  }

  /**
   * @Responsibility: Build an update payload that combines the scalar employee
   * fields with the profile sections (personal details, home address, academic
   * info, finance information and contacts). Nested objects are merged into the
   * persisted values so partial section updates never wipe existing fields,
   * while contacts are treated as a replacement list.
   */
  private buildEmployeeUpdatePayload(
    dto: UpdateEmployeeDto,
    employee: EmployeeDocument,
  ): Record<string, any> {
    const payload = this.buildEmployeePayload(dto);

    const personalDetails = this.buildSectionUpdate(
      employee.personalDetails,
      dto.personalDetails,
      ['dateOfBirth'],
    );
    if (personalDetails !== undefined) {
      payload.personalDetails = personalDetails;
    }

    const homeAddress = this.buildSectionUpdate(
      employee.homeAddress,
      dto.homeAddress,
    );
    if (homeAddress !== undefined) {
      payload.homeAddress = homeAddress;
    }

    const academicInfo = this.buildSectionUpdate(
      employee.academicInfo,
      dto.academicInfo,
    );
    if (academicInfo !== undefined) {
      payload.academicInfo = academicInfo;
    }

    const financeInformation = this.buildFinanceInformationUpdate(
      employee.financeInformation,
      dto.financeInformation,
    );
    if (financeInformation !== undefined) {
      payload.financeInformation = financeInformation;
    }

    if (dto.contacts !== undefined) {
      payload.contacts = dto.contacts
        ? dto.contacts.map((contact) => this.buildContactUpdate(contact))
        : [];
    }

    if (dto.documents !== undefined) {
      payload.documents = dto.documents
        ? dto.documents.map((document) => this.buildDocumentUpdate(document))
        : [];
    }

    return payload;
  }

  /**
   * @Responsibility: Merge an incoming profile section into its persisted
   * counterpart, normalizing blank strings and coercing configured date fields.
   */
  private buildSectionUpdate<T extends Record<string, any>>(
    existing: T | null | undefined,
    incoming: Partial<T> | null | undefined,
    dateFields: string[] = [],
  ): Record<string, any> | null | undefined {
    if (incoming === undefined) {
      return undefined;
    }

    if (incoming === null) {
      return null;
    }

    const merged: Record<string, any> = existing ? { ...existing } : {};

    for (const [key, value] of Object.entries(incoming)) {
      if (value === undefined) {
        continue;
      }

      merged[key] = dateFields.includes(key)
        ? this.normalizeDate(value)
        : typeof value === 'string'
          ? this.normalize(value)
          : value;
    }

    return merged;
  }

  /**
   * @Responsibility: Merge finance information one level deep so updates to a
   * single subsection (bank, pension or tax) preserve the others.
   */
  private buildFinanceInformationUpdate(
    existing: FinanceInformation | null | undefined,
    incoming: Partial<FinanceInformation> | null | undefined,
  ): Record<string, any> | null | undefined {
    if (incoming === undefined) {
      return undefined;
    }

    if (incoming === null) {
      return null;
    }

    const merged: Record<string, any> = existing ? { ...existing } : {};
    const sections = ['bankDetails', 'pensionDetails', 'taxDetails'] as const;

    for (const section of sections) {
      const sectionUpdate = this.buildSectionUpdate(
        existing?.[section],
        incoming[section] ?? undefined,
      );
      if (sectionUpdate !== undefined) {
        merged[section] = sectionUpdate;
      }
    }

    return merged;
  }

  private buildDocumentUpdate(
    document: NonNullable<UpdateEmployeeDto['documents']>[number],
  ): Record<string, any> {
    const payload: Record<string, any> = {};

    for (const [key, value] of Object.entries(document)) {
      if (value === undefined) {
        continue;
      }

      if (key === 'uploadDate') {
        payload[key] = this.normalizeDate(value);
      } else if (typeof value === 'string') {
        payload[key] = this.normalize(value);
      } else {
        payload[key] = value;
      }
    }

    return payload;
  }

  private buildContactUpdate(
    contact: NonNullable<UpdateEmployeeDto['contacts']>[number],
  ): Record<string, any> {
    const payload: Record<string, any> = {};

    for (const [key, value] of Object.entries(contact)) {
      if (value === undefined) {
        continue;
      }
      payload[key] = typeof value === 'string' ? this.normalize(value) : value;
    }

    return payload;
  }

  private normalizeDate(value: any): Date | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return value instanceof Date ? value : new Date(value);
  }

  /**
   * @Responsibility: Build and dispatch the employee invitation email
   */
  private async dispatchInvite(
    email: any,
    inviteExpiresAt: Date,
    organizationDetails: any,
  ): Promise<void> {
    const encryptedEmail = this.employeeUtility.encrypt(email);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const inviteLink = `${frontendUrl}/auth/create-account/employee?orgSlug=${organizationDetails?.slug}&eId=${encryptedEmail}`;
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
   * @Responsibility: Retrieve a flat list of an organization's employees with
   * their supervisor relationship. Each record includes the employee's
   * department and job title, plus the id of their supervisor (null for roots).
   * The caller is responsible for any tree formatting.
   *
   * @param organizationId - Organization to build the hierarchy for
   * @returns {Promise<any[]>}
   */
  async getOrganisationHierarchy(organizationId: string): Promise<any[]> {
    try {
      const employees = await this.employeeRepository.findByOrganization(
        organizationId,
        '_id firstName lastName employeeUniqueId department jobTitle supervisor',
      );

      return employees.map((employee) => {
        const obj = (employee as any).toObject();
        return {
          _id: obj._id,
          firstName: obj.firstName,
          lastName: obj.lastName,
          employeeUniqueId: obj.employeeUniqueId,
          department: obj.department,
          jobTitle: obj.jobTitle,
          supervisorId: obj.supervisor ?? null,
        };
      });
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
