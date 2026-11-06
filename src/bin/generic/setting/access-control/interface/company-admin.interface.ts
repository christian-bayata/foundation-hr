import type { Types } from 'mongoose';
import { SystemRole } from '../../../auth/enum/role.enum';
import { AdminStatus } from '../enum/admin-status.enum';
import { UserRoleDocument } from '../entity/user-role.schema';

/**
 * A role assignment carrying the `createdAt` that `@Schema({ timestamps: true })`
 * writes. Mongoose's Document type does not declare the timestamp fields, so the
 * Company admin table's Date created column reads them through this alias.
 */
export type TimestampedUserRole = UserRoleDocument & { createdAt?: Date };

export interface ListCompanyAdminQuery {
  q?: string;
  status?: AdminStatus;
  role?: SystemRole;
  job_title?: string;
  added_by?: string;
  date_created?: string;
  sort_by?: 'date_created' | 'name' | 'status';
  sort_dir?: 'asc' | 'desc';
  batch?: number;
  limit?: number;
}

export interface ListCompanyAdminFilters {
  organizationId: string;
  roleIds: Types.ObjectId[];
  status?: AdminStatus;
  addedById?: string;
  dateCreatedRange?: { from: Date; to: Date };
  userIds?: string[];
  jobTitleCodes?: string[];
  jobTitleUserIds?: string[];
}

export interface CompanyAdminRoleView {
  id: string;
  name: string;
  systemRole: SystemRole | null;
}

export interface CompanyAdminActorView {
  userId: string;
  name: string;
}

export interface CompanyAdminRow {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  email: string;
  status: AdminStatus;
  role: CompanyAdminRoleView | null;
  jobTitle: string | null;
  isBillingContact: boolean;
  isAuthorizedRepresentative: boolean;
  systemSettings: boolean;
  assignments: string[];
  dateCreated: Date | null;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
}

export const ADMIN_ASSIGNMENT_LABELS = {
  isBillingContact: 'Billing Contact',
  isAuthorizedRepresentative: 'Authorized Representative',
} as const;
