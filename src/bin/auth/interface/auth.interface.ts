export class VerificationTokenData {
  tokenHash: string;
  expiresAt: Date;
}

export class ResetTokenData {
  tokenHash: string;
  expiresAt: Date;
}

export class RefreshTokenEntry {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * The set of authenticated identities sharing a single email address. A person
 * may hold an employee record, an admin user record, or both.
 */
export interface AuthPrincipals {
  employee?: any | null;
  adminUser?: any | null;
}

export interface EmployeeAuthBlock {
  accessToken: string;
  refreshToken: string;
  role: string[];
  organizationId?: string;
  status: string;
  employeeId: string;
}

export interface AdminAuthBlock {
  accessToken: string;
  refreshToken: string;
  role: string[];
  organizationId?: string;
  kyc: string[];
  adminUserId: string;
}

export interface LoginResponse {
  employeeAuth?: EmployeeAuthBlock;
  adminAuth?: AdminAuthBlock;
}

export interface AuthProfileResponse {
  employeeData?: Record<string, any>;
  adminData?: Record<string, any>;
}
