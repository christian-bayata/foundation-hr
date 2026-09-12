import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { RoleRepository } from '../access-control/repository/role.repository';
import { UserRoleRepository } from '../access-control/repository/user-role.repository';
import { InviteeUserRepository } from '../access-control/repository/invitee-user.repository';
import { RoleDocument } from '../access-control/entity/role.schema';
import { SystemRole } from '../../auth/enum/role.enum';
import { InfoAccess } from '../../auth/enum/info-access.enum';
import { PermissionModule } from '../../auth/enum/module.enum';
import { CreateRoleDto } from '../access-control/dto/create-role.dto';
import { AppResponse } from '../../../common/response/app-response';
import { EmailService } from '../../../email/email.service';
import { roleInviteTemplate } from '../../../email/template/role-invite.template';
import { MailDispatcherDto } from '../../../email/dto/send-mail.dto';

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

@Injectable()
export class SettingsDomainAccessControlService {
  private readonly logger = new Logger(SettingsDomainAccessControlService.name);

  constructor(
    @Inject(RoleRepository) private readonly roleRepository: RoleRepository,
    @Inject(UserRoleRepository)
    private readonly userRoleRepository: UserRoleRepository,
    @Inject(InviteeUserRepository)
    private readonly inviteeUserRepository: InviteeUserRepository,
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
   * @Responsibility: Assign the COMPANY_OWNER role to the first signup user
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
      const ownerRole = await this.roleRepository.findByOrganizationAndName(
        organizationId,
        'Owner',
      );

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
      const existing = await this.roleRepository.findByOrganizationAndName(
        organizationId,
        dto.name,
      );
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

    for (const user of users) {
      try {
        await this.assignRole(
          user._id as Types.ObjectId as unknown as string,
          role._id as unknown as string,
          organizationId,
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
        html: roleInviteTemplate(user.firstName, role.name, inviteLink),
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

      const updated = await this.roleRepository.update(roleId, updateData);
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
}
