import { IsNotEmpty, IsString } from 'class-validator';
import { IRequest } from '../../../common';

export class EmployeeRefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  req?: IRequest;
}