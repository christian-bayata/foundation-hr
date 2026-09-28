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
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiresSystemSettings } from '../../common/decorators/requires-system-settings.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../common';
import { SystemRole } from '../auth/enum/role.enum';
import { SettingService } from './setting.service';
import { CreateRoleDto } from './access-control/dto/create-role.dto';
import {
  AssignRoleDto,
  RemoveRoleDto,
} from './access-control/dto/assign-role.dto';
import {
  AddCompanyAdminDto,
  UpdateCompanyAdminRoleDto,
} from './access-control/dto/company-admin.dto';
import type { ListCompanyAdminQuery } from './access-control/interface/company-admin.interface';
import { AppResponse } from '../../common/response/app-response';
import { UserRoleFlag } from './organisation/enum/organisation.enum';

@Controller('setting')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
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

  @Get('access-control/company-admin/retrieve/all')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveAllCompanyAdmins(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListCompanyAdminQuery,
  ) {
    const data = await this.settingService.listCompanyAdmins(
      user.organizationId!,
      query,
    );
    return AppResponse.success(
      'Company admins retrieved successfully',
      200,
      data,
    );
  }

  @Post('access-control/company-admin/create')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addCompanyAdmin(
    @CurrentUser() user: ICurrentUser,
    @Body() addCompanyAdminDto: AddCompanyAdminDto,
  ) {
    const data = await this.settingService.addCompanyAdmin(
      user.organizationId!,
      user.userId,
      addCompanyAdminDto,
    );
    return AppResponse.success('Company admin added successfully', 201, data);
  }

  @Patch('access-control/company-admin/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async updateCompanyAdminRole(
    @CurrentUser() user: ICurrentUser,
    @Query('roleId') roleId: string,
    @Body() updateCompanyAdminRoleDto: UpdateCompanyAdminRoleDto,
  ) {
    const data = await this.settingService.updateCompanyAdminRole(
      roleId,
      updateCompanyAdminRoleDto,
    );
    return AppResponse.success(
      'Company admin role updated successfully',
      200,
      data,
    );
  }

  @Patch('access-control/user-role/actions')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async activateUserRole(
    @CurrentUser() user: ICurrentUser,
    @Query('roleId') roleId: string,
    @Query('flag') flag: UserRoleFlag,
  ) {
    const data = await this.settingService.activateUserRole(roleId, flag);
    return AppResponse.success(
      'User role actions updated successfully',
      200,
      data,
    );
  }
}
