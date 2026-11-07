import { Injectable, Logger } from '@nestjs/common';
import { GoalRepository } from '../repository/goal.repository';
import { OrganizationDepartmentRepository } from '../../core_hr/organization/repository/organization-department.repository';
import { EmployeeRepository } from '../../core_hr/employee/repository/employee.repository';
import { OrganizationRepository } from '../../core_hr/organization/repository/organization.repository';
import { GoalLevel } from '../enums/goal.enums';

interface CycleInfo {
  id: string;
  label: string;
}

interface TabCounts {
  organisation: number;
  department: number;
  employee: number;
}

@Injectable()
export class GoalSettingsService {
  private readonly logger = new Logger(GoalSettingsService.name);

  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async getContext(
    organizationId: string,
    cycleId?: string,
  ): Promise<{
    cycles: CycleInfo[];
    activeCycle: string | null;
    tabCounts: TabCounts;
  }> {
    try {
      const cycles = await this.getCycles(organizationId);
      const activeCycle = cycleId ?? (cycles[0]?.id ?? null);

      const tabCounts = await this.getTabCounts(
        organizationId,
        activeCycle ?? '',
      );

      return { cycles, activeCycle, tabCounts };
    } catch (error) {
      this.logger.error('GoalSettingsService:getContext failed', error);
      throw error;
    }
  }

  async getCycles(organizationId: string): Promise<CycleInfo[]> {
    try {
      const distinct = await this.goalRepository
        // Model is not exposed; use distinct via repository method below instead
        .findDistinctCycles(organizationId);
      return distinct.map((id) => ({ id, label: id }));
    } catch (error) {
      throw error;
    }
  }

  async getTabCounts(
    organizationId: string,
    cycleId: string,
  ): Promise<TabCounts> {
    try {
      const [organisation, department, employee] = await Promise.all([
        this.goalRepository.countByLevel(
          organizationId,
          cycleId,
          GoalLevel.ORGANISATION,
        ),
        this.goalRepository.countByLevel(
          organizationId,
          cycleId,
          GoalLevel.DEPARTMENT,
        ),
        this.goalRepository.countByLevel(
          organizationId,
          cycleId,
          GoalLevel.EMPLOYEE,
        ),
      ]);
      return { organisation, department, employee };
    } catch (error) {
      throw error;
    }
  }

  async getDepartments(
    organizationId: string,
    search?: string,
  ) {
    try {
      return await this.organizationDepartmentRepository.findByOrganization(
        organizationId,
        '',
        search ?? '',
      );
    } catch (error) {
      this.logger.error('GoalSettingsService:getDepartments failed', error);
      throw error;
    }
  }

  async getEmployees(
    organizationId: string,
    search?: string,
    departmentId?: string,
  ) {
    try {
      const employees = await this.employeeRepository.findByOrganization(
        organizationId,
      );
      return employees.filter((employee) => {
        if (departmentId && employee.departmentCode !== departmentId) {
          return false;
        }
        if (!search) return true;
        const term = search.toLowerCase();
        const name = [
          employee.firstName,
          employee.middleName,
          employee.lastName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return (
          name.includes(term) ||
          employee.employeeId?.toLowerCase().includes(term) ||
          employee.email?.toLowerCase().includes(term)
        );
      });
    } catch (error) {
      this.logger.error('GoalSettingsService:getEmployees failed', error);
      throw error;
    }
  }

  async getObjectives(
    organizationId: string,
    level: GoalLevel,
    departmentId?: string,
    cycleId?: string,
  ) {
    try {
      const filter: Record<string, unknown> = {
        organizationId,
        ...(cycleId && { cycleId }),
      };

      if (level === GoalLevel.DEPARTMENT) {
        // Organisation goals are alignment targets for department goals
        filter.level = GoalLevel.ORGANISATION;
      } else if (level === GoalLevel.EMPLOYEE) {
        // Department goals are alignment targets for employee goals
        filter.level = GoalLevel.DEPARTMENT;
        if (departmentId) {
          filter.departmentId = departmentId;
        }
      } else {
        return [];
      }

      return await this.goalRepository.findObjectives(filter);
    } catch (error) {
      this.logger.error('GoalSettingsService:getObjectives failed', error);
      throw error;
    }
  }
}
