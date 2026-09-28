import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '../../bin/auth/enum/role.enum';
import { RoleGuard } from './role.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { REQUIRES_SYSTEM_SETTINGS_KEY } from '../decorators/requires-system-settings.decorator';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const USER_ID = 'usr-1';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let reflector: Record<string, jest.Mock<AnyPromiseFn>>;
  let roleService: Record<string, jest.Mock<AnyPromiseFn>>;
  let context: ExecutionContext;

  /** Builds a context whose request carries `user`, with the given metadata. */
  const contextFor = (
    metadata: Record<string, unknown>,
    user?: Record<string, unknown>,
  ) => {
    reflector.getAllAndOverride.mockImplementation(
      (key: string) => metadata[key] ?? undefined,
    );
    return {
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  };

  const withRoles = (
    systemSettings: boolean | undefined = undefined,
  ): Record<string, unknown> => {
    const metadata: Record<string, unknown> = {
      [ROLES_KEY]: [SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN],
    };
    if (systemSettings !== undefined) {
      metadata[REQUIRES_SYSTEM_SETTINGS_KEY] = systemSettings;
    }
    return metadata;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    reflector = { getAllAndOverride: jest.fn() };
    roleService = {
      getUserSystemRoles: jest
        .fn()
        .mockResolvedValue([SystemRole.HR_ADMIN]),
      findOrganizationForUser: jest.fn().mockResolvedValue(ORG_ID),
      hasSystemSettingsAccess: jest.fn().mockResolvedValue(true),
    };

    guard = new RoleGuard(
      reflector as unknown as Reflector,
      roleService as any,
    );
    context = contextFor(withRoles(), { userId: USER_ID, organizationId: ORG_ID });
  });

  describe('without @RequiresSystemSettings', () => {
    it('allows a user holding a required role', async () => {
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(roleService.hasSystemSettingsAccess).not.toHaveBeenCalled();
    });

    it('denies a user without a required role', async () => {
      roleService.getUserSystemRoles.mockResolvedValue([SystemRole.EMPLOYEE]);

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });

    it('allows any authenticated user when no roles are required', async () => {
      context = contextFor({}, { userId: USER_ID, organizationId: ORG_ID });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(roleService.getUserSystemRoles).not.toHaveBeenCalled();
      expect(roleService.hasSystemSettingsAccess).not.toHaveBeenCalled();
    });
  });

  describe('with @RequiresSystemSettings', () => {
    it('allows a user with settings access', async () => {
      context = contextFor(withRoles(true), {
        userId: USER_ID,
        organizationId: ORG_ID,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(roleService.hasSystemSettingsAccess).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
      );
    });

    it('denies a user whose settings access was revoked', async () => {
      roleService.hasSystemSettingsAccess.mockResolvedValue(false);
      context = contextFor(withRoles(true), {
        userId: USER_ID,
        organizationId: ORG_ID,
      });

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });

    it('denies before the access check when the user lacks a required role', async () => {
      roleService.getUserSystemRoles.mockResolvedValue([SystemRole.EMPLOYEE]);
      context = contextFor(withRoles(true), {
        userId: USER_ID,
        organizationId: ORG_ID,
      });

      await expect(guard.canActivate(context)).resolves.toBe(false);
      expect(roleService.hasSystemSettingsAccess).not.toHaveBeenCalled();
    });

    it('still enforces settings access on a route with no @Roles', async () => {
      roleService.hasSystemSettingsAccess.mockResolvedValue(false);
      context = contextFor(
        { [REQUIRES_SYSTEM_SETTINGS_KEY]: true },
        { userId: USER_ID, organizationId: ORG_ID },
      );

      await expect(guard.canActivate(context)).resolves.toBe(false);
      expect(roleService.getUserSystemRoles).not.toHaveBeenCalled();
      expect(roleService.hasSystemSettingsAccess).toHaveBeenCalled();
    });

    it('resolves the organization from the role service when the token omits it', async () => {
      context = contextFor(withRoles(true), { userId: USER_ID });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(roleService.findOrganizationForUser).toHaveBeenCalledWith(USER_ID);
      expect(roleService.hasSystemSettingsAccess).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
      );
    });
  });

  describe('request prerequisites', () => {
    it('denies when the request carries no user', async () => {
      context = contextFor(withRoles(true), undefined);

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });

    it('denies when the organization cannot be resolved', async () => {
      roleService.findOrganizationForUser.mockResolvedValue(null);
      context = contextFor(withRoles(true), { userId: USER_ID });

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });

    it('denies when the access lookup throws', async () => {
      roleService.hasSystemSettingsAccess.mockRejectedValue(
        new Error('db down'),
      );
      context = contextFor(withRoles(true), {
        userId: USER_ID,
        organizationId: ORG_ID,
      });

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });
  });
});
