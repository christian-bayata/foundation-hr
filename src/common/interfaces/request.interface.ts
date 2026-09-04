import { Request } from 'express';

export interface CurrentUser {
  userId: string;
  email: string;
  userType?: string;
}

export interface IRequest extends Request {
  user?: CurrentUser;
  workspace?: string;
}
