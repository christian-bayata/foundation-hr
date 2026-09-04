import { IsString } from 'class-validator';
import { IRequest } from '../../../common';

export class VerifyEmailDto {
  @IsString()
  token: string;

  req?: IRequest;
}
