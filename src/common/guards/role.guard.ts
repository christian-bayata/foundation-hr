import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SystemRole } from '../../bin/auth/enum/role.enum';
import { CurrentUser, IRequest } from '../interfaces/request.interface';

export const ROLE_SERVICE = 'ROLE_SERVICE';

export interface IRoleService {
  getUserSystemRoles(userId: string, organizationId: string): Promise<SystemRole[]>;
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

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<IRequest>();
    const user: CurrentUser | undefined = request.user;

    if (!user?.userId || !user?.organizationId) {
      this.logger.warn(
        `RoleGuard: Missing userId or organizationId on request`,
      );
      return false;
    }

    try {
      const userRoles = await this.roleService.getUserSystemRoles(
        user.userId,
        user.organizationId,
      );

      const hasRole = requiredRoles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        this.logger.warn(
          `RoleGuard: User ${user.userId} lacks required roles [${requiredRoles.join(', ')}] in org ${user.organizationId}`,
        );
      }

      return hasRole;
    } catch (error) {
      this.logger.error(`RoleGuard: Error checking roles`, error);
      return false;
    }
  }
}
