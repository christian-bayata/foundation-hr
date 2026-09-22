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
import { AppResponse, JoiValidationPipe, Roles } from '../../../common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { SystemRole } from '../../auth/enum/role.enum';
import { SettingsDomainOrganisationService } from '../domain/settings.domain.organisation.service';
import { UpdateGeneralInfoDto } from './dto/update-general-info.dto';
import { UpdateBusinessDetailsDto } from './dto/update-business-details.dto';
import { UpdateLocationsDto } from './dto/update-locations.dto';
import { UpdateHierarchyDto } from './dto/organization-hierarchy.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import {
  DepartmentCodeQueryDto,
  UpdateDepartmentDto,
} from './dto/update-departments.dto';
import {
  AddDepartmentDto,
  AddDepartmentsDto,
  AddSingleDepartmentDto,
} from './dto/add-department.dto';
import {
  orgBusinessDetailsSchema,
  orgGeneralInfoSchema,
} from './dto/organisation.schemas';

@Controller('setting/organization')
@UseGuards(JwtAuthGuard, RoleGuard)
export class OrganisationController {
  constructor(
    private readonly organisationService: SettingsDomainOrganisationService,
  ) {}

  @Get('general-info/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveGeneralInfo(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getGeneralInfo(
      user.organizationId!,
    );
    return AppResponse.success(
      'General information retrieved successfully',
      200,
      data,
    );
  }

  @Patch('general-info/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  // @UsePipes(new JoiValidationPipe(orgGeneralInfoSchema))
  async updateGeneralInfo(
    @CurrentUser() user: ICurrentUser,
    @Body() updateGeneralInfoDto: UpdateGeneralInfoDto,
  ) {
    const data = await this.organisationService.updateGeneralInfo(
      user.organizationId!,
      updateGeneralInfoDto,
    );
    return AppResponse.success(
      'General information updated successfully',
      200,
      data,
    );
  }

  @Get('business-details/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveBusinessDetails(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getBusinessDetails(
      user.organizationId!,
    );
    return AppResponse.success(
      'Business details retrieved successfully',
      200,
      data,
    );
  }

  @Patch('business-details/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  // @UsePipes(new JoiValidationPipe(orgBusinessDetailsSchema))
  async updateBusinessDetails(
    @CurrentUser() user: ICurrentUser,
    @Body() updateBusinessDetailsDto: UpdateBusinessDetailsDto,
  ) {
    const data = await this.organisationService.updateBusinessDetails(
      user.organizationId!,
      updateBusinessDetailsDto,
    );
    return AppResponse.success(
      'Business details updated successfully',
      200,
      data,
    );
  }

  @Get('locations/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveLocations(
    @CurrentUser() user: ICurrentUser,
    @Query('search') search?: string,
  ) {
    const data = await this.organisationService.getLocations(
      user.organizationId!,
      search,
    );
    return AppResponse.success('Locations retrieved successfully', 200, data);
  }

  @Patch('locations/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateLocations(
    @CurrentUser() user: ICurrentUser,
    @Body() updateLocationsDto: UpdateLocationsDto,
  ) {
    const data = await this.organisationService.updateLocations(
      user.organizationId!,
      updateLocationsDto,
    );
    return AppResponse.success('Locations updated successfully', 200, data);
  }

  @Get('organization-hierarchy/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveOrganisationHierarchy(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getOrganisationHierarchy(
      user.organizationId!,
    );
    return AppResponse.success(
      'Organisation hierarchy retrieved successfully',
      200,
      data,
    );
  }

  @Patch('organization-hierarchy/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateOrganisationHierarchy(
    @CurrentUser() user: ICurrentUser,
    @Body() updateHierarchyDto: UpdateHierarchyDto,
  ) {
    const data = await this.organisationService.updateOrganisationHierarchy(
      user.organizationId!,
      updateHierarchyDto,
    );
    return AppResponse.success(
      'Organisation hierarchy updated successfully',
      200,
      data,
    );
  }

  @Get('policy-management/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrievePolicyManagement(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getPolicyManagement(
      user.organizationId!,
    );
    return AppResponse.success(
      'Policy management retrieved successfully',
      200,
      data,
    );
  }

  @Patch('policy-management/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updatePolicyManagement(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: unknown,
  ) {
    const data = await this.organisationService.updatePolicyManagement(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Policy management updated successfully',
      200,
      data,
    );
  }

  @Get('branding/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveBranding(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getBranding(
      user.organizationId!,
    );
    return AppResponse.success('Branding retrieved successfully', 200, data);
  }

  @Patch('branding/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateBranding(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateBrandingDto,
  ) {
    const data = await this.organisationService.updateBranding(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Branding updated successfully', 200, data);
  }

  @Get('departments/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveDepartments(
    @CurrentUser() user: ICurrentUser,
    @Query('search') search?: string,
  ) {
    const data = await this.organisationService.getDepartments(
      user.organizationId!,
      search,
    );
    return AppResponse.success('Departments retrieved successfully', 200, data);
  }

  @Patch('departments/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateDepartments(
    @CurrentUser() user: ICurrentUser,
    @Query() { code }: DepartmentCodeQueryDto,
    @Body() dto: UpdateDepartmentDto,
  ) {
    if (Array.isArray(dto)) {
      AppResponse.error({
        message:
          'A single department payload is required, not an array of updates.',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    const data = await this.organisationService.updateDepartments(
      user.organizationId!,
      code,
      dto,
    );
    return AppResponse.success('Departments updated successfully', 200, data);
  }

  @Post('departments/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addDepartments(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddDepartmentsDto,
  ) {
    const data = await this.organisationService.addDepartments(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Departments added successfully', 201, data);
  }

  @Post('departments/add-single')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addDepartment(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddSingleDepartmentDto,
  ) {
    const data = await this.organisationService.addDepartment(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Department added successfully', 201, data);
  }

  @Delete('departments/delete')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteDepartments(
    @CurrentUser() user: ICurrentUser,
    @Query() { code }: DepartmentCodeQueryDto,
  ) {
    const data = await this.organisationService.deleteDepartments(
      user.organizationId!,
      code,
    );
    return AppResponse.success('Departments updated successfully', 200, data);
  }

  @Get('billing/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveBilling(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getBilling(
      user.organizationId!,
    );
    return AppResponse.success('Billing retrieved successfully', 200, data);
  }

  @Patch('billing/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateBilling(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateBillingDto,
  ) {
    const data = await this.organisationService.updateBilling(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Billing updated successfully', 200, data);
  }

  @Get('billing/invoices/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveBillingInvoices(
    @CurrentUser() user: ICurrentUser,
    @Query('search') search?: string,
  ) {
    const data = await this.organisationService.getInvoices(
      user.organizationId!,
      search,
    );
    return AppResponse.success('Invoices retrieved successfully', 200, data);
  }
}
