import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { EmployeeRepository } from '../../../core_hr/employee/repository/employee.repository';
import { OrganizationDepartmentRepository } from '../../../core_hr/organization/repository/organization-department.repository';
import { JobTitleRepository } from '../../../core_hr/organization/repository/job-title.repository';
import { FeedbackCycleRepository } from '../repositories/feedback-cycle.repository';
import { FeedbackRepository } from '../repositories/feedback.repository';
import { FeedbackCommentRepository } from '../repositories/feedback-comment.repository';
import { Create360FeedbackCycleDto } from '../dto/create-360-feedback-cycle.dto';
import { Update360FeedbackCycleDto } from '../dto/update-360-feedback-cycle.dto';
import { List360FeedbackCyclesQueryDto } from '../dto/list-360-feedback-cycles-query.dto';
import {
  FeedbackCycleStatus,
  FeedbackStatus,
  RespondentType,
} from '../enums/360-feedback.enums';
import { FeedbackCycleDocument } from '../schemas/360-feedback.schema';

@Injectable()
export class FeedbackCyclesService {
  private readonly logger = new Logger(FeedbackCyclesService.name);

  constructor(
    private readonly cycleRepository: FeedbackCycleRepository,
    private readonly feedbackRepository: FeedbackRepository,
    private readonly commentRepository: FeedbackCommentRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
    private readonly jobTitleRepository: JobTitleRepository,
  ) {}

  async listCycles(
    organizationId: string,
    query: List360FeedbackCyclesQueryDto,
  ) {
    const result = await this.cycleRepository.paginatedList(
      {
        search: query.search,
        status: query.status,
        batch: query.batch,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      organizationId,
    );

    return AppResponse.success('360 feedback cycles retrieved', 200, {
      items: result.items,
      count: result.total,
    });
  }

  async createCycle(
    organizationId: string,
    user: ICurrentUser,
    dto: Create360FeedbackCycleDto,
  ) {
    const existing = await this.cycleRepository.findOne({
      organizationId,
      code: dto.code,
    });
    if (existing) {
      throw new ConflictException('A 360 feedback cycle with this code exists.');
    }

    const status = dto.saveAsDraft
      ? FeedbackCycleStatus.DRAFT
      : dto.activate
        ? FeedbackCycleStatus.ACTIVE
        : FeedbackCycleStatus.SCHEDULED;

    const cycle = await this.cycleRepository.create({
      organizationId,
      name: dto.name,
      code: dto.code,
      description: dto.description ?? null,
      businessUnit: dto.businessUnit ?? null,
      sessionOwner: dto.sessionOwner ?? null,
      status,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      nominationDueDate: new Date(dto.nominationDueDate),
      feedbackDueDate: new Date(dto.feedbackDueDate),
      resultsPublicationDate: new Date(dto.resultsPublicationDate),
      primaryRespondentType: dto.primaryRespondentType ?? RespondentType.SELF,
      respondentTypes: dto.respondentTypes ?? [RespondentType.SELF],
      maxNominations: dto.maxNominations ?? 20,
      departmentIds: dto.departmentIds ?? [],
      departmentCodes: dto.departmentCodes ?? [],
      jobTitleCodes: dto.jobTitleCodes ?? [],
      participantCount: 0,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const refreshed = await this.cycleRepository.findById(
      cycle._id.toString(),
      organizationId,
    );

    return AppResponse.success('360 feedback cycle created', 201, refreshed);
  }

  async getCycle(organizationId: string, cycleId: string) {
    const cycle = await this.requireCycle(organizationId, cycleId);
    const statistics = await this.getStatisticsData(organizationId, cycle);
    return AppResponse.success('360 feedback cycle retrieved', 200, {
      cycle,
      statistics,
    });
  }

  async updateCycle(
    organizationId: string,
    user: ICurrentUser,
    cycleId: string,
    dto: Update360FeedbackCycleDto,
  ) {
    const cycle = await this.requireCycle(organizationId, cycleId);

    if (cycle.status === FeedbackCycleStatus.ENDED) {
      throw new BadRequestException('An ended cycle cannot be modified.');
    }

    if (dto.code && dto.code !== cycle.code) {
      const existing = await this.cycleRepository.findOne({
        organizationId,
        code: dto.code,
      });
      if (existing && existing._id.toString() !== cycleId) {
        throw new ConflictException(
          'A 360 feedback cycle with this code exists.',
        );
      }
    }

    const updateData: Record<string, unknown> = {
      updatedBy: user.userId,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.businessUnit !== undefined && { businessUnit: dto.businessUnit }),
      ...(dto.sessionOwner !== undefined && { sessionOwner: dto.sessionOwner }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.nominationDueDate !== undefined && {
        nominationDueDate: new Date(dto.nominationDueDate),
      }),
      ...(dto.feedbackDueDate !== undefined && {
        feedbackDueDate: new Date(dto.feedbackDueDate),
      }),
      ...(dto.resultsPublicationDate !== undefined && {
        resultsPublicationDate: new Date(dto.resultsPublicationDate),
      }),
      ...(dto.primaryRespondentType !== undefined && {
        primaryRespondentType: dto.primaryRespondentType,
      }),
      ...(dto.respondentTypes !== undefined && {
        respondentTypes: dto.respondentTypes,
      }),
      ...(dto.maxNominations !== undefined && { maxNominations: dto.maxNominations }),
      ...(dto.departmentIds !== undefined && { departmentIds: dto.departmentIds }),
      ...(dto.departmentCodes !== undefined && {
        departmentCodes: dto.departmentCodes,
      }),
      ...(dto.jobTitleCodes !== undefined && {
        jobTitleCodes: dto.jobTitleCodes,
      }),
      ...(dto.activate && { status: FeedbackCycleStatus.ACTIVE }),
    };

    await this.cycleRepository.updateById(cycleId, updateData);

    const refreshed = await this.cycleRepository.findById(
      cycleId,
      organizationId,
    );

    return AppResponse.success('360 feedback cycle updated', 200, refreshed);
  }

  async removeCycle(organizationId: string, cycleId: string) {
    const cycle = await this.requireCycle(organizationId, cycleId);

    if (cycle.status === FeedbackCycleStatus.ACTIVE) {
      throw new BadRequestException(
        'An active cycle must be ended before it can be removed.',
      );
    }

    await this.purgeCycleRecords(organizationId, cycleId);
    await this.cycleRepository.deleteById(cycleId);

    return AppResponse.success('360 feedback cycle removed', 200, { cycleId });
  }

  async endCycle(organizationId: string, user: ICurrentUser, cycleId: string) {
    const cycle = await this.requireCycle(organizationId, cycleId);

    if (cycle.status === FeedbackCycleStatus.ENDED) {
      throw new BadRequestException('This cycle has already ended.');
    }

    const now = new Date();
    await this.feedbackRepository.updateManyStatuses(
      organizationId,
      cycleId,
      [
        FeedbackStatus.NOT_STARTED,
        FeedbackStatus.IN_PROGRESS,
        FeedbackStatus.PENDING,
      ],
      FeedbackStatus.COMPLETED,
    );

    const updated = await this.cycleRepository.updateById(cycleId, {
      status: FeedbackCycleStatus.ENDED,
      endedAt: now,
      endedBy: user.userId,
      updatedBy: user.userId,
    });

    return AppResponse.success('360 feedback cycle ended', 200, updated);
  }

  async publishResults(organizationId: string, user: ICurrentUser, cycleId: string) {
    await this.requireCycle(organizationId, cycleId);
    const now = new Date();

    const updated = await this.cycleRepository.updateById(cycleId, {
      resultsPublishedAt: now,
      updatedBy: user.userId,
    });

    return AppResponse.success('360 feedback results published', 200, updated);
  }

  async getStatistics(organizationId: string, cycleId: string) {
    const cycle = await this.requireCycle(organizationId, cycleId);
    const statistics = await this.getStatisticsData(organizationId, cycle);
    return AppResponse.success('360 feedback statistics retrieved', 200, statistics);
  }

  async getCycleOptions(organizationId: string) {
    const [departments, jobTitles] = await Promise.all([
      this.organizationDepartmentRepository.findByOrganization(organizationId),
      this.jobTitleRepository.findByOrganization(organizationId),
    ]);

    return AppResponse.success('360 feedback options retrieved', 200, {
      respondentTypes: Object.values(RespondentType).map((value) => ({
        value,
        label: this.humanize(value),
      })),
      performanceYears: this.buildPerformanceYears(),
      departments: departments.map((department) => ({
        id: department._id.toString(),
        code: department.code,
        name: department.name,
      })),
      roles: jobTitles.map((jobTitle) => ({
        code: jobTitle.code,
        name: jobTitle.name,
      })),
    });
  }

  private async getStatisticsData(
    organizationId: string,
    cycle: FeedbackCycleDocument,
  ) {
    const cycleId = cycle._id.toString();
    const [total, statusCounts, scoreStats, feedbackItems] =
      await Promise.all([
        this.feedbackRepository.countByCycle(organizationId, cycleId),
        this.feedbackRepository.statusCounts(organizationId, cycleId),
        this.feedbackRepository.averageScore(organizationId, cycleId),
        this.feedbackRepository.findByCycle(organizationId, cycleId),
      ]);

    const completed = statusCounts[FeedbackStatus.COMPLETED] ?? 0;
    const pending = Math.max(total - completed, 0);

    return {
      cycleId,
      totalParticipants: total,
      statusBreakdown: {
        completed,
        pending,
        inProgress: statusCounts[FeedbackStatus.IN_PROGRESS] ?? 0,
        notStarted: statusCounts[FeedbackStatus.NOT_STARTED] ?? 0,
      },
      distribution: {
        averageScore: scoreStats.averageScore,
        highestScore: scoreStats.highestScore,
        lowestScore: scoreStats.lowestScore,
      },
      completion: {
        completed,
        pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      participants: {
        employees: total,
        feedbackItems: feedbackItems.length,
      },
    };
  }

  private async requireCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<FeedbackCycleDocument> {
    const cycle = await this.cycleRepository.findById(cycleId, organizationId);
    if (!cycle) {
      throw new NotFoundException('360 feedback cycle not found');
    }
    return cycle;
  }

  private async purgeCycleRecords(
    organizationId: string,
    cycleId: string,
  ): Promise<void> {
    const feedbackItems = await this.feedbackRepository.findByCycle(
      organizationId,
      cycleId,
    );

    for (const feedback of feedbackItems) {
      const feedbackId = feedback._id.toString();
      await this.commentRepository.deleteByFeedback(
        organizationId,
        feedbackId,
      );
    }

    await this.feedbackRepository.deleteByCycle(organizationId, cycleId);
  }

  private buildPerformanceYears(): number[] {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1, current + 2];
  }

  private humanize(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
