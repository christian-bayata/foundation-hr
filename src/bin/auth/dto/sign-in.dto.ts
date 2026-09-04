import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IRequest } from '../../../common';

export class SignInDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  req?: IRequest;
}
