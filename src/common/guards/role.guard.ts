import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { REQUIRES_SYSTEM_SETTINGS_KEY } from '../decorators/requires-system-settings.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SystemRole } from '../../bin/auth/enum/role.enum';
import { CurrentUser, IRequest } from '../interfaces/request.interface';
import { UserRoleRepository } from '../../bin/setting/access-control/repository/user-role.repository';
import { OrganizationRepository } from '../../bin/organization/repository/organization.repository';
import { RoleDocument } from '../../bin/setting/access-control/entity/role.schema';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiresSystemSettings = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_SYSTEM_SETTINGS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const needsRoles = Boolean(requiredRoles?.length);

    if (!needsRoles && !requiresSystemSettings) {
      return true;
    }

    const request = context.switchToHttp().getRequest<IRequest>();
    const user: CurrentUser | undefined = request.user;

    if (!user?.userId) {
      this.logger.warn(`RoleGuard: Missing userId on request`);
      return false;
    }

    try {
      const organizationId =
        user.organizationId ??
        (await this.findOrganizationForUser(user.userId)) ??
        undefined;

      if (!organizationId) {
        this.logger.warn(
          `RoleGuard: Could not resolve organization for user ${user.userId}`,
        );
        return false;
      }

      if (needsRoles) {
        const userRoles = await this.getUserSystemRoles(
          user.userId,
          organizationId,
        );

        if (!requiredRoles!.some((role) => userRoles.includes(role))) {
          this.logger.warn(
            `RoleGuard: User ${user.userId} lacks required roles [${requiredRoles!.join(', ')}] in org ${organizationId}`,
          );
          return false;
        }
      }

      if (
        requiresSystemSettings &&
        !(await this.hasSystemSettingsAccess(user.userId, organizationId))
      ) {
        this.logger.warn(
          `RoleGuard: User ${user.userId} lacks system settings access in org ${organizationId}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`RoleGuard: Error checking roles`, error);
      return false;
    }
  }

  /**
   * Resolve the system roles a user holds in an organization. A role grants its
   * parent system role whether it is a seeded system role or a custom role, and
   * the organization owner always resolves to COMPANY_OWNER even when they hold
   * no role assignment.
   */
  private async getUserSystemRoles(
    userId: string,
    organizationId: string,
  ): Promise<SystemRole[]> {
    const assignments = await this.userRoleRepository.findByUserAndOrganization(
      userId,
      organizationId,
    );

    const systemRoles: SystemRole[] = [];

    for (const assignment of assignments) {
      const role = assignment.roleId as unknown as RoleDocument;
      if (role?.parentSystemRole) {
        systemRoles.push(role.parentSystemRole);
      }
    }

    if (await this.organizationRepository.isOwner(userId, organizationId)) {
      systemRoles.push(SystemRole.COMPANY_OWNER);
    }

    return [...new Set(systemRoles)];
  }

  /**
   * Decide whether a user may reach the organization settings area. The owner is
   * always allowed; an HR Admin is allowed unless their assignment explicitly
   * opted out, and an assignment predating the field is treated as opted in.
   */
  private async hasSystemSettingsAccess(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    if (await this.organizationRepository.isOwner(userId, organizationId)) {
      return true;
    }

    const assignments = await this.userRoleRepository.findByUserAndOrganization(
      userId,
      organizationId,
    );

    return assignments.some((assignment) => {
      const role = assignment.roleId as unknown as RoleDocument;

      if (role?.parentSystemRole === SystemRole.COMPANY_OWNER) {
        return true;
      }

      if (role?.parentSystemRole === SystemRole.HR_ADMIN) {
        return assignment.systemSettings !== false;
      }

      return false;
    });
  }

  /**
   * Resolve the organization a user belongs to from their assignments, falling
   * back to the organization they own so an owner without an assignment still
   * resolves.
   */
  private async findOrganizationForUser(
    userId: string,
  ): Promise<string | null> {
    const assignments = await this.userRoleRepository.findByUser(userId);

    if (assignments.length === 0) {
      const ownedOrg =
        await this.organizationRepository.findOrganizationByOwner(userId);
      return ownedOrg?._id?.toString() ?? null;
    }

    const role = assignments[0].roleId as unknown as RoleDocument;
    return role?.organizationId ?? null;
  }
}
