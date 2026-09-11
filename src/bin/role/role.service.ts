import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { RoleRepository } from './repository/role.repository';
import { UserRoleRepository } from './repository/user-role.repository';
import { RoleDocument } from './entity/role.schema';
import { SystemRole } from '../auth/enum/role.enum';
import { InfoAccess } from '../auth/enum/info-access.enum';
import { PermissionModule } from '../auth/enum/module.enum';
import { CreateRoleDto } from './dto/create-role.dto';
import { AppResponse } from '../../common/response/app-response';

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
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @Inject(RoleRepository) private readonly roleRepository: RoleRepository,
    @Inject(UserRoleRepository)
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  /**
   * Seed the 7 (actually 8) system roles for a new organization.
   * Called during org creation in AuthService.
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
          ALL_MODULES.map((mod) => [mod, { view: false, edit: false }]),
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
   * Assign the COMPANY_OWNER role to the first signup user.
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
   * Get a user's system roles for an organization.
   * Used by the RoleGuard to check authorization.
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
   * Get all roles (system + custom) for an organization.
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
   * Get a single role by ID.
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
      error.location = `RoleService.${this.getRoleById.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * Create a custom role within an organization.
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
      if (dto.modulePermissions) {
        for (const mp of dto.modulePermissions) {
          modulePermissions.set(mp.module, { view: mp.view, edit: mp.edit });
        }
      } else {
        for (const mod of ALL_MODULES) {
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
      return role;
    } catch (error: any) {
      error.location = `RoleService.${this.createCustomRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * Update a custom role (system roles cannot be updated).
   */
  async updateCustomRole(
    roleId: string,
    dto: Partial<CreateRoleDto>,
  ): Promise<RoleDocument> {
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
        const modulePermissions = new Map<
          string,
          { view: boolean; edit: boolean }
        >();
        for (const mp of dto.modulePermissions) {
          modulePermissions.set(mp.module, { view: mp.view, edit: mp.edit });
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

      this.logger.log(`Updated custom role ${roleId}`);
      return updated!;
    } catch (error: any) {
      error.location = `RoleService.${this.updateCustomRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * Delete a custom role (system roles cannot be deleted).
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
      error.location = `RoleService.${this.deleteCustomRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * Assign a role to a user within an organization.
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
      error.location = `RoleService.${this.assignRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * Remove a role from a user within an organization.
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
      error.location = `RoleService.${this.removeRole.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * Get all roles assigned to a specific user in an organization.
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
   * Get all users assigned to a specific role in an organization.
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
   * Resolve the organization a user belongs to via their role assignments.
   * Used at sign-in so non-owner users also carry an organizationId in the JWT.
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
