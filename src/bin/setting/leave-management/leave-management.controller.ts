import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppResponse, Roles } from '../../../common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { RequiresSystemSettings } from '../../../common/decorators/requires-system-settings.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { SystemRole } from '../../auth/enum/role.enum';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';
import { UpdateLeaveManagementDto } from './dto/update-leave-management.dto';
import { AddLeaveCategoryDto } from './dto/add-leave-category.dto';
import { LeaveCategoryQueryDto } from './dto/leave-category-query.dto';
import { UpdateLeaveEntitlementDto } from './dto/update-leave-entitlement.dto';
import { AddLeaveRestrictedPeriodDto } from './dto/add-leave-restricted-period.dto';
import { UpdateLeaveRestrictedPeriodDto } from './dto/update-leave-restricted-period.dto';
import { LeaveRestrictedPeriodQueryDto } from './dto/leave-restricted-period-query.dto';

@Controller('setting/leave-management')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class LeaveManagementController {
  constructor(
    private readonly organisationService: SettingsDomainOrganisationService,
  ) {}

  @Get('general-policy/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveGeneralPolicy(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getLeaveManagementSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Leave management settings retrieved successfully',
      200,
      data,
    );
  }

  @Patch('general-policy/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateGeneralPolicy(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateLeaveManagementDto,
  ) {
    const data = await this.organisationService.updateLeaveManagementSettings(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Leave management settings updated successfully',
      200,
      data,
    );
  }

  @Post('general-policy/leave-category/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addLeaveCategory(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddLeaveCategoryDto,
  ) {
    const data = await this.organisationService.addLeaveCategory(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Leave category added successfully', 201, data);
  }

  @Delete('general-policy/leave-category/remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeLeaveCategory(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: LeaveCategoryQueryDto,
  ) {
    const data = await this.organisationService.removeLeaveCategory(
      user.organizationId!,
      id,
    );
    return AppResponse.success(
      'Leave category removed successfully',
      200,
      data,
    );
  }

  @Get('entitlement/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveEntitlement(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getLeaveEntitlementSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Leave entitlement settings retrieved successfully',
      200,
      data,
    );
  }

  @Patch('entitlement/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateEntitlement(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateLeaveEntitlementDto,
  ) {
    const data = await this.organisationService.updateLeaveEntitlementSettings(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Leave entitlement settings updated successfully',
      200,
      data,
    );
  }

  @Post('entitlement/restricted-period/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addLeaveRestrictedPeriod(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddLeaveRestrictedPeriodDto,
  ) {
    const data = await this.organisationService.addLeaveRestrictedPeriod(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Leave restricted period added successfully',
      201,
      data,
    );
  }

  @Patch('entitlement/restricted-period/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateLeaveRestrictedPeriod(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: LeaveRestrictedPeriodQueryDto,
    @Body() dto: UpdateLeaveRestrictedPeriodDto,
  ) {
    const data = await this.organisationService.updateLeaveRestrictedPeriod(
      user.organizationId!,
      id,
      dto,
    );
    return AppResponse.success(
      'Leave restricted period updated successfully',
      200,
      data,
    );
  }

  @Delete('entitlement/restricted-period/remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeLeaveRestrictedPeriod(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: LeaveRestrictedPeriodQueryDto,
  ) {
    const data = await this.organisationService.removeLeaveRestrictedPeriod(
      user.organizationId!,
      id,
    );
    return AppResponse.success(
      'Leave restricted period removed successfully',
      200,
      data,
    );
  }
}
