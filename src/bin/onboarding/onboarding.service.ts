import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { AppResponse } from '../../common/response/app-response';
import { DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS } from '../setting/domain/settings.domain.organisation.service';
import {
  AddEmployeeOnboardingDto,
  ListEmployeeOnboardingQueryDto,
  RetrieveEmployeeOnboardingDto,
  UpdateEmployeeOnboardingStepDto,
} from './dto/employee-onboarding.dto';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { EmployeeOnboardingStep } from '../employee/entity/employee.schema';
import { JobTitleRepository } from '../organization/repository/job-title.repository';
import { DueDate } from '../setting/employee-profiles/enum/employee-profile.enum';
import { OnboardingStatus } from './enum/onboarding-status.enum';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(JobTitleRepository)
    private readonly jobTitleRepository: JobTitleRepository,
  ) {}

  /**
   * @Responsibility: Initialize onboarding tracking for a new employee.
   * Seeds the record with the two required system steps ("Adding and inviting
   * new employee" and "Self-enrolment") plus any custom org steps from the
   * default workflow settings. All completion requirements start as incomplete.
   *
   * @param organizationId - The organization to scope the employee to
   * @param dto - The employee ID to initialize onboarding for
   *
   * @throws {404} Employee not found
   */
  async addEmployeeOnboarding(
    organizationId: string,
    dto: AddEmployeeOnboardingDto,
  ) {
    try {
      const employee =
        (await this.employeeRepository.findById(dto.employeeId)) ??
        AppResponse.error({
          message: 'Employee not found',
          status: HttpStatus.NOT_FOUND,
        });

      if (employee!.organizationId !== organizationId) {
        AppResponse.error({
          message: 'Employee does not belong to this organization',
          status: HttpStatus.FORBIDDEN,
        });
      }

      const defaultSteps = DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS.onboarding ?? [];

      const onboardingSteps = defaultSteps.map((step) => ({
        stepId: String(step._id),
        stepName: step.stepName,
        dueDate: null,
        isCompleted: false,
        completionRequirements: (step.completionRequirements ?? []).map(
          (req) => ({
            step: req.step,
            isCompleted: false,
          }),
        ),
      }));

      employee!.employeeOnboardingSteps = onboardingSteps;

      await this.employeeRepository.updateById(dto.employeeId, {
        employeeOnboardingSteps: onboardingSteps,
      });

      this.logger.log(
        `Initialized onboarding for employee ${dto.employeeId} in org ${organizationId}`,
      );

      return {
        employeeId: dto.employeeId,
        steps: onboardingSteps,
        overallProgress: 0,
      };
    } catch (error: any) {
      error.location = `OnboardingService.${this.addEmployeeOnboarding.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve an employee's onboarding progress.
   * Returns each step with its completion status, due date, and completion
   * requirements, plus an overall progress percentage.
   *
   * @param organizationId - The organization to scope the employee to
   * @param dto - The employee ID to retrieve onboarding for
   *
   * @throws {404} Employee not found
   */
  async getEmployeeOnboarding(
    organizationId: string,
    dto: RetrieveEmployeeOnboardingDto,
  ) {
    try {
      const employee =
        (await this.employeeRepository.findById(dto.employeeId)) ??
        AppResponse.error({
          message: 'Employee not found',
          status: HttpStatus.NOT_FOUND,
        });

      if (employee!.organizationId !== organizationId) {
        AppResponse.error({
          message: 'Employee does not belong to this organization',
          status: HttpStatus.FORBIDDEN,
        });
      }

      const steps = (employee!.employeeOnboardingSteps ?? []).map((step) =>
        this.toEmployeeOnboardingStepView(step),
      );
      const totalSteps = steps.length;
      const completedSteps = steps.filter((s) => s.isCompleted).length;
      const overallProgress =
        totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

      return {
        employeeId: dto.employeeId,
        steps,
        overallProgress,
        completedSteps,
        totalSteps,
      };
    } catch (error: any) {
      error.location = `OnboardingService.${this.getEmployeeOnboarding.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update a specific onboarding step's completion status
   * for an employee. If all completion requirements for a step are marked
   * complete, the step itself is auto-completed.
   *
   * @param organizationId - The organization to scope the employee to
   * @param employeeId - The employee to update
   * @param stepId - The step ID to update
   * @param dto - The completion status, due date, and requirements
   *
   * @throws {404} Employee or step not found
   */
  async updateEmployeeOnboardingStep(
    organizationId: string,
    employeeId: string,
    stepId: string,
    dto: UpdateEmployeeOnboardingStepDto,
  ) {
    try {
      const employee =
        (await this.employeeRepository.findById(employeeId)) ??
        AppResponse.error({
          message: 'Employee not found',
          status: HttpStatus.NOT_FOUND,
        });

      if (employee!.organizationId !== organizationId) {
        AppResponse.error({
          message: 'Employee does not belong to this organization',
          status: HttpStatus.FORBIDDEN,
        });
      }

      const steps = employee!.employeeOnboardingSteps ?? [];
      const stepIndex = steps.findIndex((s) => s.stepId === stepId);

      if (stepIndex === -1) {
        AppResponse.error({
          message: 'Onboarding step not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      // Auto-complete step if all requirements are complete
      const allRequirementsCompleted =
        dto.completionRequirements.length > 0 &&
        dto.completionRequirements.every((r) => r.isCompleted);

      steps[stepIndex] = {
        ...steps[stepIndex],
        isCompleted: dto.isCompleted || allRequirementsCompleted,
        dueDate: dto.dueDate ?? null,
        completionRequirements: dto.completionRequirements,
      };

      await this.employeeRepository.updateById(employeeId, {
        employeeOnboardingSteps: steps,
      });

      this.logger.log(
        `Updated onboarding step ${stepId} for employee ${employeeId}`,
      );

      return this.toEmployeeOnboardingStepView(steps[stepIndex]);
    } catch (error: any) {
      error.location = `OnboardingService.${this.updateEmployeeOnboardingStep.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: List employees in an organization with their onboarding
   * completion status, filterable by role, status, and due date and returned
   * in batches.
   *
   * @param organizationId - The organization to list employees for
   * @param query - Pagination and filter parameters
   *
   * @throws {404} Organization not found
   */
  async listEmployeeOnboarding(
    organizationId: string,
    query: ListEmployeeOnboardingQueryDto = {},
  ) {
    try {
      const batch = query.batch ?? 1;
      const limit = query.limit ?? 10;

      const [employees, jobTitles] = await Promise.all([
        this.employeeRepository.findByOrganization(organizationId),
        this.jobTitleRepository.findByOrganization(organizationId, 'code name'),
      ]);

      const jobTitleByCode = new Map(
        jobTitles.map((jobTitle) => [jobTitle.code, jobTitle]),
      );

      const records = employees.map((employee) => {
        const steps = employee.employeeOnboardingSteps ?? [];
        const totalSteps = steps.length;
        const completedSteps = steps.filter((s) => s.isCompleted).length;
        const overallProgress =
          totalSteps === 0
            ? 0
            : Math.round((completedSteps / totalSteps) * 100);

        const jobTitle = employee.jobTitleCode
          ? jobTitleByCode.get(employee.jobTitleCode)
          : null;

        const upcomingDueDates = steps
          .filter(
            (s): s is EmployeeOnboardingStep & { dueDate: DueDate } =>
              !s.isCompleted && s.dueDate != null,
          )
          .map((s) => this.resolveStepDueDate(employee.employmentDate, s.dueDate))
          .filter((date): date is Date => date !== null)
          .sort((a, b) => a.getTime() - b.getTime());
        const dueDate =
          upcomingDueDates.length > 0
            ? this.formatDate(upcomingDueDates[0])
            : null;

        return {
          employee,
          jobTitle,
          item: {
            employeeId: String(employee._id),
            employeeName:
              `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
              employee.email,
            email: employee.email,
            jobTitle: jobTitle?.name ?? null,
            dueDate,
            status: this.getOnboardingStatus(
              steps,
              employee.employmentDate,
              overallProgress,
            ),
            overallProgress,
            completedSteps,
            totalSteps,
          },
        };
      });

      const role = query.role?.trim().toLowerCase();
      const filtered = records.filter(({ employee, jobTitle, item }) => {
        if (query.status && item.status !== query.status) {
          return false;
        }

        if (query.startDate && (!item.dueDate || item.dueDate < query.startDate)) {
          return false;
        }

        if (query.endDate && (!item.dueDate || item.dueDate > query.endDate)) {
          return false;
        }

        if (role) {
          const matchesCode = employee.jobTitleCode?.toLowerCase() === role;
          const matchesName = jobTitle?.name?.toLowerCase() === role;

          if (!matchesCode && !matchesName) {
            return false;
          }
        }

        return true;
      });

      const start = (batch - 1) * limit;
      const data = filtered
        .slice(start, start + limit)
        .map((record) => record.item);

      return {
        data,
        total: filtered.length,
        page: batch,
        limit,
      };
    } catch (error: any) {
      error.location = `OnboardingService.${this.listEmployeeOnboarding.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Derive the onboarding status for an employee.
   * A fully completed onboarding is "onboarded". Otherwise, any incomplete
   * step past its due date makes it "overdue", a 0% progress record with no
   * overdue steps is "draft", and everything else is "incomplete".
   */
  private getOnboardingStatus(
    steps: EmployeeOnboardingStep[],
    employmentDate: Date | null | undefined,
    overallProgress: number,
  ): OnboardingStatus {
    if (overallProgress === 100) {
      return OnboardingStatus.ONBOARDED;
    }

    const now = new Date();
    const hasOverdueStep = steps.some((step) =>
      this.isStepOverdue(step, employmentDate, now),
    );

    if (hasOverdueStep) {
      return OnboardingStatus.OVERDUE;
    }

    if (overallProgress === 0) {
      return OnboardingStatus.DRAFT;
    }

    return OnboardingStatus.INCOMPLETE;
  }

  /**
   * @Responsibility: Check whether an incomplete step has passed its due date.
   * Due dates are stored relative to the employee's employment date.
   */
  private isStepOverdue(
    step: EmployeeOnboardingStep,
    employmentDate: Date | null | undefined,
    now: Date,
  ): boolean {
    if (step.isCompleted || !step.dueDate || !employmentDate) {
      return false;
    }

    const dueDate = this.resolveStepDueDate(employmentDate, step.dueDate);

    if (!dueDate) {
      return false;
    }

    dueDate.setHours(23, 59, 59, 999);

    return dueDate.getTime() < now.getTime();
  }

  /**
   * @Responsibility: Resolve a relative due date enum into an actual date.
   */
  private resolveStepDueDate(
    employmentDate: Date | null | undefined,
    dueDate: DueDate,
  ): Date | null {
    if (!employmentDate) {
      return null;
    }

    const daysAfterJoining = Number.parseInt(dueDate, 10);

    if (Number.isNaN(daysAfterJoining)) {
      return null;
    }

    const resolved = new Date(employmentDate);
    resolved.setDate(resolved.getDate() + daysAfterJoining);

    return resolved;
  }

  /**
   * @Responsibility: Format a date as YYYY-MM-DD using the server's local time.
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * @Responsibility: Convert a stored onboarding step into its API view.
   */
  private toEmployeeOnboardingStepView(step: EmployeeOnboardingStep) {
    return {
      stepId: step.stepId,
      stepName: step.stepName,
      dueDate: step.dueDate ?? null,
      isCompleted: step.isCompleted,
      completionRequirements: step.completionRequirements,
    };
  }
}
