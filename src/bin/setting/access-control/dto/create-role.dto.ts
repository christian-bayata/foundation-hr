import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Validate,
} from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { InfoAccess } from '../../../auth/enum/info-access.enum';
import { SystemRole } from '../../../auth/enum/role.enum';
import { PermissionModule } from '../../../auth/enum/module.enum';

export class ModulePermissionDto {
  view: boolean;

  edit: boolean;
}

@ValidatorConstraint({ name: 'modulePermissions', async: false })
class ModulePermissionsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    for (const [module, permissions] of Object.entries(value as object)) {
      if (
        !(Object.values(PermissionModule) as string[]).includes(module)
      ) {
        return false;
      }

      const p = permissions as { view?: unknown; edit?: unknown };
      if (
        typeof p !== 'object' ||
        p === null ||
        typeof p.view !== 'boolean' ||
        typeof p.edit !== 'boolean'
      ) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(): string {
    return 'modulePermissions must be an object keyed by module names with { view, edit } boolean values.';
  }
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

  @IsObject()
  @Validate(ModulePermissionsConstraint)
  @IsOptional()
  modulePermissions?: Record<string, ModulePermissionDto>;

  @IsArray()
  @IsEmail({}, { each: true, message: 'Each invitee must be a valid email address.' })
  @IsOptional()
  invitees?: string[];
}