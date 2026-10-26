import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export type AdminType = 'internal' | 'external';

export class AddCompanyAdminDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Job title is required.' })
  jobTitle: string;

  @IsOptional()
  @IsIn(['internal', 'external'], { message: 'Admin type must be internal or external.' })
  adminType?: AdminType;

  @IsBoolean()
  @IsOptional()
  billingContact?: boolean;

  @IsBoolean()
  @IsOptional()
  authorizedRepresentative?: boolean;

  /**
   * When false the admin is denied the whole organization settings area. Defaults
   * to true so omitting the field preserves the access an existing admin has.
   */
  @IsBoolean()
  @IsOptional()
  systemSettings?: boolean;
}

export class UpdateCompanyAdminRoleDto {
  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  jobTitle: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsBoolean()
  @IsOptional()
  billingContact?: boolean;

  @IsBoolean()
  @IsOptional()
  authorizedRepresentative?: boolean;

  @IsBoolean()
  @IsOptional()
  systemSettings?: boolean;
}
