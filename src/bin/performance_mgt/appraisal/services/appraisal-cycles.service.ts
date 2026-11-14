import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { EmployeeStatus } from '../../../core_hr/employee/enum/employee.enum';
import { EmployeeRepository } from '../../../core_hr/employee/repository/employee.repository';
import { OrganizationDepartmentRepository } from '../../../core_hr/organization/repository/organization-department.repository';
import { JobTitleRepository } from '../../../core_hr/organization/repository/job-title.repository';
import { GoalRepository } from '../../goal-setting/repositories/goal.repository';
import { AppraisalCycleRepository } from '../repositories/appraisal-cycle.repository';
import { CalibrationSessionRepository } from '../repositories/calibration-session.repository';
import { CalibrationParticipantRepository } from '../../calibration/repositories/calibration-participant.repository';
import { AppraisalRepository } from '../repositories/appraisal.repository';
import { AppraisalGoalScoreRepository } from '../repositories/appraisal-goal-score.repository';
import { AppraisalReviewRepository } from '../repositories/appraisal-review.repository';
import { AppraisalBehaviouralRepository } from '../repositories/appraisal-behavioural.repository';
import { AppraisalCommentRepository } from '../repositories/appraisal-comment.repository';
import { CreateAppraisalCycleDto } from '../dto/create-appraisal-cycle.dto';
import { UpdateAppraisalCycleDto } from '../dto/update-appraisal-cycle.dto';
import { AddParticipantsDto } from '../dto/add-participants.dto';
import { ListAppraisalCyclesQueryDto } from '../dto/list-appraisal-cycles-query.dto';
import { SendBulkReminderDto } from '../dto/send-bulk-reminder.dto';
import {
  AppraisalCycleStatus,
  AppraisalReviewType,
  AppraisalStage,
  AppraisalStageStatus,
  AppraisalStatus,
  AppraisalTargetPopulation,
} from '../enums/appraisal.enums';
import { AppraisalCycleDocument } from '../schemas/appraisal-cycle.schema';
import { AppraisalGoalScore } from '../schemas/appraisal-goal-score.schema';
import { AppraisalReview } from '../schemas/appraisal-review.schema';
import {
  AppraisalSnapshotInput,
  ParticipantEmployeeLike,
  ParticipantTargetLike,
  buildAppraisalSnapshot,
  buildGoalScoreSnapshot,
  isEmployeeInScope,
} from '../util/appraisal-participant.util';
import { DEFAULT_RATING_SCALE } from '../util/appraisal-scoring.util';

interface ParticipantResolutionOptions {
  employeeIds?: string[];
  excludeEmployeeIds?: string[];
  createdBy?: string | null;
}

@Injectable()
export class AppraisalCyclesService {
  private readonly logger = new Logger(AppraisalCyclesService.name);

  constructor(
    private readonly cycleRepository: AppraisalCycleRepository,
    private readonly calibrationSessionRepository: CalibrationSessionRepository,
    private readonly calibrationParticipantRepository: CalibrationParticipantRepository,
    private readonly appraisalRepository: AppraisalRepository,
    private readonly goalScoreRepository: AppraisalGoalScoreRepository,
    private readonly reviewRepository: AppraisalReviewRepository,
    private readonly behaviouralRepository: AppraisalBehaviouralRepository,
    private readonly commentRepository: AppraisalCommentRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
    private readonly jobTitleRepository: JobTitleRepository,
    private readonly goalRepository: GoalRepository,
  ) {}

  async listCycles(
    organizationId: string,
    query: ListAppraisalCyclesQueryDto,
  ) {
    const result = await this.cycleRepository.paginatedList(
      {
        search: query.search,
        status: query.status,
        performanceYear: query.performanceYear,
        batch: query.batch,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      organizationId,
    );

    return AppResponse.success('Appraisal cycles retrieved', 200, {
      items: result.items,
      count: result.total,
    });
  }

  async createCycle(
    organizationId: string,
    user: ICurrentUser,
    dto: CreateAppraisalCycleDto,
  ) {
    const existing = await this.cycleRepository.findOne({
      organizationId,
      code: dto.code,
    });
    if (existing) {
      throw new ConflictException('An appraisal cycle with this code exists.');
    }

    this.validateDates(dto);

    const status = dto.saveAsDraft
      ? AppraisalCycleStatus.DRAFT
      : dto.activate
        ? AppraisalCycleStatus.ACTIVE
        : AppraisalCycleStatus.SCHEDULED;

    const cycle = await this.cycleRepository.create({
      organizationId,
      name: dto.name,
      code: dto.code,
      description: dto.description ?? null,
      reviewType: dto.reviewType,
      performanceYear: dto.performanceYear,
      status,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      selfAssessmentDueDate: new Date(dto.selfAssessmentDueDate),
      managerReviewDueDate: new Date(dto.managerReviewDueDate),
      finalReviewDueDate: new Date(dto.finalReviewDueDate),
      resultsPublicationDate: new Date(dto.resultsPublicationDate),
      targetPopulation:
        dto.targetPopulation ?? AppraisalTargetPopulation.DEPARTMENTS,
      includeAllDepartments: dto.includeAllDepartments ?? false,
      departmentIds: dto.departmentIds ?? [],
      departmentCodes: dto.departmentCodes ?? [],
      jobTitleCodes: dto.jobTitleCodes ?? [],
      competencyFrameworkIds: dto.competencyFrameworkIds ?? [],
      competencyFrameworkNames: dto.competencyFrameworkNames ?? [],
      workflowTemplateId: dto.workflowTemplateId ?? null,
      workflowTemplateName: dto.workflowTemplateName ?? null,
      ratingScale: DEFAULT_RATING_SCALE,
      participantCount: 0,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    if (!dto.saveAsDraft) {
      const count = await this.createParticipantsForCycle(
        organizationId,
        cycle,
        user.userId,
      );
      await this.cycleRepository.updateById(cycle._id.toString(), {
        participantCount: count,
      });
    }

    const refreshed = await this.cycleRepository.findById(
      cycle._id.toString(),
      organizationId,
    );

    return AppResponse.success('Appraisal cycle created', 201, refreshed);
  }

  async getCycle(organizationId: string, cycleId: string) {
    const cycle = await this.requireCycle(organizationId, cycleId);
    const statistics = await this.getStatisticsData(organizationId, cycle);
    return AppResponse.success('Appraisal cycle retrieved', 200, {
      cycle,
      statistics,
    });
  }

  async updateCycle(
    organizationId: string,
    user: ICurrentUser,
    cycleId: string,
    dto: UpdateAppraisalCycleDto,
  ) {
    const cycle = await this.requireCycle(organizationId, cycleId);

    if (cycle.status === AppraisalCycleStatus.ENDED) {
      throw new BadRequestException('An ended cycle cannot be modified.');
    }

    if (dto.code && dto.code !== cycle.code) {
      const existing = await this.cycleRepository.findOne({
        organizationId,
        code: dto.code,
      });
      if (existing && existing._id.toString() !== cycleId) {
        throw new ConflictException(
          'An appraisal cycle with this code exists.',
        );
      }
    }

    this.validateDates({
      startDate: dto.startDate ?? cycle.startDate.toISOString(),
      endDate: dto.endDate ?? cycle.endDate.toISOString(),
      selfAssessmentDueDate:
        dto.selfAssessmentDueDate ?? cycle.selfAssessmentDueDate.toISOString(),
      managerReviewDueDate:
        dto.managerReviewDueDate ??
        cycle.managerReviewDueDate.toISOString(),
      finalReviewDueDate:
        dto.finalReviewDueDate ?? cycle.finalReviewDueDate.toISOString(),
      resultsPublicationDate:
        dto.resultsPublicationDate ??
        cycle.resultsPublicationDate.toISOString(),
    });

    const targetChanged =
      dto.targetPopulation !== undefined ||
      dto.includeAllDepartments !== undefined ||
      dto.departmentIds !== undefined ||
      dto.departmentCodes !== undefined ||
      dto.jobTitleCodes !== undefined;

    const updateData: Record<string, unknown> = {
      updatedBy: user.userId,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.description !== undefined && {
        description: dto.description,
      }),
      ...(dto.reviewType !== undefined && { reviewType: dto.reviewType }),
      ...(dto.performanceYear !== undefined && {
        performanceYear: dto.performanceYear,
      }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.selfAssessmentDueDate !== undefined && {
        selfAssessmentDueDate: new Date(dto.selfAssessmentDueDate),
      }),
      ...(dto.managerReviewDueDate !== undefined && {
        managerReviewDueDate: new Date(dto.managerReviewDueDate),
      }),
      ...(dto.finalReviewDueDate !== undefined && {
        finalReviewDueDate: new Date(dto.finalReviewDueDate),
      }),
      ...(dto.resultsPublicationDate !== undefined && {
        resultsPublicationDate: new Date(dto.resultsPublicationDate),
      }),
      ...(dto.targetPopulation !== undefined && {
        targetPopulation: dto.targetPopulation,
      }),
      ...(dto.includeAllDepartments !== undefined && {
        includeAllDepartments: dto.includeAllDepartments,
      }),
      ...(dto.departmentIds !== undefined && {
        departmentIds: dto.departmentIds,
      }),
      ...(dto.departmentCodes !== undefined && {
        departmentCodes: dto.departmentCodes,
      }),
      ...(dto.jobTitleCodes !== undefined && {
        jobTitleCodes: dto.jobTitleCodes,
      }),
      ...(dto.competencyFrameworkIds !== undefined && {
        competencyFrameworkIds: dto.competencyFrameworkIds,
      }),
      ...(dto.competencyFrameworkNames !== undefined && {
        competencyFrameworkNames: dto.competencyFrameworkNames,
      }),
      ...(dto.workflowTemplateId !== undefined && {
        workflowTemplateId: dto.workflowTemplateId,
      }),
      ...(dto.workflowTemplateName !== undefined && {
        workflowTemplateName: dto.workflowTemplateName,
      }),
      ...(dto.activate && { status: AppraisalCycleStatus.ACTIVE }),
    };

    const updated = await this.cycleRepository.updateById(cycleId, updateData);

    const canRebuild =
      cycle.status === AppraisalCycleStatus.DRAFT ||
      cycle.status === AppraisalCycleStatus.SCHEDULED;

    if (targetChanged && canRebuild) {
      const count = await this.rebuildParticipants(
        organizationId,
        updated!,
        user.userId,
      );
      await this.cycleRepository.updateById(cycleId, {
        participantCount: count,
      });
    } else if (dto.activate) {
      const count = await this.createParticipantsForCycle(
        organizationId,
        updated!,
        user.userId,
      );
      await this.cycleRepository.updateById(cycleId, {
        participantCount: count,
      });
    }

    const refreshed = await this.cycleRepository.findById(
      cycleId,
      organizationId,
    );

    return AppResponse.success('Appraisal cycle updated', 200, refreshed);
  }

  async removeCycle(organizationId: string, cycleId: string) {
    const cycle = await this.requireCycle(organizationId, cycleId);

    if (cycle.status === AppraisalCycleStatus.ACTIVE) {
      throw new BadRequestException(
        'An active cycle must be ended before it can be removed.',
      );
    }

    await this.purgeCycleRecords(organizationId, cycleId);
    await this.cycleRepository.deleteById(cycleId);

    return AppResponse.success('Appraisal cycle removed', 200, { cycleId });
  }

  async endCycle(
    organizationId: string,
    user: ICurrentUser,
    cycleId: string,
  ) {
    const cycle = await this.requireCycle(organizationId, cycleId);

    if (cycle.status === AppraisalCycleStatus.ENDED) {
      throw new BadRequestException('This cycle has already ended.');
    }

    const now = new Date();
    await this.appraisalRepository.updateMany(
      {
        organizationId,
        cycleId,
        status: {
          $in: [
            AppraisalStatus.NOT_STARTED,
            AppraisalStatus.ONGOING,
            AppraisalStatus.NO_GOAL_SET,
          ],
        },
      },
      { status: AppraisalStatus.COMPLETED, completedAt: now },
    );

    await this.reviewRepository.updateMany(
      {
        organizationId,
        cycleId,
        status: {
          $in: [
            AppraisalStageStatus.PENDING,
            AppraisalStageStatus.IN_PROGRESS,
            AppraisalStageStatus.OVERDUE,
          ],
        },
      },
      { status: AppraisalStageStatus.SUBMITTED },
    );

    const updated = await this.cycleRepository.updateById(cycleId, {
      status: AppraisalCycleStatus.ENDED,
      endedAt: now,
      endedBy: user.userId,
      updatedBy: user.userId,
    });

    return AppResponse.success('Appraisal cycle ended', 200, updated);
  }

  async publishResults(
    organizationId: string,
    user: ICurrentUser,
    cycleId: string,
  ) {
    await this.requireCycle(organizationId, cycleId);
    const now = new Date();

    const updated = await this.cycleRepository.updateById(cycleId, {
      resultsPublishedAt: now,
      updatedBy: user.userId,
    });

    return AppResponse.success('Appraisal results published', 200, updated);
  }

  async getStatistics(organizationId: string, cycleId: string) {
    const cycle = await this.requireCycle(organizationId, cycleId);
    const statistics = await this.getStatisticsData(organizationId, cycle);
    return AppResponse.success('Appraisal statistics retrieved', 200, statistics);
  }

  async listParticipants(organizationId: string, cycleId: string) {
    await this.requireCycle(organizationId, cycleId);
    const participants = await this.appraisalRepository.findByCycle(
      organizationId,
      cycleId,
    );

    return AppResponse.success('Cycle participants retrieved', 200, {
      items: participants,
      count: participants.length,
    });
  }

  async addParticipants(
    organizationId: string,
    user: ICurrentUser,
    cycleId: string,
    dto: AddParticipantsDto,
  ) {
    const cycle = await this.requireCycle(organizationId, cycleId);

    if (cycle.status === AppraisalCycleStatus.ENDED) {
      throw new BadRequestException(
        'Participants cannot be added to an ended cycle.',
      );
    }

    const existing = await this.appraisalRepository.findByCycle(
      organizationId,
      cycleId,
    );
    const existingEmployeeIds = existing.map((item) => item.employeeId);

    const target = this.mergeTarget(cycle, dto);
    const count = await this.createParticipantRecords(
      organizationId,
      cycle,
      target,
      {
        employeeIds: dto.employeeIds,
        excludeEmployeeIds: existingEmployeeIds,
        createdBy: user.userId,
      },
    );

    const total = existingEmployeeIds.length + count;
    await this.cycleRepository.updateById(cycleId, {
      participantCount: total,
      ...(dto.targetPopulation !== undefined && {
        targetPopulation: dto.targetPopulation,
      }),
      ...(dto.includeAllDepartments !== undefined && {
        includeAllDepartments: dto.includeAllDepartments,
      }),
      ...(dto.departmentIds !== undefined && {
        departmentIds: dto.departmentIds,
      }),
      ...(dto.departmentCodes !== undefined && {
        departmentCodes: dto.departmentCodes,
      }),
      ...(dto.jobTitleCodes !== undefined && {
        jobTitleCodes: dto.jobTitleCodes,
      }),
    });

    return AppResponse.success('Participants added', 200, {
      added: count,
      total,
    });
  }

  async removeParticipants(
    organizationId: string,
    user: ICurrentUser,
    cycleId: string,
    dto: AddParticipantsDto,
  ) {
    const cycle = await this.requireCycle(organizationId, cycleId);

    if (cycle.status === AppraisalCycleStatus.ENDED) {
      throw new BadRequestException(
        'Participants cannot be removed from an ended cycle.',
      );
    }

    const participants = await this.appraisalRepository.findByCycle(
      organizationId,
      cycleId,
    );

    let toRemove = participants;
    if (dto.employeeIds && dto.employeeIds.length > 0) {
      toRemove = participants.filter((item) =>
        dto.employeeIds!.includes(item.employeeId),
      );
    } else {
      const target = await this.resolveTargetDepartmentCodes(
        organizationId,
        this.mergeTarget(cycle, dto),
      );
      const employees = await this.loadEmployees(organizationId);
      const matchingIds = new Set(
        employees
          .filter((employee) => isEmployeeInScope(employee, target))
          .map((employee) => String(employee._id)),
      );
      toRemove = participants.filter((item) =>
        matchingIds.has(item.employeeId),
      );
    }

    for (const appraisal of toRemove) {
      const appraisalId = appraisal._id.toString();
      await this.goalScoreRepository.deleteByAppraisal(
        organizationId,
        appraisalId,
      );
      await this.reviewRepository.deleteByAppraisal(
        organizationId,
        appraisalId,
      );
      await this.behaviouralRepository.deleteByAppraisal(
        organizationId,
        appraisalId,
      );
      await this.commentRepository.deleteByAppraisal(
        organizationId,
        appraisalId,
      );
      await this.appraisalRepository.deleteById(appraisalId);
    }

    const remaining = await this.appraisalRepository.countByCycle(
      organizationId,
      cycleId,
    );
    await this.cycleRepository.updateById(cycleId, {
      participantCount: remaining,
      updatedBy: user.userId,
    });

    return AppResponse.success('Participants removed', 200, {
      removed: toRemove.length,
      total: remaining,
    });
  }

  async getCycleOptions(organizationId: string) {
    const [departments, jobTitles] = await Promise.all([
      this.organizationDepartmentRepository.findByOrganization(organizationId),
      this.jobTitleRepository.findByOrganization(organizationId),
    ]);

    return AppResponse.success('Appraisal options retrieved', 200, {
      reviewTypes: Object.values(AppraisalReviewType).map((value) => ({
        value,
        label: this.humanize(value),
      })),
      performanceYears: this.buildPerformanceYears(),
      targetPopulations: Object.values(AppraisalTargetPopulation).map(
        (value) => ({ value, label: this.humanize(value) }),
      ),
      departments: departments.map((department) => ({
        id: department._id.toString(),
        code: department.code,
        name: department.name,
      })),
      roles: jobTitles.map((jobTitle) => ({
        code: jobTitle.code,
        name: jobTitle.name,
      })),
      competencyFrameworks: [],
      workflowTemplates: [
        { id: 'standard', name: 'Standard Workflow' },
      ],
      ratingScale: DEFAULT_RATING_SCALE,
    });
  }

  async sendReminderToParticipants(
    organizationId: string,
    user: ICurrentUser,
    cycleId: string,
    dto: SendBulkReminderDto,
  ) {
    await this.requireCycle(organizationId, cycleId);
    const participants = await this.appraisalRepository.findByCycle(
      organizationId,
      cycleId,
    );

    const now = new Date();
    for (const participant of participants) {
      await this.appraisalRepository.updateById(participant._id.toString(), {
        updatedBy: user.userId,
      });
    }

    return AppResponse.success('Reminders sent to participants', 200, {
      cycleId,
      sentTo: participants.length,
      reminderNote: dto.reminderNote ?? null,
      sentBy: user.userId,
      sentAt: now,
    });
  }

  private async createParticipantsForCycle(
    organizationId: string,
    cycle: AppraisalCycleDocument,
    createdBy: string,
  ): Promise<number> {
    const target = this.mergeTarget(cycle, {});
    return await this.createParticipantRecords(organizationId, cycle, target, {
      createdBy,
    });
  }

  private async rebuildParticipants(
    organizationId: string,
    cycle: AppraisalCycleDocument,
    createdBy: string,
  ): Promise<number> {
    await this.purgeCycleRecords(organizationId, cycle._id.toString());
    return await this.createParticipantsForCycle(
      organizationId,
      cycle,
      createdBy,
    );
  }

  private async purgeCycleRecords(
    organizationId: string,
    cycleId: string,
  ): Promise<void> {
    const participants = await this.appraisalRepository.findByCycle(
      organizationId,
      cycleId,
    );

    for (const appraisal of participants) {
      const appraisalId = appraisal._id.toString();
      await this.goalScoreRepository.deleteByAppraisal(
        organizationId,
        appraisalId,
      );
      await this.reviewRepository.deleteByAppraisal(
        organizationId,
        appraisalId,
      );
      await this.behaviouralRepository.deleteByAppraisal(
        organizationId,
        appraisalId,
      );
      await this.commentRepository.deleteByAppraisal(
        organizationId,
        appraisalId,
      );
    }

    await this.calibrationParticipantRepository.deleteByCycle(
      organizationId,
      cycleId,
    );
    await this.calibrationSessionRepository.deleteByCycle(
      organizationId,
      cycleId,
    );
    await this.appraisalRepository.deleteByCycle(organizationId, cycleId);
  }

  private async resolveTargetDepartmentCodes(
    organizationId: string,
    target: ParticipantTargetLike,
  ): Promise<ParticipantTargetLike> {
    if (target.departmentCodes?.length || !target.departmentIds?.length) {
      return target;
    }

    const departments =
      await this.organizationDepartmentRepository.findByOrganization(
        organizationId,
      );
    const codeById = new Map(
      departments.map((department) => [
        String((department as unknown as { _id: unknown })._id),
        department.code,
      ]),
    );
    const departmentCodes = target.departmentIds
      .map((id) => codeById.get(id))
      .filter((code): code is string => Boolean(code));

    return { ...target, departmentCodes };
  }

  private async createParticipantRecords(
    organizationId: string,
    cycle: AppraisalCycleDocument,
    target: ParticipantTargetLike,
    options: ParticipantResolutionOptions,
  ): Promise<number> {
    const [employees, departments, jobTitles] = await Promise.all([
      this.loadEmployees(organizationId),
      this.organizationDepartmentRepository.findByOrganization(organizationId),
      this.jobTitleRepository.findByOrganization(organizationId),
    ]);

    const employeeMap = new Map(
      employees.map((employee) => [String(employee._id), employee]),
    );
    const departmentMap = new Map(
      departments.map((department) => [department.code, department]),
    );
    const jobTitleMap = new Map(
      jobTitles.map((jobTitle) => [jobTitle.code, jobTitle]),
    );

    const codeById = new Map(
      departments.map((department) => [
        String((department as unknown as { _id: unknown })._id),
        department.code,
      ]),
    );
    const effectiveTarget: ParticipantTargetLike =
      target.departmentCodes?.length || !target.departmentIds?.length
        ? target
        : {
            ...target,
            departmentCodes: target.departmentIds
              .map((id) => codeById.get(id))
              .filter((code): code is string => Boolean(code)),
          };

    const exclude = new Set(options.excludeEmployeeIds ?? []);
    const explicitIds =
      options.employeeIds && options.employeeIds.length > 0
        ? new Set(options.employeeIds)
        : null;

    const selected = employees.filter((employee) => {
      const employeeId = String(employee._id);
      if (employee.status !== EmployeeStatus.ACTIVE) return false;
      if (exclude.has(employeeId)) return false;
      if (explicitIds && !explicitIds.has(employeeId)) return false;
      return isEmployeeInScope(employee, effectiveTarget);
    });

    if (selected.length === 0) {
      return 0;
    }

    const selectedIds = selected.map((employee) => String(employee._id));
    const goals = await this.goalRepository.findEmployeeGoalsByEmployeeIds(
      organizationId,
      selectedIds,
    );
    const goalsByEmployee = new Map<string, typeof goals>();
    for (const goal of goals) {
      if (!goal.employeeId) continue;
      const list = goalsByEmployee.get(goal.employeeId) ?? [];
      list.push(goal);
      goalsByEmployee.set(goal.employeeId, list);
    }

    const cycleId = cycle._id.toString();
    const snapshots = selected.map((employee) => {
      const employeeId = String(employee._id);
      const employeeGoals = goalsByEmployee.get(employeeId) ?? [];
      const snapshot: AppraisalSnapshotInput = {
        organizationId,
        cycleId,
        employee,
        employeeMap,
        departmentMap,
        jobTitleMap,
        createdBy: options.createdBy,
      };

      return {
        ...buildAppraisalSnapshot(snapshot),
        status:
          employeeGoals.length > 0
            ? AppraisalStatus.NOT_STARTED
            : AppraisalStatus.NO_GOAL_SET,
        selfAssessmentStatus: AppraisalStageStatus.PENDING,
        managerReviewStatus: AppraisalStageStatus.PENDING,
        finalReviewStatus: AppraisalStageStatus.PENDING,
      };
    });

    const appraisals = await this.appraisalRepository.createMany(snapshots);

    const goalSnapshots: Partial<AppraisalGoalScore>[] = [];
    const reviewSeeds: Partial<AppraisalReview>[] = [];

    for (const appraisal of appraisals) {
      const appraisalId = appraisal._id.toString();
      const employeeGoals =
        goalsByEmployee.get(appraisal.employeeId) ?? [];

      for (const goal of employeeGoals) {
        goalSnapshots.push(
          buildGoalScoreSnapshot(
            organizationId,
            cycleId,
            appraisalId,
            goal,
            options.createdBy,
          ),
        );
      }

      reviewSeeds.push(
        ...this.buildReviewSeeds(cycle, appraisalId),
      );

      if (employeeGoals.length === 0) {
        await this.appraisalRepository.updateById(appraisalId, {
          status: AppraisalStatus.NO_GOAL_SET,
        });
      }
    }

    await this.goalScoreRepository.upsertMany(goalSnapshots);
    await this.reviewRepository.upsertMany(reviewSeeds);

    return appraisals.length;
  }

  private buildReviewSeeds(
    cycle: AppraisalCycleDocument,
    appraisalId: string,
  ): Partial<AppraisalReview>[] {
    const cycleId = cycle._id.toString();
    return [
      {
        organizationId: cycle.organizationId,
        cycleId,
        appraisalId,
        stage: AppraisalStage.SELF,
        status: AppraisalStageStatus.PENDING,
        dueAt: cycle.selfAssessmentDueDate,
        createdBy: cycle.createdBy,
        updatedBy: cycle.createdBy,
      },
      {
        organizationId: cycle.organizationId,
        cycleId,
        appraisalId,
        stage: AppraisalStage.MANAGER,
        status: AppraisalStageStatus.PENDING,
        dueAt: cycle.managerReviewDueDate,
        createdBy: cycle.createdBy,
        updatedBy: cycle.createdBy,
      },
      {
        organizationId: cycle.organizationId,
        cycleId,
        appraisalId,
        stage: AppraisalStage.FINAL,
        status: AppraisalStageStatus.PENDING,
        dueAt: cycle.finalReviewDueDate,
        createdBy: cycle.createdBy,
        updatedBy: cycle.createdBy,
      },
    ];
  }

  private async getStatisticsData(
    organizationId: string,
    cycle: AppraisalCycleDocument,
  ) {
    const cycleId = cycle._id.toString();
    const [
      total,
      statusCounts,
      selfCompleted,
      managerCompleted,
      finalCompleted,
      scoreStats,
      departmentPerformance,
      participants,
    ] = await Promise.all([
      this.appraisalRepository.countByCycle(organizationId, cycleId),
      this.appraisalRepository.statusCounts(organizationId, cycleId),
      this.reviewRepository.countByCycleStageStatus(
        organizationId,
        cycleId,
        AppraisalStage.SELF,
        AppraisalStageStatus.SUBMITTED,
      ),
      this.reviewRepository.countByCycleStageStatus(
        organizationId,
        cycleId,
        AppraisalStage.MANAGER,
        AppraisalStageStatus.SUBMITTED,
      ),
      this.reviewRepository.countByCycleStageStatus(
        organizationId,
        cycleId,
        AppraisalStage.FINAL,
        AppraisalStageStatus.SUBMITTED,
      ),
      this.appraisalRepository.scoreStats(organizationId, cycleId),
      this.appraisalRepository.departmentPerformance(organizationId, cycleId),
      this.appraisalRepository.findByCycle(organizationId, cycleId),
    ]);

    const completed = statusCounts[AppraisalStatus.COMPLETED] ?? 0;
    const pending = Math.max(total - completed, 0);
    const departmentIds = new Set(
      participants
        .map((participant) => participant.departmentCode)
        .filter(Boolean),
    );
    const managerIds = new Set(
      participants
        .map((participant) => participant.managerId)
        .filter(Boolean),
    );
    const completionRate =
      total > 0 ? this.round((completed / total) * 100) : 0;

    return {
      cycleId,
      totalParticipants: total,
      statusBreakdown: {
        completed,
        pending,
        inProgress: statusCounts[AppraisalStatus.ONGOING] ?? 0,
        notStarted: statusCounts[AppraisalStatus.NOT_STARTED] ?? 0,
        noGoalSet: statusCounts[AppraisalStatus.NO_GOAL_SET] ?? 0,
        skipped: statusCounts[AppraisalStatus.SKIPPED] ?? 0,
      },
      progress: {
        selfReviews: this.progressBlock(selfCompleted, total),
        managerReviews: this.progressBlock(managerCompleted, total),
        finalReviews: this.progressBlock(finalCompleted, total),
      },
      distribution: {
        averageScore: scoreStats.averageScore ?? 0,
        highestScore: scoreStats.highestScore ?? 0,
        lowestScore: scoreStats.lowestScore ?? 0,
      },
      departmentPerformance,
      completion: {
        completed,
        pending,
        completionRate,
      },
      timeline: this.buildTimeline(cycle),
      participants: {
        employees: total,
        departments: departmentIds.size,
        managers: managerIds.size,
        locations: 0,
      },
    };
  }

  private buildTimeline(cycle: AppraisalCycleDocument) {
    const now = Date.now();
    const stages = [
      {
        name: 'Self-Assessment',
        date: cycle.selfAssessmentDueDate,
        status:
          cycle.status === AppraisalCycleStatus.ENDED ||
          cycle.selfAssessmentDueDate.getTime() < now
            ? 'completed'
            : 'upcoming',
      },
      {
        name: 'Manager Review',
        date: cycle.managerReviewDueDate,
        status:
          cycle.status === AppraisalCycleStatus.ENDED ||
          cycle.managerReviewDueDate.getTime() < now
            ? 'completed'
            : 'upcoming',
      },
      {
        name: 'Final Review',
        date: cycle.finalReviewDueDate,
        status:
          cycle.status === AppraisalCycleStatus.ENDED ||
          cycle.finalReviewDueDate.getTime() < now
            ? 'completed'
            : 'upcoming',
      },
      {
        name: 'Results Publication',
        date: cycle.resultsPublicationDate,
        status: cycle.resultsPublishedAt ? 'completed' : 'upcoming',
      },
    ];

    const completedStages = stages.filter(
      (stage) => stage.status === 'completed',
    ).length;
    const percentComplete = this.round(
      (completedStages / stages.length) * 100,
    );

    return {
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      percentComplete,
      stagesCompleted: completedStages,
      totalStages: stages.length,
      stages,
    };
  }

  private progressBlock(completed: number, total: number) {
    return {
      completed,
      total,
      percent: total > 0 ? this.round((completed / total) * 100) : 0,
    };
  }

  private mergeTarget(
    cycle: AppraisalCycleDocument,
    dto: AddParticipantsDto,
  ): ParticipantTargetLike {
    return {
      targetPopulation: dto.targetPopulation ?? cycle.targetPopulation,
      includeAllDepartments:
        dto.includeAllDepartments ?? cycle.includeAllDepartments,
      departmentIds: dto.departmentIds ?? cycle.departmentIds,
      departmentCodes: dto.departmentCodes ?? cycle.departmentCodes,
      jobTitleCodes: dto.jobTitleCodes ?? cycle.jobTitleCodes,
    };
  }

  private async loadEmployees(
    organizationId: string,
  ): Promise<ParticipantEmployeeLike[]> {
    return (await this.employeeRepository.findByOrganization(
      organizationId,
      'firstName lastName email employeeId jobTitleCode departmentCode supervisor status',
    )) as unknown as ParticipantEmployeeLike[];
  }

  private validateDates(dates: {
    startDate: string;
    endDate: string;
    selfAssessmentDueDate: string;
    managerReviewDueDate: string;
    finalReviewDueDate: string;
    resultsPublicationDate: string;
  }) {
    const start = new Date(dates.startDate).getTime();
    const end = new Date(dates.endDate).getTime();
    const self = new Date(dates.selfAssessmentDueDate).getTime();
    const manager = new Date(dates.managerReviewDueDate).getTime();
    const final = new Date(dates.finalReviewDueDate).getTime();
    const results = new Date(dates.resultsPublicationDate).getTime();

    if (
      [start, end, self, manager, final, results].some((value) =>
        Number.isNaN(value),
      )
    ) {
      throw new BadRequestException('One or more dates are invalid.');
    }

    if (start > end) {
      throw new BadRequestException(
        'Start date must be before the end date.',
      );
    }

    if (self < start) {
      throw new BadRequestException(
        'Self-assessment due date must be on or after the start date.',
      );
    }

    if (manager < self) {
      throw new BadRequestException(
        'Manager review due date must be on or after the self-assessment due date.',
      );
    }

    if (final < manager) {
      throw new BadRequestException(
        'Final review due date must be on or after the manager review due date.',
      );
    }

    if (results < final) {
      throw new BadRequestException(
        'Results publication date must be on or after the final review due date.',
      );
    }
  }

  private async requireCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<AppraisalCycleDocument> {
    const cycle = await this.cycleRepository.findById(
      cycleId,
      organizationId,
    );
    if (!cycle) {
      throw new NotFoundException('Appraisal cycle not found');
    }
    return cycle;
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

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
