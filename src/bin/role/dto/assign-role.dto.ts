import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'User ID is required.' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: 'Role ID is required.' })
  roleId: string;
}

export class BulkAssignRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role ID is required.' })
  roleId: string;

  @IsArray()
  @IsNotEmpty({ message: 'At least one user ID is required.' })
  userIds: string[];
}

export class RemoveRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'User ID is required.' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: 'Role ID is required.' })
  roleId: string;
}
