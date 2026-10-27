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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { RequiresSystemSettings } from '../../common/decorators/requires-system-settings.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../../common';
import { SystemRole } from '../auth/enum/role.enum';
import { OnboardingService } from './onboarding.service';
import {
  AddEmployeeOnboardingDto,
  RetrieveEmployeeOnboardingDto,
  UpdateEmployeeOnboardingStepDto,
} from './dto/employee-onboarding.dto';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('employee/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addEmployeeOnboarding(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddEmployeeOnboardingDto,
  ) {
    const data = await this.onboardingService.addEmployeeOnboarding(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Employee onboarding initialized successfully',
      201,
      data,
    );
  }

  @Get('employee/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async getEmployeeOnboarding(
    @CurrentUser() user: ICurrentUser,
    @Query() dto: RetrieveEmployeeOnboardingDto,
  ) {
    const data = await this.onboardingService.getEmployeeOnboarding(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Employee onboarding retrieved successfully',
      200,
      data,
    );
  }

  @Patch('employee/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateEmployeeOnboardingStep(
    @CurrentUser() user: ICurrentUser,
    @Query('employeeId') employeeId: string,
    @Query('stepId') stepId: string,
    @Body() dto: UpdateEmployeeOnboardingStepDto,
  ) {
    const data = await this.onboardingService.updateEmployeeOnboardingStep(
      user.organizationId!,
      employeeId,
      stepId,
      dto,
    );
    return AppResponse.success(
      'Employee onboarding step updated successfully',
      200,
      data,
    );
  }

  @Get('employee/list')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async listEmployeeOnboarding(@CurrentUser() user: ICurrentUser) {
    const data = await this.onboardingService.listEmployeeOnboarding(
      user.organizationId!,
    );
    return AppResponse.success(
      'Employee onboarding list retrieved successfully',
      200,
      data,
    );
  }
}
