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
import { AddOffboardingTypeDto } from './dto/add-offboarding-type.dto';
import { AddExitReasonDto } from './dto/add-exit-reason.dto';
import { AddExitChecklistItemDto } from './dto/add-exit-checklist-item.dto';
import { UpdateExitChecklistItemDto } from './dto/update-exit-checklist-item.dto';
import { AddEmployerExitDocumentDto } from './dto/add-employer-exit-document.dto';
import { UpdateEmployerExitDocumentDto } from './dto/update-employer-exit-document.dto';
import { AddComplianceChecklistItemDto } from './dto/add-compliance-checklist-item.dto';
import { UpdateComplianceChecklistItemDto } from './dto/update-compliance-checklist-item.dto';
import { UpdateDataRetentionDto } from './dto/update-data-retention.dto';
import { OffboardingItemQueryDto } from './dto/offboarding-item-query.dto';

@Controller('setting/offboarding')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class OffboardingController {
  constructor(
    private readonly organisationService: SettingsDomainOrganisationService,
  ) {}

  @Get('general/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveGeneralSettings(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getOffboardingSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Off-boarding settings retrieved successfully',
      200,
      data,
    );
  }

  @Post('general/offboarding-type/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addOffboardingType(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddOffboardingTypeDto,
  ) {
    const data = await this.organisationService.addOffboardingType(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Off-boarding type added successfully',
      201,
      data,
    );
  }

  @Delete('general/offboarding-type/remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeOffboardingType(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: OffboardingItemQueryDto,
  ) {
    const data = await this.organisationService.removeOffboardingType(
      user.organizationId!,
      id,
    );
    return AppResponse.success(
      'Off-boarding type removed successfully',
      200,
      data,
    );
  }

  @Post('general/exit-reason/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addExitReason(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddExitReasonDto,
  ) {
    const data = await this.organisationService.addExitReason(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Exit reason added successfully', 201, data);
  }

  @Delete('general/exit-reason/remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeExitReason(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: OffboardingItemQueryDto,
  ) {
    const data = await this.organisationService.removeExitReason(
      user.organizationId!,
      id,
    );
    return AppResponse.success('Exit reason removed successfully', 200, data);
  }

  @Post('general/exit-checklist/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addExitChecklistItem(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddExitChecklistItemDto,
  ) {
    const data = await this.organisationService.addExitChecklistItem(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Exit checklist item added successfully',
      201,
      data,
    );
  }

  @Patch('general/exit-checklist/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateExitChecklistItem(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: OffboardingItemQueryDto,
    @Body() dto: UpdateExitChecklistItemDto,
  ) {
    const data = await this.organisationService.updateExitChecklistItem(
      user.organizationId!,
      id,
      dto,
    );
    return AppResponse.success(
      'Exit checklist item updated successfully',
      200,
      data,
    );
  }

  @Delete('general/exit-checklist/remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeExitChecklistItem(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: OffboardingItemQueryDto,
  ) {
    const data = await this.organisationService.removeExitChecklistItem(
      user.organizationId!,
      id,
    );
    return AppResponse.success(
      'Exit checklist item removed successfully',
      200,
      data,
    );
  }

  @Get('exit-documents/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveExitDocumentsSettings(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getOffboardingDocumentsSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Exit documents settings retrieved successfully',
      200,
      data,
    );
  }

  @Post('exit-documents/employer-document/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addEmployerExitDocument(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddEmployerExitDocumentDto,
  ) {
    const data = await this.organisationService.addEmployerExitDocument(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Employer exit document added successfully',
      201,
      data,
    );
  }

  @Patch('exit-documents/employer-document/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateEmployerExitDocument(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: OffboardingItemQueryDto,
    @Body() dto: UpdateEmployerExitDocumentDto,
  ) {
    const data = await this.organisationService.updateEmployerExitDocument(
      user.organizationId!,
      id,
      dto,
    );
    return AppResponse.success(
      'Employer exit document updated successfully',
      200,
      data,
    );
  }

  @Delete('exit-documents/employer-document/remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeEmployerExitDocument(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: OffboardingItemQueryDto,
  ) {
    const data = await this.organisationService.removeEmployerExitDocument(
      user.organizationId!,
      id,
    );
    return AppResponse.success(
      'Employer exit document removed successfully',
      200,
      data,
    );
  }

  @Post('exit-documents/compliance-checklist/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addComplianceChecklistItem(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddComplianceChecklistItemDto,
  ) {
    const data = await this.organisationService.addComplianceChecklistItem(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Compliance checklist item added successfully',
      201,
      data,
    );
  }

  @Patch('exit-documents/compliance-checklist/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateComplianceChecklistItem(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: OffboardingItemQueryDto,
    @Body() dto: UpdateComplianceChecklistItemDto,
  ) {
    const data = await this.organisationService.updateComplianceChecklistItem(
      user.organizationId!,
      id,
      dto,
    );
    return AppResponse.success(
      'Compliance checklist item updated successfully',
      200,
      data,
    );
  }

  @Delete('exit-documents/compliance-checklist/remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeComplianceChecklistItem(
    @CurrentUser() user: ICurrentUser,
    @Query() { id }: OffboardingItemQueryDto,
  ) {
    const data = await this.organisationService.removeComplianceChecklistItem(
      user.organizationId!,
      id,
    );
    return AppResponse.success(
      'Compliance checklist item removed successfully',
      200,
      data,
    );
  }

  @Patch('exit-documents/data-retention/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateDataRetention(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateDataRetentionDto,
  ) {
    const data = await this.organisationService.updateDataRetention(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Data retention period updated successfully',
      200,
      data,
    );
  }
}
