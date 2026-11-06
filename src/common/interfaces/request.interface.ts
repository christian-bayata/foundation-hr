import { Request } from 'express';
import { PrincipalType } from '../../bin/generic/auth/enum/principal-type.enum';

export interface CurrentUser {
  userId: string;
  email: string;
  userType?: string;
  principalType?: PrincipalType;
  employeeId?: string;
  adminUserId?: string;
  organizationId?: string;
}

export interface IRequest extends Request {
  user?: CurrentUser;
  workspace?: string;
}
