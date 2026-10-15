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

/** A populated role document as returned by UserRoleRepository.populate('roleId'). */
const role = (
  parentSystemRole: SystemRole,
  organizationId: string = ORG_ID,
) => ({
  parentSystemRole,
  organizationId,
});

/** A user-role assignment as returned by UserRoleRepository (roleId populated). */
const assignment = (over: Record<string, any> = {}) => ({
  _id: 'assignment-1',
  userId: USER_ID,
  organizationId: ORG_ID,
  roleId: role(SystemRole.HR_ADMIN),
  systemSettings: true,
  ...over,
});

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let reflector: Record<string, jest.Mock<AnyPromiseFn>>;
  let userRoleRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let organizationRepository: Record<string, jest.Mock<AnyPromiseFn>>;
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
    userRoleRepository = {
      findByUserAndOrganization: jest.fn().mockResolvedValue([assignment()]),
      findByUser: jest.fn().mockResolvedValue([assignment()]),
    };
    organizationRepository = {
      isOwner: jest.fn().mockResolvedValue(false),
      findOrganizationByOwner: jest.fn().mockResolvedValue(null),
    };

    guard = new RoleGuard(
      reflector as unknown as Reflector,
      userRoleRepository as any,
      organizationRepository as any,
    );
    context = contextFor(withRoles(), {
      userId: USER_ID,
      organizationId: ORG_ID,
    });
  });

  describe('without @RequiresSystemSettings', () => {
    it('allows a user holding a required role', async () => {
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(organizationRepository.isOwner).toHaveBeenCalledTimes(1);
    });

    it('denies a user without a required role', async () => {
      userRoleRepository.findByUserAndOrganization.mockResolvedValue([
        assignment({ roleId: role(SystemRole.EMPLOYEE) }),
      ]);

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });

    it('allows any authenticated user when no roles are required', async () => {
      context = contextFor({}, { userId: USER_ID, organizationId: ORG_ID });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(
        userRoleRepository.findByUserAndOrganization,
      ).not.toHaveBeenCalled();
      expect(organizationRepository.isOwner).not.toHaveBeenCalled();
    });
  });

  describe('with @RequiresSystemSettings', () => {
    it('allows a user with settings access', async () => {
      context = contextFor(withRoles(true), {
        userId: USER_ID,
        organizationId: ORG_ID,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(userRoleRepository.findByUserAndOrganization).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
      );
    });

    it('denies a user whose settings access was revoked', async () => {
      userRoleRepository.findByUserAndOrganization.mockResolvedValue([
        assignment({ systemSettings: false }),
      ]);
      context = contextFor(withRoles(true), {
        userId: USER_ID,
        organizationId: ORG_ID,
      });

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });

    it('denies before the access check when the user lacks a required role', async () => {
      userRoleRepository.findByUserAndOrganization.mockResolvedValue([
        assignment({ roleId: role(SystemRole.EMPLOYEE) }),
      ]);
      context = contextFor(withRoles(true), {
        userId: USER_ID,
        organizationId: ORG_ID,
      });

      await expect(guard.canActivate(context)).resolves.toBe(false);
      expect(
        userRoleRepository.findByUserAndOrganization,
      ).toHaveBeenCalledTimes(1);
    });

    it('still enforces settings access on a route with no @Roles', async () => {
      userRoleRepository.findByUserAndOrganization.mockResolvedValue([
        assignment({ systemSettings: false }),
      ]);
      context = contextFor(
        { [REQUIRES_SYSTEM_SETTINGS_KEY]: true },
        { userId: USER_ID, organizationId: ORG_ID },
      );

      await expect(guard.canActivate(context)).resolves.toBe(false);
      expect(
        userRoleRepository.findByUserAndOrganization,
      ).toHaveBeenCalledTimes(1);
    });

    it('resolves the organization from the user roles when the token omits it', async () => {
      context = contextFor(withRoles(true), { userId: USER_ID });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(userRoleRepository.findByUser).toHaveBeenCalledWith(USER_ID);
      expect(userRoleRepository.findByUserAndOrganization).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
      );
    });
  });

  describe('organization owner', () => {
    it('grants a required owner role to an owner with no assignments', async () => {
      userRoleRepository.findByUserAndOrganization.mockResolvedValue([]);
      organizationRepository.isOwner.mockResolvedValue(true);

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('grants settings access to an owner with no assignments', async () => {
      userRoleRepository.findByUserAndOrganization.mockResolvedValue([]);
      organizationRepository.isOwner.mockResolvedValue(true);
      context = contextFor(withRoles(true), {
        userId: USER_ID,
        organizationId: ORG_ID,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('request prerequisites', () => {
    it('denies when the request carries no user', async () => {
      context = contextFor(withRoles(true), undefined);

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });

    it('denies when the organization cannot be resolved', async () => {
      userRoleRepository.findByUser.mockResolvedValue([]);
      organizationRepository.findOrganizationByOwner.mockResolvedValue(null);
      context = contextFor(withRoles(true), { userId: USER_ID });

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });

    it('denies when the access lookup throws', async () => {
      organizationRepository.isOwner.mockRejectedValue(new Error('db down'));
      context = contextFor(withRoles(true), {
        userId: USER_ID,
        organizationId: ORG_ID,
      });

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });
  });
});
