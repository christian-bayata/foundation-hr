import { Request } from 'express';

export interface CurrentUser {
  userId: string;
  email: string;
  userType?: string;
  organizationId?: string;
}

export interface IRequest extends Request {
  user?: CurrentUser;
  workspace?: string;
}
