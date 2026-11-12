import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { EmployeeRepository } from '../../../core_hr/employee/repository/employee.repository';
import { FeedbackCycleRepository } from '../repositories/feedback-cycle.repository';
import { FeedbackRepository } from '../repositories/feedback.repository';
import { FeedbackCommentRepository } from '../repositories/feedback-comment.repository';
import { ListFeedbackCommentsQueryDto } from '../dto/list-feedback-comments-query.dto';
import { AddFeedbackCommentDto } from '../dto/add-feedback-comment.dto';

@Injectable()
export class FeedbackCommentsService {
  constructor(
    private readonly commentRepository: FeedbackCommentRepository,
    private readonly feedbackRepository: FeedbackRepository,
    private readonly cycleRepository: FeedbackCycleRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async listComments(
    organizationId: string,
    query: ListFeedbackCommentsQueryDto,
  ) {
    if (query.feedbackId) {
      await this.requireFeedback(organizationId, query.feedbackId);
    }

    const result = await this.commentRepository.paginatedList(
      {
        cycleId: query.cycleId,
        subjectEmployeeId: query.subjectEmployeeId,
        feedbackId: query.feedbackId,
        search: query.search,
        batch: query.batch,
        limit: query.limit,
      },
      organizationId,
    );

    return AppResponse.success('360 feedback comments retrieved', 200, {
      items: result.items,
      count: result.total,
    });
  }

  async addComment(
    organizationId: string,
    user: ICurrentUser,
    dto: AddFeedbackCommentDto,
  ) {
    const feedback = await this.requireFeedback(
      organizationId,
      dto.feedbackId,
    );

    const author = await this.resolveAuthor(organizationId, user);

    const comment = await this.commentRepository.create({
      organizationId,
      cycleId: feedback.cycleId,
      subjectEmployeeId: dto.subjectEmployeeId,
      feedbackId: dto.feedbackId,
      authorId: user.userId,
      authorName: author.name ?? '',
      body: dto.body,
      createdBy: user.userId,
    });

    return AppResponse.success('360 feedback comment added', 201, comment);
  }

  private async requireFeedback(
    organizationId: string,
    feedbackId: string,
  ) {
    const feedback = await this.feedbackRepository.findById(
      feedbackId,
      organizationId,
    );
    if (!feedback) {
      throw new NotFoundException('360 feedback not found');
    }
    return feedback;
  }

  private async resolveAuthor(
    organizationId: string,
    user: ICurrentUser,
  ): Promise<{ name: string | null }> {
    if (user.email) {
      const employee = await this.employeeRepository.findOne({
        organizationId,
        email: user.email.toLowerCase(),
      });
      if (employee) {
        return {
          name:
            `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
            employee.email ||
            null,
        };
      }
    }

    return { name: null };
  }
}
