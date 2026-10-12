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
import { UpdateOnboardingSettingsDto } from './dto/update-onboarding-settings.dto';
import { AddOnboardingDocumentDto } from './dto/add-onboarding-document.dto';
import { UpdateOnboardingDocumentDto } from './dto/update-onboarding-document.dto';
import { AddEmployerIssuedDocumentDto } from './dto/add-employer-issued-document.dto';
import { UpdateEmployerIssuedDocumentDto } from './dto/update-employer-issued-document.dto';

@Controller('setting/onboarding')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class OnboardingController {
  constructor(
    private readonly organisationService: SettingsDomainOrganisationService,
  ) {}

  @Get('retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveOnboardingSettings(@CurrentUser() user: ICurrentUser) {
    const data = await this.organisationService.getOnboardingSettings(
      user.organizationId!,
    );
    return AppResponse.success(
      'Onboarding settings retrieved successfully',
      200,
      data,
    );
  }

  @Patch('update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateOnboardingSettings(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateOnboardingSettingsDto,
  ) {
    const data = await this.organisationService.updateOnboardingSettings(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Onboarding settings updated successfully',
      200,
      data,
    );
  }

  @Post('documentation/document/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addOnboardingDocument(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddOnboardingDocumentDto,
  ) {
    const data = await this.organisationService.addOnboardingDocument(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Onboarding document added successfully',
      201,
      data,
    );
  }

  @Patch('documentation/document/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateOnboardingDocument(
    @CurrentUser() user: ICurrentUser,
    @Query('documentId') documentId: string,
    @Body() dto: UpdateOnboardingDocumentDto,
  ) {
    const data = await this.organisationService.updateOnboardingDocument(
      user.organizationId!,
      documentId,
      dto,
    );
    return AppResponse.success(
      'Onboarding document updated successfully',
      200,
      data,
    );
  }

  @Delete('documentation/document/delete')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteOnboardingDocument(
    @CurrentUser() user: ICurrentUser,
    @Query('documentId') documentId: string,
  ) {
    const data = await this.organisationService.deleteOnboardingDocument(
      user.organizationId!,
      documentId,
    );
    return AppResponse.success(
      'Onboarding document deleted successfully',
      200,
      data,
    );
  }

  @Post('employer-issued-document/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addEmployerIssuedDocument(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddEmployerIssuedDocumentDto,
  ) {
    const data = await this.organisationService.addEmployerIssuedDocument(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Employer-issued document added successfully',
      201,
      data,
    );
  }

  @Patch('employer-issued-document/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateEmployerIssuedDocument(
    @CurrentUser() user: ICurrentUser,
    @Query('documentId') documentId: string,
    @Body() dto: UpdateEmployerIssuedDocumentDto,
  ) {
    const data = await this.organisationService.updateEmployerIssuedDocument(
      user.organizationId!,
      documentId,
      dto,
    );
    return AppResponse.success(
      'Employer-issued document updated successfully',
      200,
      data,
    );
  }

  @Delete('employer-issued-document/delete')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteEmployerIssuedDocument(
    @CurrentUser() user: ICurrentUser,
    @Query('documentId') documentId: string,
  ) {
    const data = await this.organisationService.deleteEmployerIssuedDocument(
      user.organizationId!,
      documentId,
    );
    return AppResponse.success(
      'Employer-issued document deleted successfully',
      200,
      data,
    );
  }
}
