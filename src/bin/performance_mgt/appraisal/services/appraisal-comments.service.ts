import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { EmployeeRepository } from '../../../core_hr/employee/repository/employee.repository';
import { AppraisalRepository } from '../repositories/appraisal.repository';
import { AppraisalCommentRepository } from '../repositories/appraisal-comment.repository';
import { CreateAppraisalCommentDto } from '../dto/appraisal-comment.dto';
import { ListAppraisalCommentsQueryDto } from '../dto/list-appraisal-comments.dto';

@Injectable()
export class AppraisalCommentsService {
  constructor(
    private readonly commentRepository: AppraisalCommentRepository,
    private readonly appraisalRepository: AppraisalRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async listComments(
    organizationId: string,
    query: ListAppraisalCommentsQueryDto,
  ) {
    await this.requireAppraisal(organizationId, query.appraisalId);
    const items = await this.commentRepository.list(organizationId, query);

    return AppResponse.success('Appraisal comments retrieved', 200, {
      items,
      count: items.length,
    });
  }

  async addComment(
    organizationId: string,
    user: ICurrentUser,
    dto: CreateAppraisalCommentDto,
  ) {
    const appraisal = await this.requireAppraisal(
      organizationId,
      dto.appraisalId,
    );
    const author = await this.resolveAuthor(organizationId, user);

    const comment = await this.commentRepository.create({
      organizationId,
      cycleId: appraisal.cycleId,
      appraisalId: dto.appraisalId,
      goalId: dto.goalId ?? null,
      perspective: dto.perspective ?? null,
      stage: dto.stage ?? null,
      authorId: user.userId,
      authorName: author.name,
      authorEmail: author.email,
      body: dto.body,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    return AppResponse.success('Appraisal comment added', 201, comment);
  }

  async removeComment(
    organizationId: string,
    commentId: string,
  ) {
    const comment = await this.commentRepository.findById(
      commentId,
      organizationId,
    );
    if (!comment) {
      throw new NotFoundException('Appraisal comment not found');
    }

    await this.commentRepository.deleteById(commentId);

    return AppResponse.success('Appraisal comment removed', 200, {
      commentId,
    });
  }

  private async resolveAuthor(
    organizationId: string,
    user: ICurrentUser,
  ): Promise<{ name: string | null; email: string | null }> {
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
          email: employee.email ?? user.email,
        };
      }
    }

    return { name: null, email: user.email ?? null };
  }

  private async requireAppraisal(organizationId: string, appraisalId: string) {
    const appraisal = await this.appraisalRepository.findById(
      appraisalId,
      organizationId,
    );
    if (!appraisal) {
      throw new NotFoundException('Appraisal not found');
    }
    return appraisal;
  }
}
