import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InfoAccess } from '../../auth/enum/info-access.enum';
import { SystemRole } from '../../auth/enum/role.enum';
import { PermissionModule } from '../../auth/enum/module.enum';

export class ModulePermissionDto {
  @IsEnum(PermissionModule)
  @IsNotEmpty()
  module: PermissionModule;

  @IsNotEmpty()
  view: boolean;

  @IsNotEmpty()
  edit: boolean;
}

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name is required.' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SystemRole, {
    message: 'Parent system role must be a valid system role.',
  })
  @IsNotEmpty({ message: 'Parent system role is required.' })
  parentSystemRole: SystemRole;

  @IsEnum(InfoAccess, {
    message: 'Info access must be either DIRECT_REPORTS_ONLY or EVERYONE.',
  })
  @IsOptional()
  infoAccess?: InfoAccess;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModulePermissionDto)
  @IsOptional()
  modulePermissions?: ModulePermissionDto[];
}
