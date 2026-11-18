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
import type { CurrentUser as ICurrentUser } from '../../../common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { SystemRole } from '../../generic/auth/enum/role.enum';
import {
  AddRequestDocumentDto,
  ApprovalChainPreviewDto,
  IssueRequestDocumentDto,
  RegisterRequestAttachmentDto,
  RequestActionDto,
  RequestAutofillQueryDto,
  RequestIdQueryDto,
  RequestLogQueryDto,
  RequestQueueQueryDto,
  RetrieveDraftDto,
  RetrieveRequestDocumentDto,
  SaveRequestDraftDto,
  SubmitRequestDto,
} from './dto/request-flow.dto';
import { RequestFlowService } from './request-flow.service';

const FLOW_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
  SystemRole.EMPLOYEE,
  SystemRole.IT_ADMIN,
  SystemRole.FINANCE,
];

const MANAGEMENT_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
];

@Controller('requests')
@UseGuards(JwtAuthGuard, RoleGuard)
export class RequestFlowController {
  constructor(private readonly requestFlowService: RequestFlowService) {}

  @Post('draft/save')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async saveDraft(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: SaveRequestDraftDto,
  ) {
    const data = await this.requestFlowService.saveDraft(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Draft saved successfully', 201, data);
  }

  @Get('draft/retrieve/all')
  @Roles(...FLOW_ROLES)
  async listDrafts(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RequestQueueQueryDto,
  ) {
    const data = await this.requestFlowService.listDrafts(
      user.organizationId!,
      user,
      query,
    );
    return AppResponse.success('Drafts retrieved successfully', 200, data);
  }

  @Get('draft/retrieve/single')
  @Roles(...FLOW_ROLES)
  async getDraft(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RetrieveDraftDto,
  ) {
    const data = await this.requestFlowService.getDraft(
      user.organizationId!,
      user,
      query.draftId,
    );
    return AppResponse.success('Draft retrieved successfully', 200, data);
  }

  @Delete('draft/delete')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.OK)
  async deleteDraft(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RetrieveDraftDto,
  ) {
    const data = await this.requestFlowService.deleteDraft(
      user.organizationId!,
      user,
      query.draftId,
    );
    return AppResponse.success('Draft deleted successfully', 200, data);
  }

  @Get('type/catalog/retrieve/all')
  @Roles(...FLOW_ROLES)
  async getTypeCatalog(@CurrentUser() user: ICurrentUser) {
    const data = await this.requestFlowService.getTypeCatalog(
      user.organizationId!,
    );
    return AppResponse.success(
      'Request type catalog retrieved successfully',
      200,
      data,
    );
  }

  @Get('form/autofill/retrieve')
  @Roles(...FLOW_ROLES)
  async getFormAutofill(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RequestAutofillQueryDto,
  ) {
    const data = await this.requestFlowService.getFormAutofill(
      user.organizationId!,
      user,
      query.requestType,
      query.employeeId,
    );
    return AppResponse.success('Form autofill retrieved successfully', 200, data);
  }

  @Post('approval-chain/preview')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.OK)
  async previewApprovalChain(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: ApprovalChainPreviewDto,
  ) {
    const data = await this.requestFlowService.previewApprovalChain(
      user.organizationId!,
      dto,
    );
    return AppResponse.success(
      'Approval chain preview retrieved successfully',
      200,
      data,
    );
  }

  @Post('submit')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async submitRequest(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: SubmitRequestDto,
  ) {
    const data = await this.requestFlowService.submitRequest(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Request submitted successfully', 201, data);
  }

  @Get('queue/retrieve/all')
  @Roles(...FLOW_ROLES)
  async listQueue(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RequestQueueQueryDto,
  ) {
    const data = await this.requestFlowService.listQueue(
      user.organizationId!,
      user,
      query,
    );
    return AppResponse.success('Request queue retrieved successfully', 200, data);
  }

  @Get('flow/retrieve/single')
  @Roles(...FLOW_ROLES)
  async getRequestFlow(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RequestIdQueryDto,
  ) {
    const data = await this.requestFlowService.getRequestFlow(
      user.organizationId!,
      user,
      query.requestId,
    );
    return AppResponse.success('Request retrieved successfully', 200, data);
  }

  @Get('activity/retrieve/all')
  @Roles(...FLOW_ROLES)
  async listActivity(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RequestLogQueryDto,
  ) {
    const data = await this.requestFlowService.listActivity(
      user.organizationId!,
      user,
      query.requestId!,
      query,
    );
    return AppResponse.success(
      'Request activity retrieved successfully',
      200,
      data,
    );
  }

  @Get('actions/retrieve/all')
  @Roles(...FLOW_ROLES)
  async listAvailableActions(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RequestIdQueryDto,
  ) {
    const data = await this.requestFlowService.listAvailableActions(
      user.organizationId!,
      user,
      query.requestId,
    );
    return AppResponse.success(
      'Request actions retrieved successfully',
      200,
      data,
    );
  }

  @Post('view/log')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async logView(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    const data = await this.requestFlowService.logView(
      user.organizationId!,
      user,
      dto.requestId,
      dto.note,
    );
    return AppResponse.success('Request view logged successfully', 201, data);
  }

  @Patch('approve')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'approve', dto, 'Request approved successfully');
  }

  @Patch('decline')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async decline(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'decline', dto, 'Request declined successfully');
  }

  @Patch('verify')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async verify(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'verify', dto, 'Request verified successfully');
  }

  @Patch('employee/accept')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.OK)
  async accept(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'accept', dto, 'Request accepted successfully');
  }

  @Patch('respond')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.OK)
  async respond(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'respond', dto, 'Response recorded successfully');
  }

  @Patch('query')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async query(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'query', dto, 'Query raised successfully');
  }

  @Patch('resend')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async resend(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'resend', dto, 'Request resent successfully');
  }

  @Patch('withdraw')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'withdraw', dto, 'Request withdrawn successfully');
  }

  @Patch('nudge')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.OK)
  async nudge(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'nudge', dto, 'Nudge sent successfully');
  }

  @Patch('nudge-employee')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.OK)
  async nudgeEmployee(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(
      user,
      'nudge-employee',
      dto,
      'Employee nudged successfully',
    );
  }

  @Patch('review/record')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async recordReview(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(
      user,
      'review-record',
      dto,
      'Review recorded successfully',
    );
  }

  @Patch('plan/close')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async closePlan(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'close-plan', dto, 'Plan closed successfully');
  }

  @Patch('delegate')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async delegate(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'delegate', dto, 'Request delegated successfully');
  }

  @Patch('escalate')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async escalate(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RequestActionDto,
  ) {
    return this.runAction(user, 'escalate', dto, 'Request escalated successfully');
  }

  @Post('attachment/register')
  @Roles(...FLOW_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async registerAttachment(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RegisterRequestAttachmentDto,
  ) {
    const data = await this.requestFlowService.registerAttachment(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success(
      'Attachment registered successfully',
      201,
      data,
    );
  }

  @Get('document/retrieve/all')
  @Roles(...FLOW_ROLES)
  async listDocuments(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RequestIdQueryDto,
  ) {
    const data = await this.requestFlowService.listDocuments(
      user.organizationId!,
      query.requestId,
    );
    return AppResponse.success(
      'Request documents retrieved successfully',
      200,
      data,
    );
  }

  @Get('document/retrieve/single')
  @Roles(...FLOW_ROLES)
  async getDocument(
    @CurrentUser() user: ICurrentUser,
    @Query() query: RetrieveRequestDocumentDto,
  ) {
    const data = await this.requestFlowService.getDocument(
      user.organizationId!,
      query,
    );
    return AppResponse.success(
      'Request document retrieved successfully',
      200,
      data,
    );
  }

  @Post('document/add')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async addDocument(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddRequestDocumentDto,
  ) {
    const data = await this.requestFlowService.addDocument(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Document added successfully', 201, data);
  }

  @Post('document/issue')
  @Roles(...MANAGEMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async issueDocument(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: IssueRequestDocumentDto,
  ) {
    const data = await this.requestFlowService.issueDocument(
      user.organizationId!,
      user,
      dto,
    );
    return AppResponse.success('Document issued successfully', 200, data);
  }

  private async runAction(
    user: ICurrentUser,
    action:
      | 'approve'
      | 'decline'
      | 'verify'
      | 'accept'
      | 'respond'
      | 'query'
      | 'resend'
      | 'withdraw'
      | 'nudge'
      | 'nudge-employee'
      | 'review-record'
      | 'close-plan'
      | 'delegate'
      | 'escalate',
    dto: RequestActionDto,
    message: string,
  ) {
    const data = await this.requestFlowService.performAction(
      user.organizationId!,
      user,
      action,
      dto,
    );
    return AppResponse.success(message, 200, data);
  }
}
