import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { hash } from 'bcryptjs';
import { RoleRepository } from '../access-control/repository/role.repository';
import { UserRoleRepository } from '../access-control/repository/user-role.repository';
import { InviteeUserRepository } from '../access-control/repository/invitee-user.repository';
import { RoleDocument } from '../access-control/entity/role.schema';
import { UserRoleDocument } from '../access-control/entity/user-role.schema';
import { SystemRole } from '../../auth/enum/role.enum';
import { InfoAccess } from '../../auth/enum/info-access.enum';
import { PermissionModule } from '../../auth/enum/module.enum';
import { UserType } from '../../auth/enum/user.enum';
import { CreateRoleDto } from '../access-control/dto/create-role.dto';
import {
  AddCompanyAdminDto,
  UpdateCompanyAdminRoleDto,
} from '../access-control/dto/company-admin.dto';
import { AdminStatus } from '../access-control/enum/admin-status.enum';
import {
  ADMIN_ASSIGNMENT_LABELS,
  CompanyAdminRow,
  ListCompanyAdminFilters,
  ListCompanyAdminQuery,
  PaginatedResult,
  TimestampedUserRole,
} from '../access-control/interface/company-admin.interface';
import { AppResponse } from '../../../common/response/app-response';
import { EmailService } from '../../../email/email.service';
import { roleInviteTemplate } from '../../../email/template/role-invite.template';
import { MailDispatcherDto } from '../../../email/dto/send-mail.dto';
import { OrganizationRepository } from '../../organization/repository/organization.repository';
import { JobTitleRepository } from '../../organization/repository/job-title.repository';
import { EmployeeRepository } from '../../employee/repository/employee.repository';
import { AuthUtility } from '../../auth/auth.utility';
import { UserRoleFlag } from '../organisation/enum/organisation.enum';

const SYSTEM_ROLE_DEFAULTS: {
  name: string;
  systemRole: SystemRole;
  infoAccess: InfoAccess;
}[] = [
  {
    name: 'Owner',
    systemRole: SystemRole.COMPANY_OWNER,
    infoAccess: InfoAccess.EVERYONE,
  },
  {
    name: 'HR Admin',
    systemRole: SystemRole.HR_ADMIN,
    infoAccess: InfoAccess.EVERYONE,
  },
  {
    name: 'HR Ops',
    systemRole: SystemRole.HR_OPS,
    infoAccess: InfoAccess.EVERYONE,
  },
  {
    name: 'Dept Manager',
    systemRole: SystemRole.DEPT_MANAGER,
    infoAccess: InfoAccess.EVERYONE,
  },
  {
    name: 'Employee',
    systemRole: SystemRole.EMPLOYEE,
    infoAccess: InfoAccess.DIRECT_REPORTS_ONLY,
  },
  {
    name: 'IT Admin',
    systemRole: SystemRole.IT_ADMIN,
    infoAccess: InfoAccess.EVERYONE,
  },
  {
    name: 'Finance',
    systemRole: SystemRole.FINANCE,
    infoAccess: InfoAccess.EVERYONE,
  },
];

const ALL_MODULES = Object.values(PermissionModule);

/**
 * The system roles whose holders are surfaced on the Company admin tab. Membership
 * is derived from the assignment's role rather than stored, so an admin that has
 * its role edited in or out of this set moves in and out of the list automatically.
 */
const ADMIN_TIER_ROLES: SystemRole[] = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
];

const DEFAULT_COMPANY_ADMIN_PAGE_SIZE = 10;
const MAX_COMPANY_ADMIN_PAGE_SIZE = 100;

@Injectable()
export class SettingsDomainAccessControlService {
  private readonly logger = new Logger(SettingsDomainAccessControlService.name);

  constructor(
    @Inject(RoleRepository) private readonly roleRepository: RoleRepository,
    @Inject(UserRoleRepository)
    private readonly userRoleRepository: UserRoleRepository,
    @Inject(OrganizationRepository)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(InviteeUserRepository)
    private readonly inviteeUserRepository: InviteeUserRepository,
    @Inject(JobTitleRepository)
    private readonly jobTitleRepository: JobTitleRepository,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(AuthUtility) private readonly authUtility: AuthUtility,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @Responsibility: Seed the default system roles for a newly created organization.
   * Called during org creation in AuthService.
   *
   * @param organizationId - The organization to seed system roles for
   * @returns {Promise<void>}
   */
  async initializeSystemRoles(organizationId: string): Promise<void> {
    try {
      const existing =
        await this.roleRepository.findSystemRoles(organizationId);
      if (existing.length > 0) {
        this.logger.warn(
          `System roles already initialized for org ${organizationId}`,
        );
        return;
      }

      const systemRoles = SYSTEM_ROLE_DEFAULTS.map((sr) => ({
        name: sr.name,
        description: null,
        organizationId,
        isSystemRole: true,
        parentSystemRole: sr.systemRole,
        infoAccess: sr.infoAccess,
        modulePermissions: new Map(
          ALL_MODULES.map((mod) => [mod, { view: true, edit: true }]),
        ),
      }));

      await this.roleRepository.createMany(systemRoles);
      this.logger.log(
        `Initialized ${systemRoles.length} system roles for org ${organizationId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize system roles for org ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * @Responsibility: Assign the COMPANY_OWNER role to the first signup user.
   * The owner has already signed up and onboarded, so the assignment is created
   * in the ACTIVE state and is self-attributed.
   *
   * @param userId - The user to assign the owner role to
   * @param organizationId - The organization the user owns
   * @returns {Promise<void>}
   */
  async assignCompanyOwner(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const ownerRole = await this.roleRepository.findByOrganizationAndName({
        organizationId,
        name: 'Owner',
      });

      if (!ownerRole) {
        this.logger.error(
          `Owner system role not found for org ${organizationId}`,
        );
        return;
      }

      await this.userRoleRepository.assign({
        userId,
        organizationId,
        roleId: ownerRole._id as Types.ObjectId,
        status: AdminStatus.ACTIVE,
        addedById: userId,
        activatedAt: new Date(),
        // The owner is the org's escape hatch: without this an org could end up
        // with no one able to reach settings to grant access back.
        systemSettings: true,
      });

      this.logger.log(
        `Assigned COMPANY_OWNER role to user ${userId} in org ${organizationId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to assign COMPANY_OWNER to user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * @Responsibility: Get a user's system roles for an organization.
   * Used by the RoleGuard to check authorization.
   *
   * @param userId - The user to resolve roles for
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<SystemRole[]>}
   */
  async getUserSystemRoles(
    userId: string,
    organizationId: string,
  ): Promise<SystemRole[]> {
    try {
      const userRoles = await this.userRoleRepository.findByUserAndOrganization(
        userId,
        organizationId,
      );

      const systemRoles: SystemRole[] = [];

      for (const ur of userRoles) {
        const role = ur.roleId as unknown as RoleDocument;
        if (role?.isSystemRole && role?.parentSystemRole) {
          systemRoles.push(role.parentSystemRole);
        }
      }

      return [...new Set(systemRoles)];
    } catch (error: any) {
      this.logger.error(
        `Failed to get system roles for user ${userId} in org ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * @Responsibility: Decide whether a user may reach the organization settings area.
   * Used by the RoleGuard for routes marked with @RequiresSystemSettings(). The org
   * owner is always allowed so an organization can never end up with nobody able to
   * grant access back. An HR Admin is allowed unless their assignment explicitly
   * opted out, and an assignment predating the field is treated as opted in.
   *
   * @param userId - The user to authorize
   * @param organizationId - The organization the access is scoped to
   * @returns {Promise<boolean>}
   */
  async hasSystemSettingsAccess(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      const userRoles = await this.userRoleRepository.findByUserAndOrganization(
        userId,
        organizationId,
      );

      return userRoles.some((ur) => {
        const role = ur.roleId as unknown as RoleDocument;

        if (role?.parentSystemRole === SystemRole.COMPANY_OWNER) {
          return true;
        }

        if (role?.parentSystemRole === SystemRole.HR_ADMIN) {
          return ur.systemSettings !== false;
        }

        return false;
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to resolve system settings access for user ${userId} in org ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * @Responsibility: Get all roles (system + custom) for an organization
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<RoleDocument[]>}
   */
  async getRolesByOrganization(
    organizationId: string,
  ): Promise<RoleDocument[]> {
    try {
      return await this.roleRepository.findByOrganization(organizationId);
    } catch (error: any) {
      this.logger.error(`Failed to get roles for org ${organizationId}`, error);
      throw error;
    }
  }

  /**
   * @Responsibility: Get a single role by ID
   *
   * @param roleId - The role id to look up
   * @returns {Promise<RoleDocument>}
   *
   * @throws {404} Role not found
   */
  async getRoleById(roleId: string): Promise<RoleDocument> {
    try {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        AppResponse.error({
          message: 'Role not found',
          status: HttpStatus.NOT_FOUND,
        });
      }
      return role!;
    } catch (error: any) {
      error.location = `SettingsDomainAccessControlService.${this.getRoleById.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Create a custom role within an organization.
   * If invitees are provided, assigns the role to each valid user and sends an invitation email.
   * 409 conflicts (user already has the role) are logged and skipped.
   *
   * @param organizationId - The organization the role belongs to
   * @param dto - The role creation payload
   * @returns {Promise<RoleDocument>}
   *
   * @throws {409} Role with the same name already exists in the organization
   */
  async createCustomRole(
    organizationId: string,
    dto: CreateRoleDto,
  ): Promise<RoleDocument> {
    try {
      const existing = await this.roleRepository.findByOrganizationAndName({
        organizationId,
        name: dto.name,
      });
      if (existing) {
        AppResponse.error({
          message: `Role with name "${dto.name}" already exists in this organization`,
          status: HttpStatus.CONFLICT,
        });
      }

      const modulePermissions = new Map<
        string,
        { view: boolean; edit: boolean }
      >();
      for (const [module, perms] of Object.entries(
        dto.modulePermissions ?? {},
      )) {
        modulePermissions.set(module, { view: perms.view, edit: perms.edit });
      }
      for (const mod of ALL_MODULES) {
        if (!modulePermissions.has(mod)) {
          modulePermissions.set(mod, { view: false, edit: false });
        }
      }

      const role = await this.roleRepository.create({
        name: dto.name,
        description: dto.description ?? null,
        organizationId,
        isSystemRole: false,
        parentSystemRole: dto.parentSystemRole,
        infoAccess: dto.infoAccess ?? InfoAccess.EVERYONE,
        modulePermissions,
      });

      this.logger.log(
        `Created custom role "${dto.name}" in org ${organizationId}`,
      );

      if (dto.invitees?.length) {
        await this.inviteRoleMembers(dto.invitees, role, organizationId);
      }

      return role;
    } catch (error: any) {
      error.location = `SettingsDomainAccessControlService.${this.createCustomRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Resolve invitee emails to users, assign the role, and dispatch invitation emails.
   * 409 conflicts (user already has the role) are logged and skipped; email dispatch failures don't throw.
   *
   * @param inviteeEmails - The invitee email addresses to invite
   * @param role - The newly created role document
   * @param organizationId - The organization the role belongs to
   * @returns {Promise<void>}
   */
  private async inviteRoleMembers(
    inviteeEmails: string[],
    role: RoleDocument,
    organizationId: string,
  ): Promise<void> {
    const uniqueEmails = [
      ...new Set(inviteeEmails.map((email) => email.trim().toLowerCase())),
    ];
    const users = await this.inviteeUserRepository.findByEmails(uniqueEmails);

    if (users.length === 0) {
      this.logger.warn(
        `No matching users found for invitee emails: ${uniqueEmails.join(', ')}`,
      );
      return;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const inviteLink = `${frontendUrl}/invite?roleId=${role._id}`;

    let organizationDetails: any;
    for (const user of users) {
      try {
        await this.assignRole(
          user._id as Types.ObjectId as unknown as string,
          role._id as unknown as string,
          organizationId,
        );

        organizationDetails = await this.organizationRepository.findOrg(
          { _id: organizationId },
          'name',
        );
      } catch (error: any) {
        if (error?.status === HttpStatus.CONFLICT) {
          this.logger.warn(
            `User ${user._id} already has role ${role.name}, skipping assignment`,
          );
        } else {
          throw error;
        }
      }

      const payload: MailDispatcherDto = {
        to: user.email,
        from: 'Foundation HR <no-reply@foundationhr.com>',
        subject: `You've been added to ${role.name}`,
        html: roleInviteTemplate(
          user.firstName,
          role.name,
          inviteLink,
          organizationDetails?.name,
        ),
      };

      try {
        await this.emailService.brevoEmailDispatcher(payload);
      } catch (error: any) {
        this.logger.error(
          `Failed to send invite email to ${user.email}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Invite flow completed for role "${role.name}" — ${users.length} user(s) processed`,
    );
  }

  /**
   * @Responsibility: Update a custom role (system roles cannot be updated)
   *
   * @param roleId - The role id to update
   * @param dto - The partial role update payload
   * @returns {Promise<RoleDocument>}
   *
   * @throws {404} Role not found
   * @throws {403} System roles cannot be modified
   */
  async updateCustomRole(
    roleId: string,
    dto: Partial<CreateRoleDto>,
  ): Promise<string> {
    try {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        AppResponse.error({
          message: 'Role not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (role!.isSystemRole) {
        AppResponse.error({
          message: 'System roles cannot be modified',
          status: HttpStatus.FORBIDDEN,
        });
      }

      const updateData: Partial<RoleDocument> = {};

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      if (dto.infoAccess !== undefined) updateData.infoAccess = dto.infoAccess;

      if (dto.modulePermissions) {
        const existing = new Map(
          (role!.modulePermissions as Map<
            string,
            { view: boolean; edit: boolean }
          >) ?? new Map<string, { view: boolean; edit: boolean }>(),
        );
        const modulePermissions = new Map<
          string,
          { view: boolean; edit: boolean }
        >();

        for (const [module, perms] of Object.entries(dto.modulePermissions)) {
          modulePermissions.set(module, { view: perms.view, edit: perms.edit });
        }

        for (const mod of ALL_MODULES) {
          const value = modulePermissions.get(mod) ?? existing.get(mod);
          if (value) {
            modulePermissions.set(mod, value);
          } else if (!modulePermissions.has(mod)) {
            modulePermissions.set(mod, { view: false, edit: false });
          }
        }

        updateData.modulePermissions = modulePermissions;
      }

      const updated = await this.roleRepository.updateRole(
        { _id: roleId },
        { ...updateData },
      );
      if (!updated) {
        AppResponse.error({
          message: 'Failed to update role',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      return 'Updated custom role';
    } catch (error: any) {
      error.location = `SettingsDomainAccessControlService.${this.updateCustomRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Delete a custom role (system roles cannot be deleted)
   *
   * @param roleId - The role id to delete
   * @returns {Promise<void>}
   *
   * @throws {404} Role not found
   * @throws {403} System roles cannot be deleted
   */
  async deleteCustomRole(roleId: string): Promise<void> {
    try {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        AppResponse.error({
          message: 'Role not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (role!.isSystemRole) {
        AppResponse.error({
          message: 'System roles cannot be deleted',
          status: HttpStatus.FORBIDDEN,
        });
      }

      await this.roleRepository.delete(roleId);
      this.logger.log(`Deleted custom role ${roleId}`);
    } catch (error: any) {
      error.location = `SettingsDomainAccessControlService.${this.deleteCustomRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Assign a role to a user within an organization
   *
   * @param userId - The user to assign the role to
   * @param roleId - The role to assign
   * @param organizationId - The organization to scope the assignment to
   * @returns {Promise<void>}
   *
   * @throws {404} Role not found
   * @throws {403} Role does not belong to the organization
   * @throws {409} User already has the role
   */
  async assignRole(
    userId: string,
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        AppResponse.error({
          message: 'Role not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (role!.organizationId !== organizationId) {
        AppResponse.error({
          message: 'Role does not belong to this organization',
          status: HttpStatus.FORBIDDEN,
        });
      }

      const existing = await this.userRoleRepository.findByUserAndOrgAndRole(
        userId,
        organizationId,
        role!._id as Types.ObjectId,
      );

      if (existing) {
        AppResponse.error({
          message: 'User already has this role',
          status: HttpStatus.CONFLICT,
        });
      }

      await this.userRoleRepository.assign({
        userId,
        organizationId,
        roleId: role!._id as Types.ObjectId,
      });

      this.logger.log(
        `Assigned role ${roleId} to user ${userId} in org ${organizationId}`,
      );
    } catch (error: any) {
      error.location = `SettingsDomainAccessControlService.${this.assignRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Remove a role from a user within an organization
   *
   * @param userId - The user to remove the role from
   * @param roleId - The role to remove
   * @param organizationId - The organization to scope the removal to
   * @returns {Promise<void>}
   *
   * @throws {404} Role not found
   * @throws {403} Owner role cannot be removed from a user
   */
  async removeRole(
    userId: string,
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        AppResponse.error({
          message: 'Role not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (
        role!.isSystemRole &&
        role!.parentSystemRole === SystemRole.COMPANY_OWNER
      ) {
        AppResponse.error({
          message: 'Cannot remove the Owner role from a user',
          status: HttpStatus.FORBIDDEN,
        });
      }

      await this.userRoleRepository.remove(
        userId,
        role!._id as Types.ObjectId,
        organizationId,
      );

      this.logger.log(
        `Removed role ${roleId} from user ${userId} in org ${organizationId}`,
      );
    } catch (error: any) {
      error.location = `SettingsDomainAccessControlService.${this.removeRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Get all roles assigned to a specific user in an organization
   *
   * @param userId - The user to resolve roles for
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<RoleDocument[]>}
   */
  async getUserRoles(
    userId: string,
    organizationId: string,
  ): Promise<RoleDocument[]> {
    try {
      const userRoles = await this.userRoleRepository.findByUserAndOrganization(
        userId,
        organizationId,
      );

      return userRoles.map((ur) => ur.roleId as unknown as RoleDocument);
    } catch (error: any) {
      this.logger.error(
        `Failed to get roles for user ${userId} in org ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * @Responsibility: Get all users assigned to a specific role in an organization
   *
   * @param roleId - The role to resolve users for
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<string[]>}
   */
  async getUsersByRole(
    roleId: string,
    organizationId: string,
  ): Promise<string[]> {
    try {
      const userRoles = await this.userRoleRepository.findByRoleAndOrganization(
        new Types.ObjectId(roleId),
        organizationId,
      );

      return userRoles.map((ur) => ur.userId);
    } catch (error: any) {
      this.logger.error(
        `Failed to get users for role ${roleId} in org ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * @Responsibility: Resolve the organization a user belongs to via their role assignments.
   * Used at sign-in so non-owner users also carry an organizationId in the JWT.
   *
   * @param userId - The user to resolve the organization for
   * @returns {Promise<string | null>}
   */
  async findOrganizationForUser(userId: string): Promise<string | null> {
    try {
      const userRoles = await this.userRoleRepository.findByUser(userId);

      if (userRoles.length === 0) {
        return null;
      }

      const role = userRoles[0].roleId as unknown as RoleDocument;
      return role?.organizationId ?? null;
    } catch (error: any) {
      this.logger.error(`Failed to resolve org for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * @Responsibility: Add a new company admin to an organization. The invitee is
   * resolved from the User collection — the collection every UserRole.userId points
   * at — and a placeholder account is provisioned when the email is not yet known,
   * so the assignment always has a valid subject. The assignment starts in the
   * CREATED state and an invite email is dispatched; email failures are logged and
   * do not fail the request.
   *
   * @param organizationId - The organization the admin is added to
   * @param addedById - The user id of the actor creating the assignment
   * @param addCompanyAdminDto - The company admin creation payload
   * @returns {Promise<CompanyAdminRow>}
   *
   * @throws {404} Role or job title not found in this organization
   * @throws {403} Role belongs to another organization or is not an admin-tier role
   * @throws {409} The user already holds an admin-tier role in this organization
   */
  async addCompanyAdmin(
    organizationId: string,
    addedById: string,
    addCompanyAdminDto: AddCompanyAdminDto,
  ): Promise<any> {
    try {
      const {
        firstName,
        lastName,
        email,
        jobTitle,
        billingContact,
        authorizedRepresentative,
        systemSettings,
      } = addCompanyAdminDto;

      console.log(addedById);

      const role = await this.resolveAdminTierRole(organizationId);
      const findJobTitle = await this.jobTitleRepository.findByCodeOrName(
        organizationId,
        jobTitle.trim(),
      );

      if (!findJobTitle) {
        AppResponse.error({
          message: `Job title not found in this organization`,
          status: HttpStatus.NOT_FOUND,
        });
      }
      const user = await this.resolveOrCreateInviteeUser({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      const existingRoles =
        await this.userRoleRepository.findByUserAndOrganization(
          user._id as Types.ObjectId as unknown as string,
          organizationId,
        );
      const alreadyAdmin = existingRoles.some((ur) => {
        const assigned = ur.roleId as unknown as RoleDocument;
        return (
          assigned?.parentSystemRole &&
          ADMIN_TIER_ROLES.includes(assigned.parentSystemRole)
        );
      });

      if (alreadyAdmin) {
        AppResponse.error({
          message:
            'User already holds a company admin role in this organization',
          status: HttpStatus.CONFLICT,
        });
      }

      const assignment = await this.userRoleRepository.assign({
        userId: user._id as unknown as string,
        organizationId,
        roleId: role._id as Types.ObjectId,
        status: AdminStatus.CREATED,
        addedById,
        jobTitleCode: findJobTitle!.code,
        isBillingContact: billingContact ?? false,
        isAuthorizedRepresentative: authorizedRepresentative ?? false,
        systemSettings: systemSettings ?? true,
      });

      this.logger.log(
        `Added company admin ${email} to org ${organizationId} with role "${role.name}"`,
      );

      await this.dispatchCompanyAdminInvite(
        user.email,
        user.firstName,
        role.name,
        String(role._id),
        organizationId,
      );

      return this.toCompanyAdminRow(assignment, {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        role,
        jobTitleName: findJobTitle!.name,
      });
    } catch (error: any) {
      error.location = `SettingsDomainAccessControlService.${this.addCompanyAdmin.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: List the company admins of an organization with search,
   * filtering, sorting and pagination. Coarse filtering is delegated to Mongo;
   * sorting and pagination are applied in memory because the sort keys span the
   * User and UserRole collections and the admin set is bounded by the number of
   * admin-tier role holders in one organization.
   *
   * @param organizationId - The organization to scope the listing to
   * @param query - The search, filter, sort and pagination criteria
   * @returns {Promise<PaginatedResult<CompanyAdminRow>>}
   */
  async listCompanyAdmins(
    organizationId: string,
    query: ListCompanyAdminQuery,
  ): Promise<PaginatedResult<CompanyAdminRow>> {
    try {
      const systemRoles = query.role ? [query.role] : ADMIN_TIER_ROLES;
      const roles =
        await this.roleRepository.findByOrganizationAndParentSystemRoles(
          organizationId,
          systemRoles,
        );

      if (roles.length === 0) {
        return { data: [], count: 0 };
      }

      const filters = await this.buildCompanyAdminFilters(
        organizationId,
        query,
        roles,
      );

      if (!filters) {
        return { data: [], count: 0 };
      }

      const assignments = await this.userRoleRepository.findByFilters(filters);
      const rows = await this.hydrateCompanyAdminRows(assignments, roles);

      const sorted = this.sortCompanyAdmins(
        rows,
        query.sort_by,
        query.sort_dir,
      );
      const page = Math.max(1, Number(query.batch) || 1);
      const pageSize = Math.min(
        MAX_COMPANY_ADMIN_PAGE_SIZE,
        Math.max(1, Number(query.limit) || DEFAULT_COMPANY_ADMIN_PAGE_SIZE),
      );
      const start = (page - 1) * pageSize;

      return {
        data: sorted.slice(start, start + pageSize),
        count: sorted.length,
      };
    } catch (error: any) {
      error.location = `SettingsDomainAccessControlService.${this.listCompanyAdmins.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Change the role held by a company admin. The owner is
   * immutable and the target role is validated against the organization and the
   * admin tier so an edit cannot silently move someone off the Company admin tab.
   *
   * @param organizationId - The organization that owns the assignment
   * @param id - The company admin assignment id
   * @param dto - The new role id
   * @returns {Promise<CompanyAdminRow>}
   *
   * @throws {404} Assignment not found in this organization
   * @throws {403} Target is the owner, or the new role is not an admin-tier role
   */
  async updateCompanyAdminRole(
    roleId: string,
    updateCompanyAdminRoleDto: UpdateCompanyAdminRoleDto,
  ): Promise<string> {
    try {
      await this.userRoleRepository.updateUserRole(
        { _id: roleId },
        { ...updateCompanyAdminRoleDto },
      );

      return 'user role updated';
    } catch (error: any) {
      error.location = `SettingsDomainAccessControlService.${this.updateCompanyAdminRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Activate a user role assignment, stamping the activation time
   *
   * @param organizationId - The organization that owns the assignment
   * @param id - The user role assignment id
   * @param actorId - The user id performing the change
   * @returns {Promise<CompanyAdminRow>}
   *
   * @throws {404} Assignment not found in this organization
   * @throws {403} Target is the owner, or the actor is the target
   */
  async activateUserRole(roleId: string, flag: UserRoleFlag): Promise<any> {
    return this.setUserRoleStatus(roleId, flag);
  }

  /**
   * @Responsibility: Apply one of the three mutable statuses to an assignment. The
   * target status is fixed by the calling action rather than taken from the request,
   * so no payload can reach a status the endpoints do not expose. The owner is
   * immutable and an admin cannot change their own status, which would otherwise let
   * the last administrator lock themselves out.
   *
   * @param organizationId - The organization that owns the assignment
   * @param id - The user role assignment id
   * @param actorId - The user id performing the change
   * @param status - The status the action applies
   * @returns {Promise<CompanyAdminRow>}
   *
   * @throws {404} Assignment not found in this organization
   * @throws {403} Target is the owner, or the actor is the target
   */
  private static readonly ROLE_FLAG_TO_STATUS: Record<
    UserRoleFlag,
    AdminStatus
  > = {
    [UserRoleFlag.ACTIVATE]: AdminStatus.ACTIVE,
    [UserRoleFlag.DE_ACTIVATE]: AdminStatus.INACTIVE, // <- adjust to your enum
    [UserRoleFlag.SUSPEND]: AdminStatus.SUSPENDED,
  };

  private async setUserRoleStatus(
    roleId: string,
    flag: UserRoleFlag,
  ): Promise<string> {
    try {
      const status =
        SettingsDomainAccessControlService.ROLE_FLAG_TO_STATUS[flag];

      if (!status) {
        throw AppResponse.error({
          message: 'Invalid flag',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      await this.userRoleRepository.updateUserRole({ _id: roleId }, { status });

      return 'User role action status updated';
    } catch (error: any) {
      error.location = `SettingsDomainAccessControlService.${this.setUserRoleStatus.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Resolve the role a company admin is being assigned to,
   * rejecting roles that are missing, cross-tenant, or outside the admin tier
   *
   * @param roleId - The role id to resolve
   * @param organizationId - The organization the role must belong to
   * @returns {Promise<RoleDocument>}
   */
  private async resolveAdminTierRole(
    organizationId: string,
  ): Promise<RoleDocument> {
    const role = await this.roleRepository.findByOrganizationAndName({
      organizationId,
      parentSystemRole: SystemRole.COMPANY_OWNER,
    });

    if (!role) {
      AppResponse.error({
        message: 'Role not found',
        status: HttpStatus.NOT_FOUND,
      });
    }

    if (role!.organizationId !== organizationId) {
      AppResponse.error({
        message: 'Role does not belong to this organization',
        status: HttpStatus.FORBIDDEN,
      });
    }

    return role!;
  }

  /**
   * @Responsibility: Resolve the auth account for a new company admin, creating a
   * placeholder account when the email is not yet known. The placeholder password
   * is an unusable random token hash rather than a known value.
   *
   * @param details - The invitee's normalised name and email
   * @returns {Promise<UserDocument>}
   */
  private async resolveOrCreateInviteeUser(details: {
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const [existing] = await this.inviteeUserRepository.findByEmails([
      details.email,
    ]);

    if (existing) {
      return existing;
    }

    return this.inviteeUserRepository.create({
      firstName: details.firstName,
      lastName: details.lastName,
      email: details.email,
      password: await hash(this.authUtility.randomToken(), 10),
      isEmailVerified: false,
      userType: UserType.COMPANY,
    });
  }

  /**
   * @Responsibility: Reject mutations that would leave the organization without
   * a working owner
   *
   * @param assignment - The role assignment being mutated
   * @param action - The action being attempted, used in the error message
   *
   * @throws {403} The assignment is the organization's owner
   */
  private assertMutableCompanyAdmin(
    assignment: UserRoleDocument,
    action: string,
  ): void {
    const role = assignment.roleId as unknown as RoleDocument;

    if (role?.parentSystemRole === SystemRole.COMPANY_OWNER) {
      AppResponse.error({
        message: `Cannot ${action} the Owner of this organization`,
        status: HttpStatus.FORBIDDEN,
      });
    }
  }

  /**
   * @Responsibility: Translate the request query into a Mongo filter, resolving
   * the search term and the job title filter down to concrete user ids. Returns
   * null when a filter provably matches nothing, so the caller can short-circuit.
   *
   * @param organizationId - The organization to scope the listing to
   * @param query - The search, filter and sort criteria
   * @param roles - The admin-tier roles in scope for this listing
   * @returns {Promise<ListCompanyAdminFilters | null>}
   */
  private async buildCompanyAdminFilters(
    organizationId: string,
    query: ListCompanyAdminQuery,
    roles: RoleDocument[],
  ): Promise<ListCompanyAdminFilters | null> {
    const filters: ListCompanyAdminFilters = {
      organizationId,
      roleIds: roles.map((role) => role._id as Types.ObjectId),
    };

    if (query.status) {
      filters.status = query.status;
    }

    if (query.added_by) {
      filters.addedById = query.added_by;
    }

    if (query.date_created) {
      const range = this.toDayRange(query.date_created);
      if (!range) {
        return null;
      }
      filters.dateCreatedRange = range;
    }

    if (query.q?.trim()) {
      const userIds = await this.inviteeUserRepository.findIdsBySearchTerm(
        query.q.trim(),
      );
      if (userIds.length === 0) {
        return null;
      }
      filters.userIds = userIds;
    }

    if (query.job_title?.trim()) {
      const jobTitles = await this.jobTitleRepository.findByOrganization(
        organizationId,
        '',
        query.job_title.trim(),
      );
      if (jobTitles.length === 0) {
        return null;
      }
      filters.jobTitleCodes = jobTitles.map((jobTitle) => jobTitle.code);

      const emails =
        await this.employeeRepository.findEmailsByOrganizationJobTitleCodes(
          organizationId,
          filters.jobTitleCodes,
        );
      const employees = await this.inviteeUserRepository.findByEmails(emails);
      filters.jobTitleUserIds = employees.map((employee) =>
        String(employee._id),
      );
    }

    return filters;
  }

  /**
   * @Responsibility: Interpret a date_created filter as the calendar day it names,
   * expanded to a half-open range so the whole day is covered
   *
   * @param value - The ISO date string supplied by the client
   * @returns {{ from: Date; to: Date } | null} The range, or null if unparseable
   */
  private toDayRange(value: string): { from: Date; to: Date } | null {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const from = new Date(parsed);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);

    return { from, to };
  }

  /**
   * @Responsibility: Resolve the User, Employee, job title and actor records that
   * the Company admin table columns are rendered from, in a fixed number of batched
   * lookups regardless of how many rows are on the page.
   *
   * @param assignments - The role assignments on the page
   * @param roles - The admin-tier roles in scope, used to fill in a populated role
   *   that was not returned alongside the assignment
   * @returns {Promise<CompanyAdminRow[]>}
   */
  private async hydrateCompanyAdminRows(
    assignments: UserRoleDocument[],
    fallbackRoles: RoleDocument[],
  ): Promise<CompanyAdminRow[]> {
    if (assignments.length === 0) {
      return [];
    }

    const organizationIds = this.organizationIdsOf(assignments);
    const actorIds = [
      ...new Set(
        assignments
          .map((assignment) => assignment.addedById)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [users, actors] = await Promise.all([
      this.inviteeUserRepository.findByIds(
        assignments.map((assignment) => assignment.userId),
      ),
      this.inviteeUserRepository.findByIds(actorIds),
    ]);

    const userById = new Map(users.map((user) => [String(user._id), user]));
    const actorById = new Map(
      actors.map((actor) => [String(actor._id), actor]),
    );

    // The employee join keys on the emails resolved from the user ids, so it can
    // only run once the user batch has returned.
    const employees = await this.employeeRepository.findByOrganizationEmails(
      users.map((user) => user.email),
      organizationIds,
    );
    const employeeByEmail = new Map(
      employees.map((employee) => [employee.email, employee]),
    );

    // A populated role is a document; an unpopulated one is the raw ObjectId.
    const fallbackById = new Map(
      fallbackRoles.map((role) => [String(role._id), role]),
    );
    const roleFor = (assignment: UserRoleDocument): RoleDocument | null => {
      const role = assignment.roleId as unknown as RoleDocument;
      if (role && typeof role === 'object' && role.name) {
        return role;
      }
      return fallbackById.get(String(assignment.roleId)) ?? null;
    };

    const jobTitleCodes = [
      ...new Set(
        assignments
          .map((assignment) => {
            const employee = userById.get(assignment.userId);
            return (
              assignment.jobTitleCode ??
              (employee
                ? employeeByEmail.get(employee.email)?.jobTitleCode
                : null)
            );
          })
          .filter((code): code is string => Boolean(code)),
      ),
    ];
    const jobTitles = jobTitleCodes.length
      ? await this.jobTitleRepository.findByCodes(
          organizationIds[0],
          jobTitleCodes,
        )
      : [];
    const jobTitleByCode = new Map(
      jobTitles.map((jobTitle) => [jobTitle.code, jobTitle.name]),
    );

    return assignments.map((assignment) => {
      const user = userById.get(assignment.userId);
      const employee = user ? employeeByEmail.get(user.email) : undefined;
      const jobTitleCode = assignment.jobTitleCode ?? employee?.jobTitleCode;
      const actor = assignment.addedById
        ? actorById.get(assignment.addedById)
        : undefined;

      return this.toCompanyAdminRow(assignment, {
        user: user
          ? {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }
          : null,
        role: roleFor(assignment),
        jobTitleName: jobTitleCode
          ? (jobTitleByCode.get(jobTitleCode) ?? null)
          : null,
      });
    });
  }

  /**
   * @Responsibility: Sort hydrated company admin rows on a whitelisted key, leaving
   * the collection untouched when the key is unknown
   *
   * @param rows - The hydrated rows to sort
   * @param sortBy - The requested sort key
   * @param sortDir - The requested sort direction
   * @returns {CompanyAdminRow[]} A new, sorted array
   */
  private sortCompanyAdmins(
    rows: CompanyAdminRow[],
    sortBy?: string,
    sortDir?: string,
  ): CompanyAdminRow[] {
    if (!sortBy) {
      return rows;
    }

    const direction = sortDir === 'asc' ? 1 : -1;
    const sorted = [...rows];

    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name) * direction);
    } else if (sortBy === 'status') {
      sorted.sort((a, b) => a.status.localeCompare(b.status) * direction);
    }

    return sorted;
  }

  /**
   * @Responsibility: Project a role assignment into the row shape the Company admin
   * table renders, deriving the display name, the assignment labels and the status
   * so pre-existing rows created before the lifecycle fields existed still resolve.
   *
   * @param assignment - The role assignment to project
   * @param resolved - The User, role, job title and actor values resolved for it
   * @returns {CompanyAdminRow}
   */
  private toCompanyAdminRow(
    assignment: UserRoleDocument,
    resolved: {
      user: {
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
        email: string;
      } | null;
      role: RoleDocument | null;
      jobTitleName: string | null;
    },
  ): CompanyAdminRow {
    const role = resolved.role;
    const assignments: string[] = [];

    if (assignment.isBillingContact) {
      assignments.push(ADMIN_ASSIGNMENT_LABELS.isBillingContact);
    }
    if (assignment.isAuthorizedRepresentative) {
      assignments.push(ADMIN_ASSIGNMENT_LABELS.isAuthorizedRepresentative);
    }

    const status =
      assignment.status ??
      (role?.parentSystemRole === SystemRole.COMPANY_OWNER
        ? AdminStatus.ACTIVE
        : AdminStatus.CREATED);

    return {
      id: String(assignment._id),
      userId: assignment.userId,
      firstName: resolved.user?.firstName ?? null,
      lastName: resolved.user?.lastName ?? null,
      name: resolved.user
        ? [resolved.user.firstName, resolved.user.lastName]
            .filter(Boolean)
            .join(' ')
            .trim()
        : '',
      email: resolved.user?.email ?? '',
      status,
      role: role
        ? {
            id: String(role._id),
            name: role.name,
            systemRole: role.parentSystemRole ?? null,
          }
        : null,
      jobTitle: resolved.jobTitleName,
      isBillingContact: assignment.isBillingContact ?? false,
      isAuthorizedRepresentative:
        assignment.isAuthorizedRepresentative ?? false,
      // Absent on assignments predating the field, which were always allowed.
      systemSettings: assignment.systemSettings ?? true,
      assignments,
      dateCreated: (assignment as TimestampedUserRole).createdAt ?? null,
    };
  }

  /**
   * @Responsibility: Read the role id off an assignment. A populated role is a
   * document, so stringifying roleId directly would yield "[object Object]" and
   * make every comparison against a real role id fail.
   */
  private roleIdOf(assignment: UserRoleDocument): string {
    const role = assignment.roleId as unknown as RoleDocument;
    return String(
      role && typeof role === 'object' && role._id
        ? role._id
        : assignment.roleId,
    );
  }

  /**
   * @Responsibility: Collect the distinct organization ids spanned by a batch of
   * assignments, used to scope the Employee lookups that join onto them
   */
  private organizationIdsOf(assignments: UserRoleDocument[]): string[] {
    return [...new Set(assignments.map((a) => a.organizationId))];
  }

  /**
   * @Responsibility: Dispatch the company admin invite email. Delivery failures are
   * logged rather than thrown so a provider outage never discards a created admin.
   */
  private async dispatchCompanyAdminInvite(
    email: string,
    firstName: string,
    roleName: string,
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const inviteLink = `${frontendUrl}/invite?roleId=${roleId}`;
    const organizationDetails = await this.organizationRepository.findOrg(
      { _id: organizationId },
      'name',
    );

    const payload: MailDispatcherDto = {
      to: email,
      from: 'Foundation HR <no-reply@foundationhr.com>',
      subject: `You've been added as a company admin`,
      html: roleInviteTemplate(
        firstName,
        roleName,
        inviteLink,
        organizationDetails?.name ?? '',
      ),
    };

    try {
      await this.emailService.brevoEmailDispatcher(payload);
    } catch (error: any) {
      this.logger.error(
        `Failed to send company admin invite to ${email}: ${error.message}`,
      );
    }
  }
}
