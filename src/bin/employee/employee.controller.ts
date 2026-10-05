import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppResponse, JoiValidationPipe, Public, Roles } from '../../common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser, IRequest } from '../../common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { OnboardingBasicInformationDto } from './dto/onboarding-basic-info.dto';
import { OnboardingContactsDto } from './dto/onboarding-contacts.dto';
import { OnboardingFinanceInformationDto } from './dto/onboarding-finance.dto';
import {
  EmployeeAcceptInviteDto,
  InviteEmployeesDto,
} from './dto/invite-employees.dto';
import { EmployeeSetPasswordDto } from './dto/set-password.dto';
import { setPasswordSchema } from './dto/set-password.schema';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from './dto/create-employee.schema';
import { onboardingBasicInformationSchema } from './dto/onboarding-basic-info.schema';
import { onboardingContactsSchema } from './dto/onboarding-contacts.schema';
import { onboardingFinanceInformationSchema } from './dto/onboarding-finance.schema';
import {
  inviteEmployeesSchema,
  inviteIdParamSchema,
  listEmployeeQuerySchema,
} from './dto/employee.schemas';
import type { ListEmployeeQuery } from './interface/employee.interface';
import { SystemRole } from '../auth/enum/role.enum';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post('/create')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @UsePipes(new JoiValidationPipe(createEmployeeSchema))
  async createEmployee(
    @Req() req: IRequest,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    createEmployeeDto.req = req;
    const data = await this.employeeService.createEmployee(createEmployeeDto);

    return AppResponse.success(
      'Employee draft created successfully',
      201,
      data,
    );
  }

  @Get('/retrieve/all')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  // @UsePipes(new JoiValidationPipe(listEmployeeQuerySchema))
  async listEmployees(
    @Req() req: IRequest,
    @Query() listEmployeeQuery: ListEmployeeQuery,
  ) {
    listEmployeeQuery.organizationId = req.user?.organizationId;
    const data = await this.employeeService.listEmployees(listEmployeeQuery);

    return AppResponse.success('Employees retrieved successfully', 200, data);
  }

  @Get('/retrieve/:employeeId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async getEmployee(
    @Param('employeeId', new JoiValidationPipe(inviteIdParamSchema))
    employeeId: string,
  ) {
    const data = await this.employeeService.getEmployee(employeeId);

    return AppResponse.success('Employee retrieved successfully', 200, data);
  }

  @Post('/save-draft/:employeeId')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async saveDraft(
    @Req() req: IRequest,
    @Param('employeeId', new JoiValidationPipe(inviteIdParamSchema))
    employeeId: string,
    @Body(new JoiValidationPipe(updateEmployeeSchema))
    createEmployeeDto: CreateEmployeeDto,
  ) {
    createEmployeeDto.req = req;
    const data = await this.employeeService.saveDraft(
      employeeId,
      createEmployeeDto,
    );

    return AppResponse.success('Employee draft saved successfully', 200, data);
  }

  @Post('/invite')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new JoiValidationPipe(inviteEmployeesSchema))
  async inviteEmployees(
    @Req() req: IRequest,
    @Body() inviteEmployeesDto: InviteEmployeesDto,
  ) {
    const data = await this.employeeService.inviteEmployees(
      inviteEmployeesDto.invitees,
      req.user?.organizationId,
    );

    return AppResponse.success('Employees invited successfully', 200, data);
  }

  @Public()
  @Post('/invite/accept')
  @HttpCode(HttpStatus.OK)
  async employeeAcceptInvite(
    @Query('orgSlug') orgSlug: string,
    @Body() employeeAcceptInviteDto: EmployeeAcceptInviteDto,
  ) {
    employeeAcceptInviteDto.orgSlug = orgSlug;
    const data = await this.employeeService.employeeAcceptInvite(
      employeeAcceptInviteDto,
    );

    return AppResponse.success('Employee accepted invite', 200, data);
  }

  @Public()
  @Post('/invite/set-password')
  @HttpCode(HttpStatus.OK)
  // @UsePipes(new JoiValidationPipe(setPasswordSchema))
  async employeeSetPassword(
    @Query('orgSlug') orgSlug: string,
    @Body() employeeSetPasswordDto: EmployeeSetPasswordDto,
  ) {
    employeeSetPasswordDto.orgSlug = orgSlug;
    const data = await this.employeeService.employeeSetPassword(
      employeeSetPasswordDto,
    );

    return AppResponse.success('Password set successfully', 200, data);
  }

  @Get('/onboarding/retrieve')
  async getOnboarding(@CurrentUser() user: ICurrentUser) {
    const data = await this.employeeService.getOnboarding(user.email);

    return AppResponse.success(
      'Onboarding data retrieved successfully',
      200,
      data,
    );
  }

  @Post('/onboarding/basic-information')
  @HttpCode(HttpStatus.OK)
  // @UsePipes(new JoiValidationPipe(onboardingBasicInformationSchema))
  async saveOnboardingBasicInformation(
    @CurrentUser() user: ICurrentUser,
    @Body() onboardingBasicInformationDto: OnboardingBasicInformationDto,
  ) {
    const data = await this.employeeService.saveOnboardingBasicInformation(
      user.email,
      onboardingBasicInformationDto,
    );

    return AppResponse.success(
      'Personal profile saved successfully',
      200,
      data,
    );
  }

  @Post('/onboarding/associated-contacts')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new JoiValidationPipe(onboardingContactsSchema))
  async saveOnboardingAssociatedContacts(
    @CurrentUser() user: ICurrentUser,
    @Body() onboardingContactsDto: OnboardingContactsDto,
  ) {
    const data = await this.employeeService.saveOnboardingAssociatedContacts(
      user.email,
      onboardingContactsDto,
    );

    return AppResponse.success(
      'Associated contacts saved successfully',
      200,
      data,
    );
  }

  @Post('/onboarding/finance-information')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new JoiValidationPipe(onboardingFinanceInformationSchema))
  async saveOnboardingFinanceInformation(
    @CurrentUser() user: ICurrentUser,
    @Body() onboardingFinanceInformationDto: OnboardingFinanceInformationDto,
  ) {
    const data = await this.employeeService.saveOnboardingFinanceInformation(
      user.email,
      onboardingFinanceInformationDto,
    );

    return AppResponse.success(
      'Finance information saved successfully',
      200,
      data,
    );
  }
}
