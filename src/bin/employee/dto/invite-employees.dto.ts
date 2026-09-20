import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsString,
} from 'class-validator';
import { IRequest } from '../../../common';

export class InviteEmployeesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one invitee email is required.' })
  @ArrayMaxSize(100, {
    message: 'You can invite at most 100 employees at once.',
  })
  @IsEmail(
    {},
    { each: true, message: 'Each invitee must be a valid email address.' },
  )
  invitees: string[];

  req?: IRequest;
}

export class EmployeeAcceptInviteDto {
  @IsString()
  @IsEmail()
  email: string;

  orgSlug: string;

  req?: IRequest;
}
