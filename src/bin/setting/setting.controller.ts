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
import { SettingService } from './setting.service';
import { CreateRoleDto } from './access-control/dto/create-role.dto';
import {
  AssignRoleDto,
  RemoveRoleDto,
} from './access-control/dto/assign-role.dto';
import { AppResponse } from '../../common/response/app-response';

@Controller('setting')
@UseGuards(JwtAuthGuard, RoleGuard)
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get('access-control/role/retrieve/all')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveAllRoles(@CurrentUser() user: ICurrentUser) {
    const data = await this.settingService.getRolesByOrganization(
      user.organizationId!,
    );
    return AppResponse.success('Roles retrieved successfully', 200, data);
  }

  @Get('access-control/role/retrieve/user/:userId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveUserRoles(
    @CurrentUser() user: ICurrentUser,
    @Param('userId') userId: string,
  ) {
    const data = await this.settingService.getUserRoles(
      userId,
      user.organizationId!,
    );
    return AppResponse.success('User roles retrieved successfully', 200, data);
  }

  @Get('access-control/role/retrieve/:id')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRole(@Param('id') id: string) {
    const data = await this.settingService.getRoleById(id);
    return AppResponse.success('Role retrieved successfully', 200, data);
  }

  @Post('access-control/role/create')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createRole(
    @CurrentUser() user: ICurrentUser,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    const data = await this.settingService.createCustomRole(
      user.organizationId!,
      createRoleDto,
    );
    return AppResponse.success('Role created successfully', 201, data);
  }

  @Patch('access-control/role/update/:id')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: Partial<CreateRoleDto>,
  ) {
    const data = await this.settingService.updateCustomRole(id, updateRoleDto);
    return AppResponse.success('Role updated successfully', 200, data);
  }

  @Delete('access-control/role/delete/:id')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteRole(@Param('id') id: string) {
    await this.settingService.deleteCustomRole(id);
    return AppResponse.success('Role deleted successfully', 200);
  }

  @Post('access-control/role/assign')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async assignRole(
    @CurrentUser() user: ICurrentUser,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    await this.settingService.assignRole(
      assignRoleDto.userId,
      assignRoleDto.roleId,
      user.organizationId!,
    );
    return AppResponse.success('Role assigned successfully', 200);
  }

  @Post('access-control/role/remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeRole(
    @CurrentUser() user: ICurrentUser,
    @Body() removeRoleDto: RemoveRoleDto,
  ) {
    await this.settingService.removeRole(
      removeRoleDto.userId,
      removeRoleDto.roleId,
      user.organizationId!,
    );
    return AppResponse.success('Role removed successfully', 200);
  }
}
