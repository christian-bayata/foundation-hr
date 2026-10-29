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
import { AppResponse, Roles } from '../../common';
import type { CurrentUser as ICurrentUser } from '../../common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresSystemSettings } from '../../common/decorators/requires-system-settings.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { SystemRole } from '../auth/enum/role.enum';
import type { AddEmployeeRequestDto } from './dto/request.dto';
import {
  CancelEmployeeRequestDto,
  ListEmployeeRequestQueryDto,
  RetrieveEmployeeRequestDto,
  RetrieveRequestFormDto,
  UpdateEmployeeRequestDto,
  UpdateEmployeeRequestStepDto,
} from './dto/request.dto';
import { RequestCreateValidationPipe } from './pipes/request-create-validation.pipe';
import { RequestService } from './request.service';

@Controller('requests')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Post('add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addRequest(
    @CurrentUser() user: ICurrentUser,
    @Body(new RequestCreateValidationPipe()) dto: AddEmployeeRequestDto,
  ) {
    const data = await this.requestService.addRequest(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Request created successfully', 201, data);
  }

  @Get('your/retrieve/all')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveYourRequests(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListEmployeeRequestQueryDto,
  ) {
    const data = await this.requestService.getYourRequests(
      user.organizationId!,
      user,
      query,
    );
    return AppResponse.success('Requests retrieved successfully', 200, data);
  }

  @Get('employee/retrieve/all')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveEmployeeRequests(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListEmployeeRequestQueryDto,
  ) {
    const data = await this.requestService.getEmployeeRequests(
      user.organizationId!,
      user,
      query,
    );
    return AppResponse.success(
      'Employee requests retrieved successfully',
      200,
      data,
    );
  }

  @Get('retrieve/single')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRequest(
    @CurrentUser() user: ICurrentUser,
    @Query() dto: RetrieveEmployeeRequestDto,
  ) {
    const data = await this.requestService.getRequest(
      user.organizationId!,
      dto.requestId,
    );
    return AppResponse.success('Request retrieved successfully', 200, data);
  }

  @Get('summary')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRequestSummary(@CurrentUser() user: ICurrentUser) {
    const data = await this.requestService.getSummary(
      user.organizationId!,
      user,
    );
    return AppResponse.success(
      'Request summary retrieved successfully',
      200,
      data,
    );
  }

  @Get('type/retrieve/all')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRequestTypes(@CurrentUser() user: ICurrentUser) {
    const data = await this.requestService.getRequestTypes(
      user.organizationId!,
    );
    return AppResponse.success(
      'Request types retrieved successfully',
      200,
      data,
    );
  }

  @Get('type/form/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveRequestForm(@Query() dto: RetrieveRequestFormDto) {
    const data = this.requestService.getRequestForm(dto.requestType);
    return AppResponse.success(
      'Request form retrieved successfully',
      200,
      data,
    );
  }

  @Patch('update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateRequest(
    @CurrentUser() user: ICurrentUser,
    @Query() params: RetrieveEmployeeRequestDto,
    @Body() dto: UpdateEmployeeRequestDto,
  ) {
    const data = await this.requestService.updateRequest(
      user.organizationId!,
      params.requestId,
      dto,
    );
    return AppResponse.success('Request updated successfully', 200, data);
  }

  @Patch('cancel')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async cancelRequest(
    @CurrentUser() user: ICurrentUser,
    @Query() params: RetrieveEmployeeRequestDto,
    @Body() dto: CancelEmployeeRequestDto,
  ) {
    const data = await this.requestService.cancelRequest(
      user.organizationId!,
      params.requestId,
      dto,
    );
    return AppResponse.success('Request cancelled successfully', 200, data);
  }

  @Patch('step/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateRequestStep(
    @CurrentUser() user: ICurrentUser,
    @Query() params: RetrieveEmployeeRequestDto,
    @Body() dto: UpdateEmployeeRequestStepDto,
  ) {
    const data = await this.requestService.updateRequestStep(
      user.organizationId!,
      user,
      params.requestId,
      dto,
    );
    return AppResponse.success('Request step updated successfully', 200, data);
  }

  @Delete('delete')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteRequest(
    @CurrentUser() user: ICurrentUser,
    @Query() params: RetrieveEmployeeRequestDto,
  ) {
    const data = await this.requestService.deleteRequest(
      user.organizationId!,
      params.requestId,
    );
    return AppResponse.success('Request deleted successfully', 200, data);
  }
}
