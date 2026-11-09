import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Express } from 'express';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { GoalRepository } from '../repositories/goal.repository';
import { GoalProgressRepository } from '../repositories/goal-progress.repository';
import { EmployeeRepository } from '../../../core_hr/employee/repository/employee.repository';
import { OrganizationDepartmentRepository } from '../../../core_hr/organization/repository/organization-department.repository';
import { CreateOrganisationGoalDto } from '../dto/create-organisation-goal.dto';
import { UpdateOrganisationGoalDto } from '../dto/update-organisation-goal.dto';
import { CreateDepartmentGoalDto } from '../dto/create-department-goal.dto';
import { UpdateDepartmentGoalDto } from '../dto/update-department-goal.dto';
import { CreateEmployeeGoalDto } from '../dto/create-employee-goal.dto';
import { UpdateEmployeeGoalDto } from '../dto/update-employee-goal.dto';
import { ListGoalsQueryDto } from '../dto/list-goals-query.dto';
import { BulkUploadGoalsDto } from '../dto/bulk-upload-goals.dto';
import { GoalProgressDto } from '../dto/goal-progress.dto';
import { GoalLevel, GoalStatus } from '../enums/goal.enums';
import { parseCsv } from '../util/csv-parser.util';

interface DepartmentSummary {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  headOfDepartment: { id: string | null; name: string | null } | null;
  noOfGoals: number;
  goalStatus: GoalStatus | null;
}

interface EmployeeSummary {
  employeeId: string;
  employeeCode: string | null;
  fullName: string;
  role: string | null;
  department: string | null;
  supervisor: string | null;
  noOfGoals: number;
  goalStatus: GoalStatus | null;
}

interface BulkRowResult {
  row: number;
  success: boolean;
  goalId?: string;
  error?: string;
}

@Injectable()
export class GoalSettingsService {
  private readonly logger = new Logger(GoalSettingsService.name);

  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly goalProgressRepository: GoalProgressRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
  ) {}

  /* ============ Organisation Goals ============ */

  async listCycles(organizationId: string) {
    try {
      return await this.goalRepository.findDistinctCycles(organizationId);
    } catch (error) {
      this.logger.error('GoalSettingsService:listCycles failed', error);
      throw error;
    }
  }

  async listOrganisationGoals(organizationId: string, dto: ListGoalsQueryDto) {
    try {
      const result = await this.goalRepository.paginatedList(
        dto,
        organizationId,
        GoalLevel.ORGANISATION,
      );
      return AppResponse.success('Organisation goals retrieved', 200, {
        items: result.items,
        meta: {
          total: result.total,
          batch: dto.batch ?? 1,
          limit: dto.limit ?? 10,
          totalPages: Math.ceil(result.total / (dto.limit ?? 10)),
        },
      });
    } catch (error) {
      this.logger.error(
        'GoalSettingsService:listOrganisationGoals failed',
        error,
      );
      throw error;
    }
  }

  async createOrganisationGoal(
    organizationId: string,
    user: ICurrentUser,
    dto: CreateOrganisationGoalDto,
  ) {
    try {
      const goal = await this.goalRepository.create({
        organizationId,
        cycleId: dto.cycleId,
        level: GoalLevel.ORGANISATION,
        departmentId: null,
        employeeId: null,
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
        alignedOrganisationGoalId: null,
        alignedDepartmentGoalId: null,
        createdBy: user.userId,
        updatedBy: user.userId,
      });

      return AppResponse.success('Organisation goal created', 201, goal);
    } catch (error) {
      this.logger.error(
        'GoalSettingsService:createOrganisationGoal failed',
        error,
      );
      throw error;
    }
  }

  async getOrganisationGoal(organizationId: string, goalId: string) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
        level: GoalLevel.ORGANISATION,
      });
      if (!goal) {
        throw new NotFoundException('Organisation goal not found');
      }
      return AppResponse.success('Organisation goal retrieved', 200, goal);
    } catch (error) {
      this.logger.error(
        'GoalSettingsService:getOrganisationGoal failed',
        error,
      );
      throw error;
    }
  }

  async updateOrganisationGoal(
    organizationId: string,
    user: ICurrentUser,
    goalId: string,
    dto: UpdateOrganisationGoalDto,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
        level: GoalLevel.ORGANISATION,
      });
      if (!goal) {
        throw new NotFoundException('Organisation goal not found');
      }

      const updateData: Record<string, unknown> = {};
      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      if (dto.keyMeasures !== undefined)
        updateData.keyMeasures = dto.keyMeasures;
      if (dto.kpiMetricId !== undefined)
        updateData.kpiMetricId = dto.kpiMetricId;
      if (dto.kpiMetric !== undefined) updateData.kpiMetric = dto.kpiMetric;
      if (dto.kpiType !== undefined) updateData.kpiType = dto.kpiType;
      if (dto.target !== undefined) updateData.target = dto.target;
      if (dto.targetUnit !== undefined) updateData.targetUnit = dto.targetUnit;
      if (dto.weightage !== undefined) updateData.weightage = dto.weightage;
      if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
      if (dto.perspective !== undefined)
        updateData.perspective = dto.perspective;
      updateData.updatedBy = user.userId;

      const updated = await this.goalRepository.updateById(goalId, updateData);
      return AppResponse.success('Organisation goal updated', 200, updated);
    } catch (error) {
      this.logger.error(
        'GoalSettingsService:updateOrganisationGoal failed',
        error,
      );
      throw error;
    }
  }

  async removeOrganisationGoal(organizationId: string, goalId: string) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
        level: GoalLevel.ORGANISATION,
      });
      if (!goal) {
        throw new NotFoundException('Organisation goal not found');
      }

      const alignedCount = await this.goalRepository.countAlignedGoals(
        organizationId,
        goalId,
      );
      if (alignedCount > 0) {
        throw new BadRequestException(
          'Cannot remove goal: department goals are aligned to it.',
        );
      }

      await this.goalRepository.deleteById(goalId);
      return AppResponse.success('Organisation goal removed', 200, { goalId });
    } catch (error) {
      this.logger.error(
        'GoalSettingsService:removeOrganisationGoal failed',
        error,
      );
      throw error;
    }
  }

  /* ============ Department Goals ============ */

  async listDepartments(organizationId: string, search?: string) {
    try {
      const departments =
        await this.organizationDepartmentRepository.findByOrganization(
          organizationId,
          '',
          search ?? '',
        );

      const summaries: DepartmentSummary[] = [];
      for (const dept of departments) {
        const goals = await this.goalRepository.paginatedList(
          { cycleId: '', limit: 1, batch: 1 } as ListGoalsQueryDto,
          organizationId,
          GoalLevel.DEPARTMENT,
          dept._id?.toString(),
        );
        summaries.push({
          departmentId: dept._id?.toString() ?? '',
          departmentName: dept.name,
          departmentCode: dept.code,
          headOfDepartment: {
            id: dept.headOfDepartmentId ?? null,
            name: null,
          },
          noOfGoals: goals.total,
          goalStatus: goals.total > 0 ? GoalStatus.ACTIVE : null,
        });
      }

      return AppResponse.success('Departments retrieved', 200, summaries);
    } catch (error) {
      this.logger.error('GoalSettingsService:listDepartments failed', error);
      throw error;
    }
  }

  async listDepartmentGoals(
    organizationId: string,
    departmentId: string,
    dto: ListGoalsQueryDto,
  ) {
    try {
      const result = await this.goalRepository.paginatedList(
        dto,
        organizationId,
        GoalLevel.DEPARTMENT,
        departmentId,
      );
      return AppResponse.success('Department goals retrieved', 200, {
        items: result.items,
        meta: {
          total: result.total,
          batch: dto.batch ?? 1,
          limit: dto.limit ?? 10,
          totalPages: Math.ceil(result.total / (dto.limit ?? 10)),
        },
      });
    } catch (error) {
      this.logger.error(
        'GoalSettingsService:listDepartmentGoals failed',
        error,
      );
      throw error;
    }
  }

  async createDepartmentGoal(
    organizationId: string,
    user: ICurrentUser,
    departmentId: string,
    dto: CreateDepartmentGoalDto,
  ) {
    try {
      const goal = await this.goalRepository.create({
        organizationId,
        cycleId: dto.cycleId,
        level: GoalLevel.DEPARTMENT,
        departmentId,
        employeeId: null,
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
        alignedDepartmentGoalId: null,
        createdBy: user.userId,
        updatedBy: user.userId,
      });

      return AppResponse.success('Department goal created', 201, goal);
    } catch (error) {
      this.logger.error(
        'GoalSettingsService:createDepartmentGoal failed',
        error,
      );
      throw error;
    }
  }

  async getDepartmentGoal(
    organizationId: string,
    departmentId: string,
    goalId: string,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
        level: GoalLevel.DEPARTMENT,
        departmentId,
      });
      if (!goal) {
        throw new NotFoundException('Department goal not found');
      }
      return AppResponse.success('Department goal retrieved', 200, goal);
    } catch (error) {
      this.logger.error('GoalSettingsService:getDepartmentGoal failed', error);
      throw error;
    }
  }

  async updateDepartmentGoal(
    organizationId: string,
    user: ICurrentUser,
    departmentId: string,
    goalId: string,
    dto: UpdateDepartmentGoalDto,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
        level: GoalLevel.DEPARTMENT,
        departmentId,
      });
      if (!goal) {
        throw new NotFoundException('Department goal not found');
      }

      const updateData: Record<string, unknown> = {};
      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      if (dto.keyMeasures !== undefined)
        updateData.keyMeasures = dto.keyMeasures;
      if (dto.kpiMetricId !== undefined)
        updateData.kpiMetricId = dto.kpiMetricId;
      if (dto.kpiMetric !== undefined) updateData.kpiMetric = dto.kpiMetric;
      if (dto.kpiType !== undefined) updateData.kpiType = dto.kpiType;
      if (dto.target !== undefined) updateData.target = dto.target;
      if (dto.targetUnit !== undefined) updateData.targetUnit = dto.targetUnit;
      if (dto.weightage !== undefined) updateData.weightage = dto.weightage;
      if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
      if (dto.perspective !== undefined)
        updateData.perspective = dto.perspective;
      updateData.updatedBy = user.userId;

      const updated = await this.goalRepository.updateById(goalId, updateData);
      return AppResponse.success('Department goal updated', 200, updated);
    } catch (error) {
      this.logger.error(
        'GoalSettingsService:updateDepartmentGoal failed',
        error,
      );
      throw error;
    }
  }

  async removeDepartmentGoal(
    organizationId: string,
    departmentId: string,
    goalId: string,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
        level: GoalLevel.DEPARTMENT,
        departmentId,
      });
      if (!goal) {
        throw new NotFoundException('Department goal not found');
      }

      const alignedCount = await this.goalRepository.countAlignedGoals(
        organizationId,
        goalId,
      );
      if (alignedCount > 0) {
        throw new BadRequestException(
          'Cannot remove goal: employee goals are aligned to it.',
        );
      }

      await this.goalRepository.deleteById(goalId);
      return AppResponse.success('Department goal removed', 200, { goalId });
    } catch (error) {
      this.logger.error(
        'GoalSettingsService:removeDepartmentGoal failed',
        error,
      );
      throw error;
    }
  }

  /* ============ Employee Goals ============ */

  async listEmployees(
    organizationId: string,
    search?: string,
    departmentId?: string,
  ) {
    try {
      const employees =
        await this.employeeRepository.findByOrganization(organizationId);

      const summaries: EmployeeSummary[] = [];
      for (const emp of employees) {
        if (departmentId && emp.departmentCode !== departmentId) {
          continue;
        }
        if (search) {
          const term = search.toLowerCase();
          const name = [emp.firstName, emp.middleName, emp.lastName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (
            !name.includes(term) &&
            !emp.employeeId?.toLowerCase().includes(term) &&
            !emp.email?.toLowerCase().includes(term)
          ) {
            continue;
          }
        }

        const goals = await this.goalRepository.paginatedList(
          { cycleId: '', limit: 1, batch: 1 } as ListGoalsQueryDto,
          organizationId,
          GoalLevel.EMPLOYEE,
          emp.departmentCode ?? undefined,
          emp._id?.toString(),
        );
        summaries.push({
          employeeId: emp._id?.toString() ?? '',
          employeeCode: emp.employeeId ?? null,
          fullName: [emp.firstName, emp.middleName, emp.lastName]
            .filter(Boolean)
            .join(' '),
          role: emp.jobTitleCode ?? null,
          department: emp.departmentCode ?? null,
          supervisor: emp.supervisor ?? null,
          noOfGoals: goals.total,
          goalStatus: goals.total > 0 ? GoalStatus.ACTIVE : null,
        });
      }

      return AppResponse.success('Employees retrieved', 200, summaries);
    } catch (error) {
      this.logger.error('GoalSettingsService:listEmployees failed', error);
      throw error;
    }
  }

  async listEmployeeGoals(
    organizationId: string,
    employeeId: string,
    dto: ListGoalsQueryDto,
  ) {
    try {
      const result = await this.goalRepository.paginatedList(
        dto,
        organizationId,
        GoalLevel.EMPLOYEE,
        undefined,
        employeeId,
      );
      return AppResponse.success('Employee goals retrieved', 200, {
        items: result.items,
        meta: {
          total: result.total,
          batch: dto.batch ?? 1,
          limit: dto.limit ?? 10,
          totalPages: Math.ceil(result.total / (dto.limit ?? 10)),
        },
      });
    } catch (error) {
      this.logger.error('GoalSettingsService:listEmployeeGoals failed', error);
      throw error;
    }
  }

  async createEmployeeGoal(
    organizationId: string,
    user: ICurrentUser,
    employeeId: string,
    dto: CreateEmployeeGoalDto,
  ) {
    try {
      const goal = await this.goalRepository.create({
        organizationId,
        cycleId: dto.cycleId,
        level: GoalLevel.EMPLOYEE,
        departmentId: dto.departmentId,
        employeeId,
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
        alignedOrganisationGoalId: null,
        alignedDepartmentGoalId: dto.alignedDepartmentGoalId ?? null,
        createdBy: user.userId,
        updatedBy: user.userId,
      });

      return AppResponse.success('Employee goal created', 201, goal);
    } catch (error) {
      this.logger.error('GoalSettingsService:createEmployeeGoal failed', error);
      throw error;
    }
  }

  async getEmployeeGoal(
    organizationId: string,
    employeeId: string,
    goalId: string,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
        level: GoalLevel.EMPLOYEE,
        employeeId,
      });
      if (!goal) {
        throw new NotFoundException('Employee goal not found');
      }
      return AppResponse.success('Employee goal retrieved', 200, goal);
    } catch (error) {
      this.logger.error('GoalSettingsService:getEmployeeGoal failed', error);
      throw error;
    }
  }

  async updateEmployeeGoal(
    organizationId: string,
    user: ICurrentUser,
    employeeId: string,
    goalId: string,
    dto: UpdateEmployeeGoalDto,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
        level: GoalLevel.EMPLOYEE,
        employeeId,
      });
      if (!goal) {
        throw new NotFoundException('Employee goal not found');
      }

      const updateData: Record<string, unknown> = {};
      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      if (dto.keyMeasures !== undefined)
        updateData.keyMeasures = dto.keyMeasures;
      if (dto.kpiMetricId !== undefined)
        updateData.kpiMetricId = dto.kpiMetricId;
      if (dto.kpiMetric !== undefined) updateData.kpiMetric = dto.kpiMetric;
      if (dto.kpiType !== undefined) updateData.kpiType = dto.kpiType;
      if (dto.target !== undefined) updateData.target = dto.target;
      if (dto.targetUnit !== undefined) updateData.targetUnit = dto.targetUnit;
      if (dto.weightage !== undefined) updateData.weightage = dto.weightage;
      if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
      if (dto.perspective !== undefined)
        updateData.perspective = dto.perspective;
      updateData.updatedBy = user.userId;

      const updated = await this.goalRepository.updateById(goalId, updateData);
      return AppResponse.success('Employee goal updated', 200, updated);
    } catch (error) {
      this.logger.error('GoalSettingsService:updateEmployeeGoal failed', error);
      throw error;
    }
  }

  async removeEmployeeGoal(
    organizationId: string,
    employeeId: string,
    goalId: string,
  ) {
    try {
      const goal = await this.goalRepository.findOne({
        _id: goalId,
        organizationId,
        level: GoalLevel.EMPLOYEE,
        employeeId,
      });
      if (!goal) {
        throw new NotFoundException('Employee goal not found');
      }

      await this.goalRepository.deleteById(goalId);
      return AppResponse.success('Employee goal removed', 200, { goalId });
    } catch (error) {
      this.logger.error('GoalSettingsService:removeEmployeeGoal failed', error);
      throw error;
    }
  }

  /* ============ Bulk Upload ============ */

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
        const rowNumber = i + 2;
        try {
          const level =
            row.level &&
            Object.values(GoalLevel).includes(row.level as GoalLevel)
              ? (row.level as GoalLevel)
              : dto.level;
          const cycleId = row.cycle_id ?? dto.cycleId;

          let resolvedDepartmentId: string | null | undefined =
            dto.departmentId;
          if (!resolvedDepartmentId && row.department_code) {
            const dept = await this.organizationDepartmentRepository.findByCode(
              organizationId,
              row.department_code,
            );
            resolvedDepartmentId = dept?._id?.toString() ?? null;
          }

          let resolvedEmployeeId: string | null | undefined = dto.employeeId;
          if (!resolvedEmployeeId && row.employee_id) {
            const emp = await this.employeeRepository.findByEmployeeId(
              row.employee_id,
            );
            resolvedEmployeeId = emp?._id?.toString() ?? null;
          }

          const goalData: Record<string, unknown> = {
            organizationId,
            cycleId,
            level,
            departmentId: resolvedDepartmentId ?? null,
            employeeId: resolvedEmployeeId ?? null,
            perspective: this.requireField(
              row.perspective,
              'perspective',
              rowNumber,
            ),
            title: this.requireField(row.goal_title, 'goal_title', rowNumber),
            description: row.description ?? null,
            keyMeasures: row.key_measures ?? null,
            kpiMetricId: null,
            kpiMetric: row.kpi_metric ?? null,
            kpiType: row.kpi_type ?? null,
            target: this.requireField(row.target, 'target', rowNumber),
            targetUnit: row.target_unit ?? null,
            weightage: Number(row.weightage ?? 0),
            frequency: row.frequency ?? null,
            alignedOrganisationGoalId: row.aligned_organisation_goal ?? null,
            alignedDepartmentGoalId: row.aligned_department_goal ?? null,
            createdBy: user.userId,
            updatedBy: user.userId,
          };

          this.validateLevelScope(level, goalData);

          const created = await this.goalRepository.create(
            goalData as Partial<import('../schemas/goal.schema').Goal>,
          );
          inserted++;
          results.push({
            row: rowNumber,
            success: true,
            goalId: created._id.toString(),
          });
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
      this.logger.error('GoalSettingsService:bulkUploadGoals failed', error);
      throw error;
    }
  }

  /* ============ Progress ============ */

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

      return AppResponse.success('Goal progress updated', 200, {
        goalId,
        progress: dto.progress,
      });
    } catch (error) {
      this.logger.error('GoalSettingsService:updateGoalProgress failed', error);
      throw error;
    }
  }

  async getGoalProgressHistory(organizationId: string, goalId: string) {
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
        'Goal progress history retrieved',
        200,
        history,
      );
    } catch (error) {
      this.logger.error(
        'GoalSettingsService:getGoalProgressHistory failed',
        error,
      );
      throw error;
    }
  }

  /* ============ Helpers ============ */

  private validateLevelScope(level: GoalLevel, data: Record<string, unknown>) {
    const errors: string[] = [];

    if (level === GoalLevel.DEPARTMENT) {
      if (!data.departmentId) {
        errors.push('departmentId is required for department goals.');
      }
    }

    if (level === GoalLevel.EMPLOYEE) {
      if (!data.departmentId) {
        errors.push('departmentId is required for employee goals.');
      }
      if (!data.employeeId) {
        errors.push('employeeId is required for employee goals.');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join(' '));
    }
  }

  private requireField(value: unknown, field: string, row: number): string {
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error(`Row ${row}: ${field} is required.`);
    }
    return String(value).trim();
  }
}
