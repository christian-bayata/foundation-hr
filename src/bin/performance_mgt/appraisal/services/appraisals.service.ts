import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { EmployeeRepository } from '../../../core_hr/employee/repository/employee.repository';
import { OrganizationDepartmentRepository } from '../../../core_hr/organization/repository/organization-department.repository';
import { JobTitleRepository } from '../../../core_hr/organization/repository/job-title.repository';
import { AppraisalCycleRepository } from '../repositories/appraisal-cycle.repository';
import { AppraisalRepository } from '../repositories/appraisal.repository';
import { AppraisalGoalScoreRepository } from '../repositories/appraisal-goal-score.repository';
import { AppraisalReviewRepository } from '../repositories/appraisal-review.repository';
import { AppraisalBehaviouralRepository } from '../repositories/appraisal-behavioural.repository';
import { AppraisalCommentRepository } from '../repositories/appraisal-comment.repository';
import { ListAppraisalsQueryDto } from '../dto/list-appraisals-query.dto';
import { RerouteAppraisalDto } from '../dto/reroute-appraisal.dto';
import { CalibrateAppraisalDto } from '../dto/calibrate-appraisal.dto';
import { RecomputeAppraisalDto } from '../dto/recompute-appraisal.dto';
import { ResetAppraisalDto } from '../dto/reset-appraisal.dto';
import { SkipAppraisalDto } from '../dto/skip-appraisal.dto';
import {
  AppraisalRatingTag,
  AppraisalStage,
  AppraisalStageStatus,
  AppraisalStatus,
} from '../enums/appraisal.enums';
import { AppraisalDocument } from '../schemas/appraisal.schema';
import { AppraisalCycleDocument } from '../schemas/appraisal-cycle.schema';
import {
  DEFAULT_RATING_SCALE,
  computeGoalScores,
  computePerspectiveRollups,
  parseTargetValue,
  resolveRatingTag,
  scoreGoal,
} from '../util/appraisal-scoring.util';

@Injectable()
export class AppraisalsService {
  private readonly logger = new Logger(AppraisalsService.name);

  constructor(
    private readonly cycleRepository: AppraisalCycleRepository,
    private readonly appraisalRepository: AppraisalRepository,
    private readonly goalScoreRepository: AppraisalGoalScoreRepository,
    private readonly reviewRepository: AppraisalReviewRepository,
    private readonly behaviouralRepository: AppraisalBehaviouralRepository,
    private readonly commentRepository: AppraisalCommentRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
    private readonly jobTitleRepository: JobTitleRepository,
  ) {}

  async listAppraisals(
    organizationId: string,
    query: ListAppraisalsQueryDto,
  ) {
    const cycle = await this.resolveCycle(organizationId, query.cycleId);
    const result = await this.appraisalRepository.paginatedList(
      query,
      organizationId,
      cycle._id.toString(),
    );
    const statusCounts = await this.appraisalRepository.statusCounts(
      organizationId,
      cycle._id.toString(),
    );

    return AppResponse.success('Appraisals retrieved', 200, {
      items: result.items.map((item) => this.toListItem(item)),
      count: result.total,
      batch: query.batch ?? 1,
      limit: query.limit ?? 10,
      cycle: {
        id: cycle._id.toString(),
        name: cycle.name,
        code: cycle.code,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
      },
      summary: this.buildSummary(statusCounts),
    });
  }

  async getSummary(
    organizationId: string,
    query: ListAppraisalsQueryDto,
  ) {
    const cycle = await this.resolveCycle(organizationId, query.cycleId);
    const statusCounts = await this.appraisalRepository.statusCounts(
      organizationId,
      cycle._id.toString(),
    );

    return AppResponse.success('Appraisal summary retrieved', 200, {
      cycleId: cycle._id.toString(),
      ...this.buildSummary(statusCounts),
    });
  }

  async getOptions(organizationId: string) {
    const [departments, jobTitles] = await Promise.all([
      this.organizationDepartmentRepository.findByOrganization(organizationId),
      this.jobTitleRepository.findByOrganization(organizationId),
    ]);

    return AppResponse.success('Appraisal filter options retrieved', 200, {
      departments: departments.map((department) => ({
        id: department._id.toString(),
        code: department.code,
        name: department.name,
      })),
      roles: jobTitles.map((jobTitle) => ({
        code: jobTitle.code,
        name: jobTitle.name,
      })),
      statuses: Object.values(AppraisalStatus).map((value) => ({
        value,
        label: this.humanize(value),
      })),
      ratingTags: Object.values(AppraisalRatingTag).map((value) => ({
        value,
        label: this.humanize(value),
      })),
      ratingScale: DEFAULT_RATING_SCALE,
    });
  }

  async getAppraisal(organizationId: string, appraisalId: string) {
    const appraisal = await this.requireAppraisal(
      organizationId,
      appraisalId,
    );
    const [cycle, goals, reviews, behavioural, comments] = await Promise.all([
      this.cycleRepository.findById(
        appraisal.cycleId,
        organizationId,
      ),
      this.goalScoreRepository.findByAppraisal(organizationId, appraisalId),
      this.reviewRepository.findByAppraisal(organizationId, appraisalId),
      this.behaviouralRepository.findByAppraisal(organizationId, appraisalId),
      this.commentRepository.list(organizationId, { appraisalId }),
    ]);

    const perspectives = new Set(
      goals.map((goal) => goal.perspective).filter(Boolean),
    );

    return AppResponse.success('Appraisal retrieved', 200, {
      appraisal,
      cycle,
      totals: {
        totalScore: appraisal.performanceScore,
        perspectives: perspectives.size,
        objectives: goals.length,
        onTrack:
          appraisal.status === AppraisalStatus.ONGOING ||
          appraisal.status === AppraisalStatus.COMPLETED,
      },
      goalScores: goals,
      reviews,
      behavioural,
      commentCount: comments.length,
    });
  }

  async getScorecard(organizationId: string, appraisalId: string) {
    const appraisal = await this.requireAppraisal(
      organizationId,
      appraisalId,
    );
    const [goals, comments] = await Promise.all([
      this.goalScoreRepository.findByAppraisal(organizationId, appraisalId),
      this.commentRepository.list(organizationId, { appraisalId }),
    ]);

    const rollups = computePerspectiveRollups(goals);
    const commentCounts = new Map<string, number>();
    for (const comment of comments) {
      if (!comment.goalId) continue;
      commentCounts.set(
        comment.goalId,
        (commentCounts.get(comment.goalId) ?? 0) + 1,
      );
    }

    const perspectives = rollups.map((rollup) => ({
      perspective: rollup.perspective,
      label: rollup.perspective
        ? this.humanize(rollup.perspective)
        : 'Unassigned',
      weightPlanned: rollup.plannedWeight,
      weightActual: rollup.actualWeight,
      score: rollup.score,
      goals: goals
        .filter(
          (goal) =>
            (goal.perspective ?? null) === (rollup.perspective ?? null),
        )
        .map((goal) => ({
          goalScoreId: goal._id.toString(),
          goalId: goal.goalId,
          title: goal.title,
          weightage: goal.weightage,
          target: goal.target,
          targetUnit: goal.targetUnit,
          label: goal.label,
          kpiType: goal.kpiType,
          employeeActual: goal.employeeActual,
          reviewerActual: goal.reviewerActual,
          managerActual: goal.managerActual,
          employeeScore: goal.employeeScore,
          reviewerScore: goal.reviewerScore,
          finalScore: goal.finalScore,
          commentCount: commentCounts.get(goal.goalId) ?? 0,
        })),
    }));

    return AppResponse.success('Balance scorecard retrieved', 200, {
      appraisalId,
      employee: {
        id: appraisal.employeeId,
        name: appraisal.employeeName,
        code: appraisal.employeeCode,
        role: appraisal.jobTitleName,
        department: appraisal.departmentName,
      },
      totals: {
        totalScore: appraisal.performanceScore,
        selfScore: appraisal.selfScore,
        managerScore: appraisal.managerScore,
        finalScore: appraisal.finalScore,
        totalWeightage: appraisal.totalWeightage,
        perspectives: perspectives.length,
        objectives: goals.length,
        onTrack:
          appraisal.status === AppraisalStatus.ONGOING ||
          appraisal.status === AppraisalStatus.COMPLETED,
      },
      perspectives,
    });
  }

  async getBehavioural(organizationId: string, appraisalId: string) {
    await this.requireAppraisal(organizationId, appraisalId);
    const [behavioural, reviews] = await Promise.all([
      this.behaviouralRepository.findByAppraisal(
        organizationId,
        appraisalId,
      ),
      this.reviewRepository.findByAppraisal(organizationId, appraisalId),
    ]);

    return AppResponse.success(
      'Behavioural assessment retrieved',
      200,
      {
        appraisalId,
        items: behavioural,
        stages: reviews.map((review) => ({
          stage: review.stage,
          status: review.status,
          submittedAt: review.submittedAt,
        })),
      },
    );
  }

  async getReviews(organizationId: string, appraisalId: string) {
    await this.requireAppraisal(organizationId, appraisalId);
    const reviews = await this.reviewRepository.findByAppraisal(
      organizationId,
      appraisalId,
    );

    return AppResponse.success('Appraisal reviews retrieved', 200, {
      appraisalId,
      selfAssessment:
        reviews.find((review) => review.stage === AppraisalStage.SELF) ??
        null,
      managerReview:
        reviews.find((review) => review.stage === AppraisalStage.MANAGER) ??
        null,
      finalReview:
        reviews.find((review) => review.stage === AppraisalStage.FINAL) ??
        null,
    });
  }

  async getHistory(organizationId: string, employeeId: string) {
    if (!employeeId) {
      throw new BadRequestException('Employee id is required.');
    }

    const appraisals = await this.appraisalRepository.findByEmployee(
      organizationId,
      employeeId,
    );
    const cycleIds = [...new Set(appraisals.map((item) => item.cycleId))];
    const cycles = await this.cycleRepository.findByIds(cycleIds);
    const cycleMap = new Map(
      cycles.map((cycle) => [cycle._id.toString(), cycle]),
    );

    return AppResponse.success('Appraisal history retrieved', 200, {
      employeeId,
      items: appraisals.map((appraisal) => {
        const cycle = cycleMap.get(appraisal.cycleId);
        return {
          appraisalId: appraisal._id.toString(),
          cycleId: appraisal.cycleId,
          cycleName: cycle?.name ?? null,
          cycleCode: cycle?.code ?? null,
          performanceYear: cycle?.performanceYear ?? null,
          reviewType: cycle?.reviewType ?? null,
          startDate: cycle?.startDate ?? null,
          endDate: cycle?.endDate ?? null,
          performanceScore: appraisal.performanceScore,
          ratingTag: appraisal.ratingTag,
          status: appraisal.status,
        };
      }),
      count: appraisals.length,
    });
  }

  async reroute(
    organizationId: string,
    user: ICurrentUser,
    appraisalId: string,
    dto: RerouteAppraisalDto,
  ) {
    const appraisal = await this.requireAppraisal(
      organizationId,
      appraisalId,
    );
    const manager = await this.employeeRepository.findOne({
      _id: dto.managerId,
      organizationId,
    });
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    const managerName =
      `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim() ||
      manager.email ||
      null;

    const updated = await this.appraisalRepository.updateById(appraisalId, {
      managerId: dto.managerId,
      managerName,
      managerEmail: manager.email ?? null,
      reroute: {
        fromManagerId: appraisal.managerId,
        toManagerId: dto.managerId,
        reason: dto.reason ?? null,
        reroutedBy: user.userId,
        reroutedAt: new Date(),
      },
      updatedBy: user.userId,
    });

    await this.reviewRepository.upsert({
      organizationId,
      cycleId: appraisal.cycleId,
      appraisalId,
      stage: AppraisalStage.MANAGER,
      reviewerId: dto.managerId,
      reviewerName: managerName,
      reviewerEmail: manager.email ?? null,
      updatedBy: user.userId,
      createdBy: user.userId,
    });

    return AppResponse.success('Appraisal rerouted', 200, updated);
  }

  async reset(
    organizationId: string,
    user: ICurrentUser,
    appraisalId: string,
    dto: ResetAppraisalDto,
  ) {
    const appraisal = await this.requireAppraisal(
      organizationId,
      appraisalId,
    );
    const stages =
      dto.stages && dto.stages.length > 0
        ? dto.stages
        : [AppraisalStage.SELF, AppraisalStage.MANAGER, AppraisalStage.FINAL];

    const appraisalUpdate: Record<string, unknown> = {
      updatedBy: user.userId,
      resetHistory: [
        ...(appraisal.resetHistory ?? []),
        {
          stages,
          reason: dto.reason ?? null,
          resetBy: user.userId,
          resetAt: new Date(),
        },
      ],
    };

    const goalUpdate: Record<string, unknown> = {};
    const reviewUpdate: Record<string, unknown> = {
      status: AppraisalStageStatus.PENDING,
      score: 0,
      submittedAt: null,
      comment: null,
      updatedBy: user.userId,
    };

    if (stages.includes(AppraisalStage.SELF)) {
      appraisalUpdate.selfAssessmentStatus = AppraisalStageStatus.PENDING;
      appraisalUpdate.selfScore = 0;
      appraisalUpdate.selfAssessmentSubmittedAt = null;
      appraisalUpdate.selfAssessmentComment = null;
      goalUpdate.employeeActual = null;
      goalUpdate.employeeScore = 0;
      goalUpdate.employeeComment = null;
    }

    if (stages.includes(AppraisalStage.MANAGER)) {
      appraisalUpdate.managerReviewStatus = AppraisalStageStatus.PENDING;
      appraisalUpdate.managerScore = 0;
      appraisalUpdate.managerReviewSubmittedAt = null;
      appraisalUpdate.managerReviewComment = null;
      goalUpdate.reviewerActual = null;
      goalUpdate.reviewerScore = 0;
      goalUpdate.reviewerComment = null;
    }

    if (stages.includes(AppraisalStage.FINAL)) {
      appraisalUpdate.finalReviewStatus = AppraisalStageStatus.PENDING;
      appraisalUpdate.finalScore = 0;
      appraisalUpdate.finalReviewSubmittedAt = null;
      appraisalUpdate.finalReviewComment = null;
      appraisalUpdate.ratingTag = null;
      appraisalUpdate.completedAt = null;
      goalUpdate.managerActual = null;
      goalUpdate.finalScore = 0;
    }

    await this.appraisalRepository.updateById(appraisalId, appraisalUpdate);
    if (Object.keys(goalUpdate).length > 0) {
      await this.goalScoreRepository.updateMany(
        { organizationId, appraisalId },
        goalUpdate,
      );
    }
    for (const stage of stages) {
      await this.reviewRepository.upsert({
        organizationId,
        cycleId: appraisal.cycleId,
        appraisalId,
        stage,
        ...reviewUpdate,
      });
    }

    const refreshed = await this.recomputeAppraisal(
      organizationId,
      appraisalId,
      user.userId,
    );

    return AppResponse.success('Appraisal reset', 200, refreshed);
  }

  async calibrate(
    organizationId: string,
    user: ICurrentUser,
    appraisalId: string,
    dto: CalibrateAppraisalDto,
  ) {
    const appraisal = await this.requireAppraisal(
      organizationId,
      appraisalId,
    );

    const calibratedRating =
      dto.calibratedRating ?? appraisal.calibratedRating;
    const ratingTag =
      dto.ratingTag ??
      (dto.calibratedRating !== undefined
        ? resolveRatingTag(dto.calibratedRating)
        : appraisal.ratingTag);

    const updated = await this.appraisalRepository.updateById(appraisalId, {
      managerRating: dto.managerRating ?? appraisal.managerRating,
      calibratedRating,
      ratingTag,
      updatedBy: user.userId,
    });

    await this.reviewRepository.upsert({
      organizationId,
      cycleId: appraisal.cycleId,
      appraisalId,
      stage: AppraisalStage.MANAGER,
      rating: dto.managerRating ?? appraisal.managerRating,
      updatedBy: user.userId,
    });

    return AppResponse.success('Appraisal calibrated', 200, updated);
  }

  async recompute(
    organizationId: string,
    user: ICurrentUser,
    dto: RecomputeAppraisalDto,
  ) {
    if (dto.appraisalId) {
      const updated = await this.recomputeAppraisal(
        organizationId,
        dto.appraisalId,
        user.userId,
      );
      return AppResponse.success('Appraisal score recomputed', 200, updated);
    }

    const cycle = await this.resolveCycle(organizationId, dto.cycleId);
    const appraisals = await this.appraisalRepository.findByCycle(
      organizationId,
      cycle._id.toString(),
    );

    for (const appraisal of appraisals) {
      await this.recomputeAppraisal(
        organizationId,
        appraisal._id.toString(),
        user.userId,
      );
    }

    return AppResponse.success('Appraisal scores recomputed', 200, {
      cycleId: cycle._id.toString(),
      count: appraisals.length,
    });
  }

  async skip(
    organizationId: string,
    user: ICurrentUser,
    appraisalId: string,
    dto: SkipAppraisalDto,
  ) {
    await this.requireAppraisal(organizationId, appraisalId);

    const updated = await this.appraisalRepository.updateById(appraisalId, {
      status: AppraisalStatus.SKIPPED,
      skip: {
        reason: dto.reason ?? null,
        skippedBy: user.userId,
        skippedAt: new Date(),
      },
      updatedBy: user.userId,
    });

    return AppResponse.success('Appraisal skipped', 200, updated);
  }

  async exportReport(
    organizationId: string,
    query: ListAppraisalsQueryDto,
  ): Promise<{ fileName: string; content: string }> {
    const cycle = await this.resolveCycle(organizationId, query.cycleId);
    const appraisals = await this.appraisalRepository.findByCycle(
      organizationId,
      cycle._id.toString(),
    );

    const header = [
      'Employee name',
      'Employment ID',
      'Email',
      'Role',
      'Department',
      'Manager',
      'Performance score',
      'Rating tag',
      'Status',
      'Cycle',
    ];

    const rows = appraisals.map((appraisal) => [
      appraisal.employeeName ?? '',
      appraisal.employeeCode ?? '',
      appraisal.employeeEmail ?? '',
      appraisal.jobTitleName ?? '',
      appraisal.departmentName ?? '',
      appraisal.managerName ?? '',
      String(appraisal.performanceScore ?? 0),
      appraisal.ratingTag ?? '',
      appraisal.status ?? '',
      cycle.name,
    ]);

    const content = [header, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\n');

    return {
      fileName: `appraisal-report-${cycle.code}.csv`,
      content,
    };
  }

  async recomputeAppraisal(
    organizationId: string,
    appraisalId: string,
    userId?: string,
  ): Promise<AppraisalDocument | null> {
    const appraisal = await this.requireAppraisal(
      organizationId,
      appraisalId,
    );
    const goals = await this.goalScoreRepository.findByAppraisal(
      organizationId,
      appraisalId,
    );
    const summary = computeGoalScores(goals);
    const rollups = computePerspectiveRollups(goals);

    for (const goal of goals) {
      const rollup = rollups.find(
        (item) =>
          (item.perspective ?? null) === (goal.perspective ?? null),
      );
      await this.goalScoreRepository.updateById(goal._id.toString(), {
        employeeScore: this.scoreGoalFor(
          goal.employeeActual,
          goal,
        ),
        reviewerScore: this.scoreGoalFor(
          goal.reviewerActual,
          goal,
        ),
        finalScore: this.scoreGoalFor(
          goal.managerActual ?? goal.reviewerActual,
          goal,
        ),
        perspectiveWeightPlanned: rollup?.plannedWeight ?? 0,
        perspectiveWeightActual: rollup?.actualWeight ?? 0,
        updatedBy: userId ?? null,
      });
    }

    const status = this.deriveStatus(appraisal, goals.length, summary);
    const ratingTag =
      status === AppraisalStatus.NO_GOAL_SET
        ? null
        : resolveRatingTag(summary.performanceScore);

    return await this.appraisalRepository.updateById(appraisalId, {
      performanceScore: summary.performanceScore,
      selfScore: summary.employeeScore,
      managerScore: summary.reviewerScore,
      finalScore: summary.finalScore,
      totalWeightage: summary.totalWeightage,
      ratingTag,
      status,
      completedAt:
        status === AppraisalStatus.COMPLETED
          ? appraisal.completedAt ?? new Date()
          : null,
      updatedBy: userId ?? appraisal.updatedBy,
    });
  }

  private scoreGoalFor(
    actual: number | null | undefined,
    goal: {
      targetValue?: number;
      target?: string | null;
      kpiType?: unknown;
    },
  ): number {
    const targetValue =
      goal.targetValue && goal.targetValue > 0
        ? goal.targetValue
        : parseTargetValue(goal.target);
    return scoreGoal(
      actual,
      targetValue,
      goal.kpiType as never,
    );
  }

  private deriveStatus(
    appraisal: AppraisalDocument,
    goalCount: number,
    summary: {
      employeeScore: number;
      reviewerScore: number;
      finalScore: number;
    },
  ): AppraisalStatus {
    if (goalCount === 0) {
      return AppraisalStatus.NO_GOAL_SET;
    }

    if (appraisal.finalReviewStatus === AppraisalStageStatus.SUBMITTED) {
      return AppraisalStatus.COMPLETED;
    }

    const hasProgress =
      appraisal.selfAssessmentStatus === AppraisalStageStatus.SUBMITTED ||
      appraisal.managerReviewStatus === AppraisalStageStatus.SUBMITTED ||
      appraisal.finalReviewStatus === AppraisalStageStatus.IN_PROGRESS ||
      summary.employeeScore > 0 ||
      summary.reviewerScore > 0 ||
      summary.finalScore > 0;

    return hasProgress ? AppraisalStatus.ONGOING : AppraisalStatus.NOT_STARTED;
  }

  private toListItem(appraisal: AppraisalDocument) {
    return {
      appraisalId: appraisal._id.toString(),
      employeeId: appraisal.employeeId,
      name: appraisal.employeeName,
      email: appraisal.employeeEmail,
      employmentId: appraisal.employeeCode,
      role: appraisal.jobTitleName,
      department: appraisal.departmentName,
      departmentCode: appraisal.departmentCode,
      manager: appraisal.managerName,
      performanceScore: appraisal.performanceScore,
      ratingTag: appraisal.ratingTag,
      status: appraisal.status,
    };
  }

  private buildSummary(statusCounts: Record<string, number>) {
    const total = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    return {
      total,
      inProgress: statusCounts[AppraisalStatus.ONGOING] ?? 0,
      notStarted: statusCounts[AppraisalStatus.NOT_STARTED] ?? 0,
      completed: statusCounts[AppraisalStatus.COMPLETED] ?? 0,
      noGoalSet: statusCounts[AppraisalStatus.NO_GOAL_SET] ?? 0,
      skipped: statusCounts[AppraisalStatus.SKIPPED] ?? 0,
    };
  }

  private async resolveCycle(
    organizationId: string,
    cycleId?: string,
  ): Promise<AppraisalCycleDocument> {
    if (cycleId) {
      const cycle = await this.cycleRepository.findById(
        cycleId,
        organizationId,
      );
      if (!cycle) {
        throw new NotFoundException('Appraisal cycle not found');
      }
      return cycle;
    }

    const { items } = await this.cycleRepository.paginatedList(
      { limit: 1 },
      organizationId,
    );
    if (items.length === 0) {
      throw new NotFoundException('No appraisal cycle found');
    }
    return items[0];
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

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private humanize(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
