import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppResponse, Roles } from '../../common';
import type { CurrentUser as ICurrentUser } from '../../common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresSystemSettings } from '../../common/decorators/requires-system-settings.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { SystemRole } from '../auth/enum/role.enum';
import {
  CancelExitRequestDto,
  CompleteExitRequestDto,
  ExitSummaryQueryDto,
  InitiateExitRequestDto,
  ListExitRequestQueryDto,
  RetrieveExitRequestDto,
  UpdateExitChecklistDto,
  UpdateExitDocumentDto,
  UpdateExitRequestDto,
  UpdateExitRequestStepDto,
} from './dto/offboarding.dto';
import { OffboardingService } from './offboarding.service';

@Controller('offboarding')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class OffboardingController {
  constructor(private readonly offboardingService: OffboardingService) {}

  @Get('requests/form/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveFormOptions(@CurrentUser() user: ICurrentUser) {
    const data = await this.offboardingService.getFormOptions(
      user.organizationId!,
    );
    return AppResponse.success(
      'Exit form options retrieved successfully',
      200,
      data,
    );
  }

  @Get('requests/retrieve/all')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRequests(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListExitRequestQueryDto,
  ) {
    const data = await this.offboardingService.listRequests(
      user.organizationId!,
      query,
    );
    return AppResponse.success(
      'Exit requests retrieved successfully',
      200,
      data,
    );
  }

  @Get('requests/retrieve/single')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRequest(
    @CurrentUser() user: ICurrentUser,
    @Query() dto: RetrieveExitRequestDto,
  ) {
    const data = await this.offboardingService.retrieveRequest(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Exit request retrieved successfully',
      200,
      data,
    );
  }

  @Post('requests/initiate')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async initiateRequest(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: InitiateExitRequestDto,
  ) {
    const data = await this.offboardingService.initiateRequest(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Exit request initiated successfully', 201, data);
  }

  @Patch('requests/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateRequest(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateExitRequestDto,
  ) {
    const data = await this.offboardingService.updateRequest(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Exit request updated successfully', 200, data);
  }

  @Patch('requests/step/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateRequestStep(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateExitRequestStepDto,
  ) {
    const data = await this.offboardingService.updateRequestStep(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success(
      'Exit request step updated successfully',
      200,
      data,
    );
  }

  @Patch('requests/cancel')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async cancelRequest(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CancelExitRequestDto,
  ) {
    const data = await this.offboardingService.cancelRequest(
      user.organizationId!,
      dto,
    );
    return AppResponse.success('Exit request cancelled successfully', 200, data);
  }

  @Patch('requests/checklist/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateChecklist(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateExitChecklistDto,
  ) {
    const data = await this.offboardingService.updateChecklist(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success(
      'Exit checklist item updated successfully',
      200,
      data,
    );
  }

  @Patch('requests/document/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateDocument(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateExitDocumentDto,
  ) {
    const data = await this.offboardingService.updateDocument(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Exit document updated successfully',
      200,
      data,
    );
  }

  @Patch('requests/complete')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async completeRequest(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CompleteExitRequestDto,
  ) {
    const data = await this.offboardingService.completeRequest(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Exit completed successfully', 200, data);
  }

  @Get('summary/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveSummary(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ExitSummaryQueryDto,
  ) {
    const data = await this.offboardingService.getSummary(
      user.organizationId!,
      query,
    );
    return AppResponse.success('Exit summary retrieved successfully', 200, data);
  }
}
