import { IsEmail } from 'class-validator';
import { IRequest } from '../../../common';

export class ResendVerificationDto {
  @IsEmail()
  email: string;

  req?: IRequest;
}
