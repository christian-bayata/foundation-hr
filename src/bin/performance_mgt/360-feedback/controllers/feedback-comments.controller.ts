import {
  Body,
  Controller,
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
import { FeedbackCommentsService } from '../services/feedback-comments.service';
import { ListFeedbackCommentsQueryDto } from '../dto/list-feedback-comments-query.dto';
import { AddFeedbackCommentDto } from '../dto/add-feedback-comment.dto';

const COMMENT_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
  SystemRole.EMPLOYEE,
] as const;

@Controller('performance-management/360-feedback/comments')
@UseGuards(JwtAuthGuard, RoleGuard)
export class FeedbackCommentsController {
  constructor(
    private readonly feedbackCommentsService: FeedbackCommentsService,
  ) {}

  @Get('all')
  @Roles(...COMMENT_ROLES)
  async listComments(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListFeedbackCommentsQueryDto,
  ) {
    return this.feedbackCommentsService.listComments(
      user.organizationId!,
      query,
    );
  }

  @Post('add')
  @Roles(...COMMENT_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddFeedbackCommentDto,
  ) {
    return this.feedbackCommentsService.addComment(
      user.organizationId!,
      user,
      dto,
    );
  }
}
