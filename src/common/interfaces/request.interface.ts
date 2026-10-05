import { Request } from 'express';
import { PrincipalType } from '../../bin/auth/enum/principal-type.enum';

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