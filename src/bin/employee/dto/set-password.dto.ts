import { IsEmail, IsString, MinLength } from 'class-validator';
import { IRequest } from '../../../common';

export class EmployeeSetPasswordDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password: string;

  @IsString()
  @MinLength(8, { message: 'Confirm Password must be at least 8 characters.' })
  confirmPassword: string;

  orgSlug: string;

  req?: IRequest;
}
