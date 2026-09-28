import { SetMetadata } from '@nestjs/common';

export const REQUIRES_SYSTEM_SETTINGS_KEY = 'requiresSystemSettings';

/**
 * Requires the caller to hold organization settings access, i.e. a company admin
 * whose `UserRole.systemSettings` is not false, or the organization owner who is
 * always allowed. Enforced by {@link RoleGuard}.
 */
export const RequiresSystemSettings = () =>
  SetMetadata(REQUIRES_SYSTEM_SETTINGS_KEY, true);
