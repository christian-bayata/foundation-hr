import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { EmployeeRepository } from '../../../core_hr/employee/repository/employee.repository';
import { FeedbackCycleRepository } from '../repositories/feedback-cycle.repository';
import { FeedbackRepository } from '../repositories/feedback.repository';
import { FeedbackCommentRepository } from '../repositories/feedback-comment.repository';
import { List360FeedbackQueryDto } from '../dto/list-360-feedback-query.dto';
import { NominateRespondentDto } from '../dto/nominate-respondent.dto';
import { SendReminderDto } from '../dto/send-reminder.dto';
import {
  FeedbackStatus,
  FeedbackStage,
  RespondentType,
} from '../enums/360-feedback.enums';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly cycleRepository: FeedbackCycleRepository,
    private readonly feedbackRepository: FeedbackRepository,
    private readonly commentRepository: FeedbackCommentRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async listFeedback(
    organizationId: string,
    query: List360FeedbackQueryDto,
  ) {
    await this.requireCycle(organizationId, query.cycleId ?? '');

    const result = await this.feedbackRepository.paginatedList(
      {
        cycleId: query.cycleId,
        subjectEmployeeId: query.subjectEmployeeId,
        respondentId: query.respondentId,
        search: query.search,
        status: query.status,
        batch: query.batch,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      organizationId,
    );

    return AppResponse.success('360 feedback retrieved', 200, {
      items: result.items,
      count: result.total,
    });
  }

  async getFeedback(
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

    const comments = await this.commentRepository.findByFeedback(
      organizationId,
      feedbackId,
    );

    return AppResponse.success('360 feedback detail retrieved', 200, {
      feedback,
      comments,
    });
  }

  async nominateRespondent(
    organizationId: string,
    user: ICurrentUser,
    dto: NominateRespondentDto,
  ) {
    const cycle = await this.cycleRepository.findActiveByOrganization(
      organizationId,
    );
    if (!cycle) {
      throw new BadRequestException('No active 360 feedback cycle found.');
    }

    const subject = await this.resolveEmployee(
      organizationId,
      dto.subjectEmployeeId,
    );
    if (!subject) {
      throw new NotFoundException('Subject employee not found');
    }

    const respondentType = (dto.respondentType as RespondentType) ?? RespondentType.PEERS;
    if (!Object.values(RespondentType).includes(respondentType)) {
      throw new BadRequestException('Respondent type is not valid.');
    }

    const existing = await this.feedbackRepository.findOne({
      organizationId,
      cycleId: cycle._id.toString(),
      subjectEmployeeId: subject._id.toString(),
      respondentType,
      respondentId: user.userId,
    });

    if (existing) {
      throw new ConflictException(
        'A nomination from this respondent for this subject already exists.',
      );
    }

    const feedback = await this.feedbackRepository.create({
      organizationId,
      cycleId: cycle._id.toString(),
      employeeId: user.userId,
      subjectEmployeeId: subject._id.toString(),
      stage: FeedbackStage.SELF,
      respondentType,
      respondentId: user.userId,
      status: FeedbackStatus.NOT_STARTED,
      averageScore: 0,
      competencyRatings: [],
      commentIds: [],
      dueAt: cycle.nominationDueDate,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    return AppResponse.success('Respondent nominated', 201, feedback);
  }

  async sendReminder(
    organizationId: string,
    user: ICurrentUser,
    dto: SendReminderDto,
  ) {
    const cycle = await this.cycleRepository.findActiveByOrganization(
      organizationId,
    );
    if (!cycle) {
      throw new BadRequestException('No active 360 feedback cycle found.');
    }

    const subject = await this.resolveEmployee(
      organizationId,
      dto.subjectEmployeeId,
    );
    if (!subject) {
      throw new NotFoundException('Subject employee not found');
    }

    const pending = await this.feedbackRepository.findOne({
      organizationId,
      cycleId: cycle._id.toString(),
      subjectEmployeeId: subject._id.toString(),
      status: {
        $nin: [FeedbackStatus.COMPLETED],
      },
    });

    if (!pending) {
      throw new BadRequestException('No pending feedback found for this subject.');
    }

    return AppResponse.success('Reminder sent', 200, {
      subjectEmployeeId: subject._id.toString(),
      feedbackId: pending._id.toString(),
      reminderNote: dto.reminderNote ?? null,
      sentBy: user.userId,
      sentAt: new Date(),
    });
  }

  async exportReport(organizationId: string, cycleId: string) {
    await this.requireCycle(organizationId, cycleId);
    const feedbackItems = await this.feedbackRepository.findByCycle(
      organizationId,
      cycleId,
    );

    const rows = feedbackItems.map((item) => ({
      subjectEmployeeId: item.subjectEmployeeId,
      respondentId: item.respondentId,
      respondentType: item.respondentType,
      stage: item.stage,
      status: item.status,
      averageScore: item.averageScore,
      submittedAt: item.submittedAt,
    }));

    const content = [
      'Subject Employee ID,Respondent ID,Respondent Type,Stage,Status,Average Score,Submitted At',
      ...rows.map(
        (row) =>
          `${row.subjectEmployeeId},${row.respondentId},${row.respondentType},${row.stage},${row.status},${row.averageScore},${row.submittedAt}`,
      ),
    ].join('\n');

    return {
      fileName: `360-feedback-report-${cycleId}.csv`,
      content,
    };
  }

  private async requireCycle(
    organizationId: string,
    cycleId: string,
  ) {
    const cycle = await this.cycleRepository.findById(cycleId, organizationId);
    if (!cycle) {
      throw new NotFoundException('360 feedback cycle not found');
    }
    return cycle;
  }

  private async resolveEmployee(
    organizationId: string,
    employeeId: string,
  ) {
    return this.employeeRepository.findById(employeeId);
  }
}
