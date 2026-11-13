import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { AppraisalRepository } from '../repositories/appraisal.repository';
import { AppraisalReviewRepository } from '../repositories/appraisal-review.repository';
import { AppraisalCommentRepository } from '../repositories/appraisal-comment.repository';
import { CalibrationSessionRepository } from '../repositories/calibration-session.repository';
import { ParticipantAuditLogRepository } from '../repositories/participant-audit-log.repository';
import { EmployeeRepository } from '../../../core_hr/employee/repository/employee.repository';
import { ListCalibrationSessionsQueryDto } from '../dto/list-calibration-sessions-query.dto';
import { SendReminderDto } from '../dto/send-reminder.dto';
import { ParticipantAuditAction } from '../enums/appraisal.enums';

@Injectable()
export class AppraisalParticipantsService {
  constructor(
    private readonly appraisalRepository: AppraisalRepository,
    private readonly reviewRepository: AppraisalReviewRepository,
    private readonly commentRepository: AppraisalCommentRepository,
    private readonly calibrationSessionRepository: CalibrationSessionRepository,
    private readonly auditLogRepository: ParticipantAuditLogRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async getParticipantDetail(
    organizationId: string,
    participantId: string,
  ) {
    const appraisal = await this.appraisalRepository.findById(
      participantId,
      organizationId,
    );
    if (!appraisal) {
      throw new NotFoundException('Participant appraisal not found');
    }

    const reviews = await this.reviewRepository.findByAppraisal(
      organizationId,
      participantId,
    );
    const comments = await this.commentRepository.findByAppraisal(
      organizationId,
      participantId,
    );

    const stageReviews: Record<string, unknown> = {};
    for (const review of reviews) {
      stageReviews[review.stage] = {
        status: review.status,
        score: review.score,
        rating: review.rating,
        comment: review.comment,
        reviewerName: review.reviewerName,
        submittedAt: review.submittedAt,
        dueAt: review.dueAt,
      };
    }

    return AppResponse.success('Participant detail retrieved', 200, {
      appraisal: {
        id: appraisal._id.toString(),
        employeeId: appraisal.employeeId,
        employeeCode: appraisal.employeeCode,
        employeeName: appraisal.employeeName,
        employeeEmail: appraisal.employeeEmail,
        jobTitleCode: appraisal.jobTitleCode,
        jobTitleName: appraisal.jobTitleName,
        departmentCode: appraisal.departmentCode,
        departmentName: appraisal.departmentName,
        managerId: appraisal.managerId,
        managerName: appraisal.managerName,
        managerEmail: appraisal.managerEmail,
        status: appraisal.status,
        selfAssessmentStatus: appraisal.selfAssessmentStatus,
        managerReviewStatus: appraisal.managerReviewStatus,
        finalReviewStatus: appraisal.finalReviewStatus,
        performanceScore: appraisal.performanceScore,
        selfScore: appraisal.selfScore,
        managerScore: appraisal.managerScore,
        finalScore: appraisal.finalScore,
        calibratedRating: appraisal.calibratedRating,
        ratingTag: appraisal.ratingTag,
        totalWeightage: appraisal.totalWeightage,
        selfAssessmentComment: appraisal.selfAssessmentComment,
        managerReviewComment: appraisal.managerReviewComment,
        finalReviewComment: appraisal.finalReviewComment,
        selfAssessmentSubmittedAt: appraisal.selfAssessmentSubmittedAt,
        managerReviewSubmittedAt: appraisal.managerReviewSubmittedAt,
        finalReviewSubmittedAt: appraisal.finalReviewSubmittedAt,
        completedAt: appraisal.completedAt,
      },
      stages: stageReviews,
      comments: comments.map((comment) => ({
        id: comment._id.toString(),
        goalId: comment.goalId,
        perspective: comment.perspective,
        stage: comment.stage,
        authorId: comment.authorId,
        authorName: comment.authorName,
        authorEmail: comment.authorEmail,
        body: comment.body,
        createdAt: comment.createdAt,
      })),
    });
  }

  async getParticipantResponses(
    organizationId: string,
    participantId: string,
  ) {
    const appraisal = await this.appraisalRepository.findById(
      participantId,
      organizationId,
    );
    if (!appraisal) {
      throw new NotFoundException('Participant appraisal not found');
    }

    const reviews = await this.reviewRepository.findByAppraisal(
      organizationId,
      participantId,
    );

    return AppResponse.success('Participant responses retrieved', 200, {
      appraisalId: participantId,
      employeeId: appraisal.employeeId,
      employeeName: appraisal.employeeName,
      responses: reviews.map((review) => ({
        stage: review.stage,
        status: review.status,
        score: review.score,
        rating: review.rating,
        comment: review.comment,
        reviewerName: review.reviewerName,
        submittedAt: review.submittedAt,
        dueAt: review.dueAt,
      })),
    });
  }

  async getParticipantAuditLog(
    organizationId: string,
    participantId: string,
    query: ListCalibrationSessionsQueryDto,
  ) {
    const appraisal = await this.appraisalRepository.findById(
      participantId,
      organizationId,
    );
    if (!appraisal) {
      throw new NotFoundException('Participant appraisal not found');
    }

    const result = await this.auditLogRepository.paginatedList(
      {
        appraisalId: participantId,
        batch: query.batch,
        limit: query.limit,
      },
      organizationId,
    );

    return AppResponse.success('Participant audit log retrieved', 200, {
      appraisalId: participantId,
      employeeId: appraisal.employeeId,
      employeeName: appraisal.employeeName,
      items: result.items.map((log) => ({
        id: log._id.toString(),
        action: log.action,
        stage: log.stage,
        previousValue: log.previousValue,
        newValue: log.newValue,
        justification: log.justification,
        actorId: log.actorId,
        actorName: log.actorName,
        createdAt: log.createdAt,
      })),
      count: result.total,
    });
  }

  async exportParticipantSummary(
    organizationId: string,
    participantId: string,
  ) {
    const appraisal = await this.appraisalRepository.findById(
      participantId,
      organizationId,
    );
    if (!appraisal) {
      throw new NotFoundException('Participant appraisal not found');
    }

    const reviews = await this.reviewRepository.findByAppraisal(
      organizationId,
      participantId,
    );
    const auditLogs = await this.auditLogRepository.findByAppraisal(
      organizationId,
      participantId,
    );

    const rows = [
      'Field,Value',
      `Employee ID,${appraisal.employeeId}`,
      `Employee Name,${appraisal.employeeName}`,
      `Department,${appraisal.departmentName ?? ''}`,
      `Job Title,${appraisal.jobTitleName ?? ''}`,
      `Manager,${appraisal.managerName ?? ''}`,
      `Status,${appraisal.status}`,
      `Performance Score,${appraisal.performanceScore}`,
      `Self Score,${appraisal.selfScore}`,
      `Manager Score,${appraisal.managerScore}`,
      `Final Score,${appraisal.finalScore}`,
      `Calibrated Rating,${appraisal.calibratedRating}`,
      `Rating Tag,${appraisal.ratingTag ?? ''}`,
      `Total Weightage,${appraisal.totalWeightage}`,
      '',
      'Stage Reviews,',
      ...reviews.map(
        (review) =>
          `${review.stage},Status: ${review.status},Score: ${review.score},Rating: ${review.rating},Comment: "${review.comment ?? ''}"`,
      ),
      '',
      'Audit Log,',
      ...auditLogs.map(
        (log) =>
          `${log.createdAt},${log.action},${log.stage ?? ''},${log.previousValue ?? ''} → ${log.newValue ?? ''},${log.justification ?? ''}`,
      ),
    ].join('\n');

    return {
      fileName: `participant-summary-${participantId}.csv`,
      content: rows,
    };
  }

  async sendReminderToParticipant(
    organizationId: string,
    user: ICurrentUser,
    participantId: string,
    dto: SendReminderDto,
  ) {
    const appraisal = await this.appraisalRepository.findById(
      participantId,
      organizationId,
    );
    if (!appraisal) {
      throw new NotFoundException('Participant appraisal not found');
    }

    const now = new Date();
    await this.appraisalRepository.updateById(participantId, {
      updatedBy: user.userId,
    });

    await this.auditLogRepository.create({
      organizationId,
      cycleId: appraisal.cycleId,
      appraisalId: participantId,
      employeeId: appraisal.employeeId,
      action: ParticipantAuditAction.REMINDER_SENT,
      stage: null,
      previousValue: null,
      newValue: null,
      justification: dto.reminderNote ?? null,
      actorId: user.userId,
      actorName: null,
      metadata: null,
      createdAt: now,
      createdBy: user.userId,
    });

    return AppResponse.success('Reminder sent to participant', 200, {
      participantId,
      employeeId: appraisal.employeeId,
      reminderNote: dto.reminderNote ?? null,
      sentBy: user.userId,
      sentAt: now,
    });
  }

  async viewParticipantInCalibration(
    organizationId: string,
    participantId: string,
  ) {
    const appraisal = await this.appraisalRepository.findById(
      participantId,
      organizationId,
    );
    if (!appraisal) {
      throw new NotFoundException('Participant appraisal not found');
    }

    const sessions = await this.calibrationSessionRepository.findByCycle(
      organizationId,
      appraisal.cycleId,
    );

    return AppResponse.success('Participant calibration view retrieved', 200, {
      participantId,
      employeeId: appraisal.employeeId,
      employeeName: appraisal.employeeName,
      cycleId: appraisal.cycleId,
      currentStage: appraisal.selfAssessmentStatus,
      currentScore: appraisal.performanceScore,
      calibratedRating: appraisal.calibratedRating,
      ratingTag: appraisal.ratingTag,
      sessions: sessions.map((session) => ({
        id: session._id.toString(),
        name: session.name,
        status: session.status,
        sessionOwnerName: session.sessionOwnerName,
        departmentCode: session.departmentCode,
        participantCount: session.participantCount,
        finalisedCount: session.finalisedCount,
      })),
    });
  }
}
