import { IsEmail } from 'class-validator';
import { IRequest } from '../../../common';

export class EmployeeForgotPasswordDto {
  @IsEmail()
  email: string;

  req?: IRequest;
}