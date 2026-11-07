import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppResponse } from '../../../common/response/app-response';
import { GoalPlanRepository } from '../repository/goal-plan.repository';
import { GoalRepository } from '../repository/goal.repository';
import { GoalPlanDto } from '../dto/goal-plan.dto';
import { EndGoalPlanCycleDto } from '../dto/goal-progress.dto';
import { GoalPlanStatus } from '../enums/goal.enums';

interface ProgressMetrics {
  goalsSet: { completed: number; total: number };
  goalsApproved: { completed: number; total: number };
  goalsCascaded: { completed: number; total: number };
  averageProgress: number;
  highestProgress: number;
  lowestProgress: number;
  cascadeRate: number;
  pendingApproval: number;
}

interface DepartmentProgress {
  departmentId: string;
  departmentName: string;
  employees: number;
  goalsSet: number;
  averageProgress: number;
}

interface TimelineStage {
  key: string;
  label: string;
  startDate?: Date;
  endDate?: Date;
  status: string;
}

interface Participants {
  employees: number;
  managers: number;
  locations: number;
}

@Injectable()
export class GoalPlansService {
  private readonly logger = new Logger(GoalPlansService.name);

  constructor(
    private readonly goalPlanRepository: GoalPlanRepository,
    private readonly goalRepository: GoalRepository,
  ) {}

  async listGoalPlans(
    organizationId: string,
    filters: Record<string, unknown>,
  ) {
    try {
      const plans = await this.goalPlanRepository.list(organizationId, filters);
      return AppResponse.success(
        'Goal plans retrieved successfully',
        200,
        plans,
      );
    } catch (error) {
      this.logger.error('GoalPlansService:listGoalPlans failed', error);
      throw error;
    }
  }

  async getGoalPlanDetails(
    organizationId: string,
    goalPlanId: string,
  ) {
    try {
      const plan = await this.goalPlanRepository.findById(goalPlanId);
      if (!plan || plan.organizationId !== organizationId) {
        throw new NotFoundException('Goal plan not found');
      }

      const goals = await this.goalRepository.findMany({
        organizationId,
        goalPlanId,
      });

      const progress = this.computeProgress(goals);
      const departmentProgress = this.computeDepartmentProgress(goals);
      const timeline = this.computeTimeline(plan);
      const participants = this.computeParticipants(goals);

      return AppResponse.success(
        'Goal plan details retrieved successfully',
        200,
        {
          plan,
          progress,
          departmentProgress,
          timeline,
          participants,
        },
      );
    } catch (error) {
      this.logger.error('GoalPlansService:getGoalPlanDetails failed', error);
      throw error;
    }
  }

  async updateGoalPlan(
    organizationId: string,
    goalPlanId: string,
    dto: GoalPlanDto,
  ) {
    try {
      const plan = await this.goalPlanRepository.findById(goalPlanId);
      if (!plan || plan.organizationId !== organizationId) {
        throw new NotFoundException('Goal plan not found');
      }

      const updated = await this.goalPlanRepository.updateById(goalPlanId, {
        name: dto.name,
        code: dto.code,
        goalType: dto.goalType,
        performanceYear: dto.performanceYear,
        description: dto.description ?? null,
        targetPopulation: dto.targetPopulation,
        departmentIds: dto.departmentIds ?? [],
        framework: dto.framework ?? [],
        approvalWorkflow: dto.approvalWorkflow ?? null,
        status: dto.status ?? plan.status,
      });

      return AppResponse.success(
        'Goal plan updated successfully',
        200,
        updated,
      );
    } catch (error) {
      this.logger.error('GoalPlansService:updateGoalPlan failed', error);
      throw error;
    }
  }

  async endGoalPlanCycle(
    organizationId: string,
    goalPlanId: string,
    dto: EndGoalPlanCycleDto,
  ) {
    try {
      const plan = await this.goalPlanRepository.findById(goalPlanId);
      if (!plan || plan.organizationId !== organizationId) {
        throw new NotFoundException('Goal plan not found');
      }

      const updated = await this.goalPlanRepository.updateById(goalPlanId, {
        status: GoalPlanStatus.ENDED,
        endDate: new Date(),
      });

      return AppResponse.success(
        'Goal plan cycle ended successfully',
        200,
        { goalPlanId, status: updated?.status, reason: dto.reason ?? null },
      );
    } catch (error) {
      this.logger.error('GoalPlansService:endGoalPlanCycle failed', error);
      throw error;
    }
  }

  private computeProgress(goals: any[]): ProgressMetrics {
    const total = goals.length;
    const completed = goals.filter((g) => g.status === 'completed').length;
    const approved = goals.filter(
      (g) => g.status === 'active' || g.status === 'completed',
    ).length;
    const cascaded = goals.filter((g) => Boolean(g.alignedDepartmentGoalId)).length;
    const progresses = goals.map((g) => g.progress ?? 0);
    const averageProgress =
      total > 0 ? Math.round((progresses.reduce((a, b) => a + b, 0) / total) * 10) / 10 : 0;
    const highestProgress = progresses.length
      ? Math.max(...progresses)
      : 0;
    const lowestProgress = progresses.length
      ? Math.min(...progresses)
      : 0;
    const cascadeRate = total > 0 ? Math.round((cascaded / total) * 100) : 0;
    const pendingApproval = goals.filter((g) => g.status === 'pending_approval').length;

    return {
      goalsSet: { completed, total },
      goalsApproved: { completed: approved, total },
      goalsCascaded: { completed: cascaded, total },
      averageProgress,
      highestProgress,
      lowestProgress,
      cascadeRate,
      pendingApproval,
    };
  }

  private computeDepartmentProgress(goals: any[]): DepartmentProgress[] {
    const byDept = new Map<string, DepartmentProgress & { progressSum: number; count: number }>();
    for (const g of goals) {
      if (!g.departmentId) continue;
      const existing = byDept.get(g.departmentId) ?? {
        departmentId: g.departmentId,
        departmentName: String(g.departmentId),
        employees: 0,
        goalsSet: 0,
        averageProgress: 0,
        progressSum: 0,
        count: 0,
      };
      existing.goalsSet += 1;
      existing.progressSum += g.progress ?? 0;
      existing.count += 1;
      byDept.set(g.departmentId, existing);
    }

    return Array.from(byDept.values()).map((d) => ({
      departmentId: d.departmentId,
      departmentName: d.departmentName,
      employees: d.employees,
      goalsSet: d.goalsSet,
      averageProgress: d.count
        ? Math.round((d.progressSum / d.count) * 10) / 10
        : 0,
    }));
  }

  private computeTimeline(plan: any): TimelineStage[] {
    const stages: TimelineStage[] = (plan.timelineStages ?? []).map(
      (s: any) => ({
        key: s.key,
        label: s.label,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status ?? 'pending',
      }),
    );

    if (stages.length === 0) {
      stages.push(
        { key: 'setup', label: 'Plan setup', status: 'completed' },
        { key: 'cascade', label: 'Goal cascading', status: 'in_progress' },
        { key: 'review', label: 'Review & approval', status: 'pending' },
        { key: 'evaluate', label: 'Evaluation', status: 'pending' },
        { key: 'close', label: 'Cycle close', status: 'pending' },
      );
    }

    return stages;
  }

  private computeParticipants(goals: any[]): Participants {
    const employees = new Set<string>();
    const managers = new Set<string>();
    for (const g of goals) {
      if (g.employeeId) employees.add(g.employeeId);
      // departmentId used as a proxy for manager scope when no explicit manager
      if (g.departmentId) managers.add(g.departmentId);
    }
    return {
      employees: employees.size,
      managers: managers.size,
      locations: 0,
    };
  }
}
