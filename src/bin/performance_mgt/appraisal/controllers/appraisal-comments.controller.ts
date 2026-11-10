import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../../common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../../common/guards/role.guard';
import { SystemRole } from '../../../generic/auth/enum/role.enum';
import { AppraisalCommentsService } from '../services/appraisal-comments.service';
import { CreateAppraisalCommentDto } from '../dto/appraisal-comment.dto';
import { ListAppraisalCommentsQueryDto } from '../dto/list-appraisal-comments.dto';

const COMMENT_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
  SystemRole.EMPLOYEE,
] as const;

@Controller('performance-management/appraisals')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AppraisalCommentsController {
  constructor(
    private readonly appraisalCommentsService: AppraisalCommentsService,
  ) {}

  @Get('comments/all')
  @Roles(...COMMENT_ROLES)
  async listComments(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListAppraisalCommentsQueryDto,
  ) {
    return this.appraisalCommentsService.listComments(
      user.organizationId!,
      query,
    );
  }

  @Post('comments/add')
  @Roles(...COMMENT_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateAppraisalCommentDto,
  ) {
    return this.appraisalCommentsService.addComment(
      user.organizationId!,
      user,
      dto,
    );
  }

  @Delete('comments/remove')
  @Roles(...COMMENT_ROLES)
  @HttpCode(HttpStatus.OK)
  async removeComment(
    @CurrentUser() user: ICurrentUser,
    @Query('commentId') commentId: string,
  ) {
    return this.appraisalCommentsService.removeComment(
      user.organizationId!,
      commentId,
    );
  }
}
