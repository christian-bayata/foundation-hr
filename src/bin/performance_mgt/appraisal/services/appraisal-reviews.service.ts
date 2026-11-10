import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { EmployeeRepository } from '../../../core_hr/employee/repository/employee.repository';
import { AppraisalRepository } from '../repositories/appraisal.repository';
import { AppraisalGoalScoreRepository } from '../repositories/appraisal-goal-score.repository';
import { AppraisalReviewRepository } from '../repositories/appraisal-review.repository';
import { AppraisalBehaviouralRepository } from '../repositories/appraisal-behavioural.repository';
import { AppraisalsService } from './appraisals.service';
import {
  BehaviouralRatingItemDto,
  GoalActualItemDto,
} from '../dto/appraisal-review-item.dto';
import { SubmitSelfAssessmentDto } from '../dto/submit-self-assessment.dto';
import { SubmitManagerReviewDto } from '../dto/submit-manager-review.dto';
import { SubmitFinalReviewDto } from '../dto/submit-final-review.dto';
import { SubmitBehaviouralDto } from '../dto/submit-behavioural.dto';
import { UpdateGoalActualsDto } from '../dto/update-goal-actuals.dto';
import {
  AppraisalStage,
  AppraisalStageStatus,
  AppraisalStatus,
} from '../enums/appraisal.enums';
import { AppraisalDocument } from '../schemas/appraisal.schema';
import { scoreGoal } from '../util/appraisal-scoring.util';

@Injectable()
export class AppraisalReviewsService {
  private readonly logger = new Logger(AppraisalReviewsService.name);

  constructor(
    private readonly appraisalRepository: AppraisalRepository,
    private readonly goalScoreRepository: AppraisalGoalScoreRepository,
    private readonly reviewRepository: AppraisalReviewRepository,
    private readonly behaviouralRepository: AppraisalBehaviouralRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly appraisalsService: AppraisalsService,
  ) {}

  async submitSelfAssessment(
    organizationId: string,
    user: ICurrentUser,
    appraisalId: string,
    dto: SubmitSelfAssessmentDto,
  ) {
    const appraisal = await this.requireAppraisal(organizationId, appraisalId);
    this.assertNotSkipped(appraisal);
    this.assertSelfStageAccess(appraisal, user, AppraisalStage.SELF);

    if (dto.goals && dto.goals.length > 0) {
      await this.applyGoalActuals(
        organizationId,
        user,
        appraisal,
        AppraisalStage.SELF,
        dto.goals,
      );
    }

    if (dto.behavioural && dto.behavioural.length > 0) {
      await this.applyBehavioural(
        organizationId,
        user,
        appraisal,
        AppraisalStage.SELF,
        dto.behavioural,
      );
    }

    const status = dto.submit
      ? AppraisalStageStatus.SUBMITTED
      : AppraisalStageStatus.IN_PROGRESS;

    await this.reviewRepository.upsert({
      organizationId,
      cycleId: appraisal.cycleId,
      appraisalId,
      stage: AppraisalStage.SELF,
      status,
      reviewerId: appraisal.employeeId,
      reviewerName: appraisal.employeeName,
      reviewerEmail: appraisal.employeeEmail,
      comment: dto.comment ?? null,
      submittedAt: dto.submit ? new Date() : null,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    await this.appraisalRepository.updateById(appraisalId, {
      selfAssessmentStatus: status,
      selfAssessmentComment: dto.comment ?? null,
      selfAssessmentSubmittedAt: dto.submit ? new Date() : null,
      updatedBy: user.userId,
    });

    const refreshed = await this.appraisalsService.recomputeAppraisal(
      organizationId,
      appraisalId,
      user.userId,
    );

    return AppResponse.success('Self-assessment saved', 200, refreshed);
  }

  async submitManagerReview(
    organizationId: string,
    user: ICurrentUser,
    appraisalId: string,
    dto: SubmitManagerReviewDto,
  ) {
    const appraisal = await this.requireAppraisal(organizationId, appraisalId);
    this.assertNotSkipped(appraisal);

    if (dto.goals && dto.goals.length > 0) {
      await this.applyGoalActuals(
        organizationId,
        user,
        appraisal,
        AppraisalStage.MANAGER,
        dto.goals,
      );
    }

    if (dto.behavioural && dto.behavioural.length > 0) {
      await this.applyBehavioural(
        organizationId,
        user,
        appraisal,
        AppraisalStage.MANAGER,
        dto.behavioural,
      );
    }

    const reviewer = await this.resolveReviewer(organizationId, user);
    const status = dto.submit
      ? AppraisalStageStatus.SUBMITTED
      : AppraisalStageStatus.IN_PROGRESS;

    await this.reviewRepository.upsert({
      organizationId,
      cycleId: appraisal.cycleId,
      appraisalId,
      stage: AppraisalStage.MANAGER,
      status,
      reviewerId: user.userId,
      reviewerName: reviewer.name,
      reviewerEmail: reviewer.email,
      rating: dto.managerRating ?? 0,
      comment: dto.comment ?? null,
      submittedAt: dto.submit ? new Date() : null,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    await this.appraisalRepository.updateById(appraisalId, {
      managerReviewStatus: status,
      managerReviewComment: dto.comment ?? null,
      managerReviewSubmittedAt: dto.submit ? new Date() : null,
      ...(dto.managerRating !== undefined && {
        managerRating: dto.managerRating,
      }),
      updatedBy: user.userId,
    });

    const refreshed = await this.appraisalsService.recomputeAppraisal(
      organizationId,
      appraisalId,
      user.userId,
    );

    return AppResponse.success('Manager review saved', 200, refreshed);
  }

  async submitFinalReview(
    organizationId: string,
    user: ICurrentUser,
    appraisalId: string,
    dto: SubmitFinalReviewDto,
  ) {
    const appraisal = await this.requireAppraisal(organizationId, appraisalId);
    this.assertNotSkipped(appraisal);

    const reviewer = await this.resolveReviewer(organizationId, user);
    const status = dto.submit
      ? AppraisalStageStatus.SUBMITTED
      : AppraisalStageStatus.IN_PROGRESS;

    await this.reviewRepository.upsert({
      organizationId,
      cycleId: appraisal.cycleId,
      appraisalId,
      stage: AppraisalStage.FINAL,
      status,
      reviewerId: user.userId,
      reviewerName: reviewer.name,
      reviewerEmail: reviewer.email,
      rating: dto.finalRating ?? 0,
      comment: dto.comment ?? null,
      submittedAt: dto.submit ? new Date() : null,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    await this.appraisalRepository.updateById(appraisalId, {
      finalReviewStatus: status,
      finalReviewComment: dto.comment ?? null,
      finalReviewSubmittedAt: dto.submit ? new Date() : null,
      ...(dto.finalRating !== undefined && {
        calibratedRating: dto.finalRating,
      }),
      updatedBy: user.userId,
    });

    const refreshed = await this.appraisalsService.recomputeAppraisal(
      organizationId,
      appraisalId,
      user.userId,
    );

    if (dto.ratingTag) {
      const updated = await this.appraisalRepository.updateById(appraisalId, {
        ratingTag: dto.ratingTag,
        updatedBy: user.userId,
      });
      return AppResponse.success('Final review saved', 200, updated);
    }

    return AppResponse.success('Final review saved', 200, refreshed);
  }

  async submitBehavioural(
    organizationId: string,
    user: ICurrentUser,
    appraisalId: string,
    dto: SubmitBehaviouralDto,
  ) {
    const appraisal = await this.requireAppraisal(organizationId, appraisalId);
    this.assertNotSkipped(appraisal);
    this.assertSelfStageAccess(appraisal, user, dto.stage);

    await this.applyBehavioural(
      organizationId,
      user,
      appraisal,
      dto.stage,
      dto.ratings,
    );

    if (dto.submit) {
      await this.reviewRepository.upsert({
        organizationId,
        cycleId: appraisal.cycleId,
        appraisalId,
        stage: dto.stage,
        status: AppraisalStageStatus.SUBMITTED,
        submittedAt: new Date(),
        createdBy: user.userId,
        updatedBy: user.userId,
      });
    }

    const items = await this.behaviouralRepository.findByAppraisal(
      organizationId,
      appraisalId,
    );

    return AppResponse.success('Behavioural assessment saved', 200, {
      appraisalId,
      stage: dto.stage,
      items,
    });
  }

  async updateGoalActuals(
    organizationId: string,
    user: ICurrentUser,
    appraisalId: string,
    dto: UpdateGoalActualsDto,
  ) {
    const appraisal = await this.requireAppraisal(organizationId, appraisalId);
    this.assertNotSkipped(appraisal);
    this.assertSelfStageAccess(appraisal, user, dto.stage);

    await this.applyGoalActuals(
      organizationId,
      user,
      appraisal,
      dto.stage,
      dto.goals,
    );

    if (dto.submit) {
      await this.reviewRepository.upsert({
        organizationId,
        cycleId: appraisal.cycleId,
        appraisalId,
        stage: dto.stage,
        status: AppraisalStageStatus.SUBMITTED,
        submittedAt: new Date(),
        createdBy: user.userId,
        updatedBy: user.userId,
      });
    }

    const refreshed = await this.appraisalsService.recomputeAppraisal(
      organizationId,
      appraisalId,
      user.userId,
    );

    return AppResponse.success('Goal actuals saved', 200, refreshed);
  }

  private async applyGoalActuals(
    organizationId: string,
    user: ICurrentUser,
    appraisal: AppraisalDocument,
    stage: AppraisalStage,
    items: GoalActualItemDto[],
  ) {
    const appraisalId = appraisal._id.toString();

    for (const item of items) {
      const goal = await this.goalScoreRepository.findOne({
        organizationId,
        appraisalId,
        goalId: item.goalId,
      });
      if (!goal) {
        throw new NotFoundException(
          `Goal ${item.goalId} is not part of this appraisal`,
        );
      }

      const targetValue =
        goal.targetValue && goal.targetValue > 0
          ? goal.targetValue
          : 0;
      const actual = item.actual ?? null;
      const computedScore =
        actual === null
          ? 0
          : scoreGoal(actual, targetValue, goal.kpiType as never);

      const update: Record<string, unknown> = {
        updatedBy: user.userId,
        ...(item.label !== undefined && { label: item.label }),
      };

      if (stage === AppraisalStage.SELF) {
        update.employeeActual = actual;
        update.employeeScore = computedScore;
        update.employeeComment = item.comment ?? null;
      } else if (stage === AppraisalStage.MANAGER) {
        update.reviewerActual = actual;
        update.reviewerScore = computedScore;
        update.reviewerComment = item.comment ?? null;
      } else {
        update.managerActual = actual;
        update.finalScore = computedScore;
      }

      await this.goalScoreRepository.updateById(
        goal._id.toString(),
        update,
      );
    }
  }

  private async applyBehavioural(
    organizationId: string,
    user: ICurrentUser,
    appraisal: AppraisalDocument,
    stage: AppraisalStage,
    ratings: BehaviouralRatingItemDto[],
  ) {
    const appraisalId = appraisal._id.toString();

    for (const item of ratings) {
      const rating = item.rating ?? 0;
      const update: Record<string, unknown> = {
        organizationId,
        cycleId: appraisal.cycleId,
        appraisalId,
        competencyId: item.competencyId,
        competencyName: item.competencyName ?? null,
        frameworkName: item.frameworkName ?? null,
        weight: item.weight ?? 0,
        updatedBy: user.userId,
        createdBy: user.userId,
      };

      if (stage === AppraisalStage.SELF) {
        update.selfRating = rating;
        update.selfComment = item.comment ?? null;
      } else if (stage === AppraisalStage.MANAGER) {
        update.managerRating = rating;
        update.managerComment = item.comment ?? null;
      } else {
        update.finalRating = rating;
        update.finalComment = item.comment ?? null;
      }

      await this.behaviouralRepository.upsert(update);
    }
  }

  private async resolveReviewer(
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

  private assertNotSkipped(appraisal: AppraisalDocument) {
    if (appraisal.status === AppraisalStatus.SKIPPED) {
      throw new BadRequestException(
        'A skipped appraisal cannot be updated.',
      );
    }
  }

  private assertSelfStageAccess(
    appraisal: AppraisalDocument,
    user: ICurrentUser,
    stage: AppraisalStage,
  ) {
    if (stage !== AppraisalStage.SELF) {
      return;
    }

    if (!user.employeeId || user.employeeId !== appraisal.employeeId) {
      throw new ForbiddenException(
        'You can only complete your own self-assessment.',
      );
    }
  }

  private async requireAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<AppraisalDocument> {
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
