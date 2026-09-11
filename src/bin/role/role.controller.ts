import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../common';
import { SystemRole } from '../auth/enum/role.enum';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto, RemoveRoleDto } from './dto/assign-role.dto';
import { AppResponse } from '../../common/response/app-response';

@Controller('roles')
@UseGuards(JwtAuthGuard, RoleGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async getRoles(@CurrentUser() user: ICurrentUser) {
    const data = await this.roleService.getRolesByOrganization(
      user.organizationId!,
    );
    return AppResponse.success('Roles retrieved successfully', 200, data);
  }

  @Get(':id')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async getRole(@Param('id') id: string) {
    const data = await this.roleService.getRoleById(id);
    return AppResponse.success('Role retrieved successfully', 200, data);
  }

  @Post()
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createRole(
    @CurrentUser() user: ICurrentUser,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    const data = await this.roleService.createCustomRole(
      user.organizationId!,
      createRoleDto,
    );
    return AppResponse.success('Role created successfully', 201, data);
  }

  @Patch(':id')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: Partial<CreateRoleDto>,
  ) {
    const data = await this.roleService.updateCustomRole(id, updateRoleDto);
    return AppResponse.success('Role updated successfully', 200, data);
  }

  @Delete(':id')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteRole(@Param('id') id: string) {
    await this.roleService.deleteCustomRole(id);
    return AppResponse.success('Role deleted successfully', 200);
  }

  @Post('assign')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async assignRole(
    @CurrentUser() user: ICurrentUser,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    await this.roleService.assignRole(
      assignRoleDto.userId,
      assignRoleDto.roleId,
      user.organizationId!,
    );
    return AppResponse.success('Role assigned successfully', 200);
  }

  @Post('remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeRole(
    @CurrentUser() user: ICurrentUser,
    @Body() removeRoleDto: RemoveRoleDto,
  ) {
    await this.roleService.removeRole(
      removeRoleDto.userId,
      removeRoleDto.roleId,
      user.organizationId!,
    );
    return AppResponse.success('Role removed successfully', 200);
  }

  @Get('user/:userId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async getUserRoles(
    @CurrentUser() user: ICurrentUser,
    @Param('userId') userId: string,
  ) {
    const data = await this.roleService.getUserRoles(
      userId,
      user.organizationId!,
    );
    return AppResponse.success('User roles retrieved successfully', 200, data);
  }
}
