import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IRequest } from '../../../common';
import { UserType } from '../enum/user.enum';

export class SignUpDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).*$/, {
    message: 'Password must contain at least one letter and one number.',
  })
  password: string;

  @IsOptional()
  @IsIn([UserType.COMPANY, UserType.INDIVIDUAL], {
    message: 'userType must be either company or individual.',
  })
  userType?: UserType;

  req?: IRequest;
}
