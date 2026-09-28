import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { REQUIRES_SYSTEM_SETTINGS_KEY } from '../decorators/requires-system-settings.decorator';
import { SystemRole } from '../../bin/auth/enum/role.enum';
import { CurrentUser, IRequest } from '../interfaces/request.interface';

export const ROLE_SERVICE = 'ROLE_SERVICE';

export interface IRoleService {
  getUserSystemRoles(
    userId: string,
    organizationId: string,
  ): Promise<SystemRole[]>;
  findOrganizationForUser(userId: string): Promise<string | null>;
  hasSystemSettingsAccess(
    userId: string,
    organizationId: string,
  ): Promise<boolean>;
}

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(ROLE_SERVICE) private readonly roleService: IRoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
        (await this.roleService.findOrganizationForUser(user.userId)) ??
        undefined;

      if (!organizationId) {
        this.logger.warn(
          `RoleGuard: Could not resolve organization for user ${user.userId}`,
        );
        return false;
      }

      if (needsRoles) {
        const userRoles = await this.roleService.getUserSystemRoles(
          user.userId,
          organizationId,
        );

        if (!requiredRoles!.some((role) => userRoles.includes(role))) {
          this.logger.warn(
            `RoleGuard: User ${user.userId} lacks required roles [${requiredRoles!.join(', ')}] in org ${user.organizationId}`,
          );
          return false;
        }
      }

      if (
        requiresSystemSettings &&
        !(await this.roleService.hasSystemSettingsAccess(
          user.userId,
          organizationId,
        ))
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
}
