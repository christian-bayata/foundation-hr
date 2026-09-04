import { IsNotEmpty, IsString } from 'class-validator';
import { IRequest } from '../../../common';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  req?: IRequest;
}
