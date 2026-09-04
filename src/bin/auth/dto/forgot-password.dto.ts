import { IsEmail } from 'class-validator';
import { IRequest } from '../../../common';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  req?: IRequest;
}
