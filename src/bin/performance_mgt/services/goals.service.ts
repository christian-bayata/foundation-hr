import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Express } from 'express';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { AppResponse } from '../../../common/response/app-response';
import { GoalRepository } from '../repository/goal.repository';
import { GoalProgressRepository } from '../repository/goal-progress.repository';
import { EmployeeRepository } from '../../core_hr/employee/repository/employee.repository';
import {
  OrganizationDepartmentRepository,
} from '../../core_hr/organization/repository/organization-department.repository';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { UpdateGoalDto } from '../dto/update-goal.dto';
import { ListGoalsQueryDto } from '../dto/list-goals-query.dto';
import { BulkUploadGoalsDto } from '../dto/bulk-upload-goals.dto';
import { GoalProgressDto } from '../dto/goal-progress.dto';
import {
  GoalLevel,
  GoalPerspective,
} from '../enums/goal.enums';
import { parseCsv } from '../util/csv-parser.util';

interface BulkRowResult {
  row: number;
  success: boolean;
  goalId?: string;
  error?: string;
}

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly goalProgressRepository: GoalProgressRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
  ) {}

  async createGoal(
    organizationId: string,
    user: ICurrentUser,
    dto: CreateGoalDto,
  ) {
    try {
      this.validateLevelScope(organizationId, dto, user);

      const goal = await this.goalRepository.create({
        organizationId,
        cycleId: dto.cycleId,
        goalPlanId: dto.goalPlanId ?? null,
        level: dto.level,
        departmentId: dto.departmentId ?? null,
        employeeId: dto.employeeId ?? null,
        perspective: dto.perspective,
        title: dto.title,
        description: dto.description ?? null,
        keyMeasures: dto.keyMeasures ?? null,
        kpiMetricId: dto.kpiMetricId ?? null,
        kpiMetric: dto.kpiMetric ?? null,
        kpiType: dto.kpiType ?? null,
        target: dto.target,
        targetUnit: dto.targetUnit ?? null,
        weightage: dto.weightage,
        frequency: dto.frequency,
        alignedOrganisationGoalId: dto.alignedOrganisationGoalId ?? null,
        alignedDepartmentGoalId: dto.alignedDepartmentGoalId ?? null,
        createdBy: user.userId,
        updatedBy: user.userId,
      });

      return AppResponse.success('Goal created successfully', 201, goal);
    } catch (error) {
      this.logger.error('GoalsService:createGoal failed', error);
      throw error;
    }
  }

  async listGoals(
    organizationId: string,
    dto: ListGoalsQueryDto,
  ) {
    try {
      const result = await this.goalRepository.paginatedList(
        dto,
        organizationId,
      );

      const weightageSummary = await this.goalRepository
        .sumWeightageByLevel(
          organizationId,
          dto.cycleId,
          dto.level,
          dto.departmentId,
          dto.employeeId,
        );

      return AppResponse.success('Goals retrieved successfully', 200, {
        items: result.items,
        meta: {
          total: result.total,
          batch: dto.batch ?? 1,
          limit: dto.limit ?? 10,
          totalPages: Math.ceil(result.total / (dto.limit ?? 10)),
        },
        weightageSummary,
      });
    } catch (error) {
      this.logger.error('GoalsService:listGoals failed', error);
      throw error;
    }
  }

  async getGoal(
    organizationId: string,
    goalId: string,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
      });
      if (!goal) {
        throw new NotFoundException('Goal not found');
      }
      return AppResponse.success('Goal retrieved successfully', 200, goal);
    } catch (error) {
      this.logger.error('GoalsService:getGoal failed', error);
      throw error;
    }
  }

  async updateGoal(
    organizationId: string,
    user: ICurrentUser,
    goalId: string,
    dto: UpdateGoalDto,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
      });
      if (!goal) {
        throw new NotFoundException('Goal not found');
      }

      const updateData: Record<string, unknown> = {};
      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.keyMeasures !== undefined) updateData.keyMeasures = dto.keyMeasures;
      if (dto.kpiMetricId !== undefined) updateData.kpiMetricId = dto.kpiMetricId;
      if (dto.kpiMetric !== undefined) updateData.kpiMetric = dto.kpiMetric;
      if (dto.kpiType !== undefined) updateData.kpiType = dto.kpiType;
      if (dto.target !== undefined) updateData.target = dto.target;
      if (dto.targetUnit !== undefined) updateData.targetUnit = dto.targetUnit;
      if (dto.weightage !== undefined) updateData.weightage = dto.weightage;
      if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
      if (dto.perspective !== undefined) updateData.perspective = dto.perspective;
      updateData.updatedBy = user.userId;

      const updated = await this.goalRepository.updateById(goalId, updateData);
      return AppResponse.success('Goal updated successfully', 200, updated);
    } catch (error) {
      this.logger.error('GoalsService:updateGoal failed', error);
      throw error;
    }
  }

  async removeGoal(
    organizationId: string,
    goalId: string,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
      });
      if (!goal) {
        throw new NotFoundException('Goal not found');
      }

      const alignedCount = await this.goalRepository.countAlignedGoals(
        organizationId,
        goalId,
      );
      if (alignedCount > 0) {
        throw new BadRequestException(
          'Cannot remove goal: other goals are aligned to it.',
        );
      }

      await this.goalRepository.deleteById(goalId);
      return AppResponse.success('Goal removed successfully', 200, {
        goalId,
      });
    } catch (error) {
      this.logger.error('GoalsService:removeGoal failed', error);
      throw error;
    }
  }

  async bulkUploadGoals(
    organizationId: string,
    user: ICurrentUser,
    dto: BulkUploadGoalsDto,
    file: Express.Multer.File,
  ) {
    try {
      const csv = file.buffer.toString('utf-8');
      const rows = parseCsv(csv);
      if (rows.length === 0) {
        throw new BadRequestException('CSV file is empty.');
      }

      const results: BulkRowResult[] = [];
      let inserted = 0;
      let failed = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // account for header
        try {
          const level =
            (row.level &&
              Object.values(GoalLevel).includes(row.level as GoalLevel))
              ? (row.level as GoalLevel)
              : dto.level;
          const cycleId = row.cycle_id ?? dto.cycleId;

          const departmentId =
            dto.departmentId ??
            (row.department_code
              ? await this.resolveDepartmentId(organizationId, row.department_code)
              : null);
          const employeeId =
            dto.employeeId ??
            (row.employee_id
              ? await this.resolveEmployeeId(organizationId, row.employee_id)
              : null);

          const goalDto: CreateGoalDto = {
            cycleId,
            level: level as GoalLevel,
            perspective: this.requireField(
              row.perspective,
              'perspective',
              rowNumber,
            ) as GoalPerspective,
            title: this.requireField(row.goal_title, 'goal_title', rowNumber),
            description: row.description ?? null,
            keyMeasures: row.key_measures ?? null,
            kpiMetric: row.kpi_metric ?? null,
            kpiType: row.kpi_type
              ? (row.kpi_type as any)
              : null,
            target: this.requireField(row.target, 'target', rowNumber),
            targetUnit: row.target_unit ?? null,
            weightage: Number(row.weightage ?? 0),
            frequency: row.frequency
              ? (row.frequency as any)
              : null,
            departmentId: departmentId ?? undefined,
            employeeId: employeeId ?? undefined,
            alignedOrganisationGoalId:
              row.aligned_organisation_goal ?? undefined,
            alignedDepartmentGoalId: row.aligned_department_goal ?? undefined,
          };

          this.validateLevelScope(organizationId, goalDto, user);

          const created = await this.goalRepository.create({
            organizationId,
            cycleId: goalDto.cycleId,
            goalPlanId: dto.goalPlanId ?? null,
            level: goalDto.level,
            departmentId: goalDto.departmentId ?? null,
            employeeId: goalDto.employeeId ?? null,
            perspective: goalDto.perspective,
            title: goalDto.title,
            description: goalDto.description,
            keyMeasures: goalDto.keyMeasures,
            kpiMetricId: null,
            kpiMetric: goalDto.kpiMetric,
            kpiType: goalDto.kpiType as any,
            target: goalDto.target,
            targetUnit: goalDto.targetUnit,
            weightage: goalDto.weightage,
            frequency: goalDto.frequency,
            alignedOrganisationGoalId: goalDto.alignedOrganisationGoalId,
            alignedDepartmentGoalId: goalDto.alignedDepartmentGoalId,
            createdBy: user.userId,
            updatedBy: user.userId,
          });

          inserted++;
          results.push({ row: rowNumber, success: true, goalId: created._id.toString() });
        } catch (error) {
          failed++;
          results.push({
            row: rowNumber,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return AppResponse.success('Bulk upload completed', 200, {
        inserted,
        failed,
        total: rows.length,
        results,
      });
    } catch (error) {
      this.logger.error('GoalsService:bulkUploadGoals failed', error);
      throw error;
    }
  }

  async updateGoalProgress(
    organizationId: string,
    goalId: string,
    dto: GoalProgressDto,
    user: ICurrentUser,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
      });
      if (!goal) {
        throw new NotFoundException('Goal not found');
      }

      await this.goalRepository.updateById(goalId, {
        progress: dto.progress,
        progressUpdatedAt: new Date(),
        updatedBy: user.userId,
      });

      await this.goalProgressRepository.create({
        goalId,
        organizationId,
        progress: dto.progress,
        note: dto.note ?? null,
        attachments: dto.attachments ?? [],
        createdBy: user.userId,
      });

      return AppResponse.success('Goal progress updated successfully', 200, {
        goalId,
        progress: dto.progress,
      });
    } catch (error) {
      this.logger.error('GoalsService:updateGoalProgress failed', error);
      throw error;
    }
  }

  async getGoalProgressHistory(
    organizationId: string,
    goalId: string,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
      });
      if (!goal) {
        throw new NotFoundException('Goal not found');
      }

      const history = await this.goalProgressRepository.findByGoal(
        goalId,
        organizationId,
      );
      return AppResponse.success(
        'Goal progress history retrieved successfully',
        200,
        history,
      );
    } catch (error) {
      this.logger.error('GoalsService:getGoalProgressHistory failed', error);
      throw error;
    }
  }

  private validateLevelScope(
    organizationId: string,
    dto: CreateGoalDto,
    _user: ICurrentUser,
  ) {
    const errors: string[] = [];

    if (dto.level === GoalLevel.DEPARTMENT) {
      if (!dto.departmentId) {
        errors.push('departmentId is required for department goals.');
      }
      if (!dto.alignedOrganisationGoalId) {
        errors.push(
          'alignedOrganisationGoalId is required for department goals.',
        );
      }
    }

    if (dto.level === GoalLevel.EMPLOYEE) {
      if (!dto.departmentId) {
        errors.push('departmentId is required for employee goals.');
      }
      if (!dto.employeeId) {
        errors.push('employeeId is required for employee goals.');
      }
      if (!dto.alignedDepartmentGoalId) {
        errors.push(
          'alignedDepartmentGoalId is required for employee goals.',
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join(' '));
    }
  }

  private requireField(
    value: unknown,
    field: string,
    row: number,
  ): string {
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error(`Row ${row}: ${field} is required.`);
    }
    return String(value).trim();
  }

  private async resolveDepartmentId(
    organizationId: string,
    code: string,
  ): Promise<string | null> {
    try {
      const dept =
        await this.organizationDepartmentRepository.findByCode(
          organizationId,
          code,
        );
      return dept?._id?.toString() ?? null;
    } catch {
      return null;
    }
  }

  private async resolveEmployeeId(
    organizationId: string,
    employeeId: string,
  ): Promise<string | null> {
    try {
      const employee = await this.employeeRepository.findByEmployeeId(
        employeeId,
      );
      return employee?._id?.toString() ?? null;
    } catch {
      return null;
    }
  }
}
