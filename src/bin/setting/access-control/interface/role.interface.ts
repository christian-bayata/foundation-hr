import type { InfoAccess } from '../../../auth/enum/info-access.enum';
import type { SystemRole } from '../../../auth/enum/role.enum';

/**
 * A user assigned to a role, reduced to the fields the roles listing renders.
 * `userId` is the string id of the User collection record the assignment points at.
 */
export interface RoleUserView {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * A role as serialized to the client by `mongoose` `toObject()`, augmented with
 * the users assigned to it. `modulePermissions` is a plain record here because
 * the mongoose Map has already been flattened by `toObject()`.
 */
export interface RoleWithUsers {
  _id: unknown;
  name: string;
  description: string | null;
  organizationId: string;
  isSystemRole: boolean;
  parentSystemRole: SystemRole | null;
  infoAccess: InfoAccess;
  modulePermissions: Record<string, { view: boolean; edit: boolean }>;
  createdAt?: Date;
  updatedAt?: Date;
  users: RoleUserView[];
}
