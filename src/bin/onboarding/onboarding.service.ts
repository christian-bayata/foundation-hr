import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { AppResponse } from '../../common/response/app-response';
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
import { SettingsDomainOrganisationService } from '../setting/domain/settings.domain.organisation.service';
import { OnboardingStatus } from './enum/onboarding-status.enum';

const ONBOARDING_WORKFLOW_NAME = 'Onboarding';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(JobTitleRepository)
    private readonly jobTitleRepository: JobTitleRepository,
    @Inject(SettingsDomainOrganisationService)
    private readonly settingsDomainOrganisationService: SettingsDomainOrganisationService,
  ) {}

  /**
   * @Responsibility: Initialize onboarding tracking for a new employee.
   * Snapshots the organization's onboarding workflow, including the two
   * required system steps ("Adding and inviting new employee" and
   * "Self-enrolment") plus any custom steps. All completion requirements start
   * as incomplete, and the first step is marked as started.
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

      const workflow =
        await this.settingsDomainOrganisationService.getEmployeeWorkflow(
          organizationId,
        );
      const workflowSteps = workflow.onboarding ?? [];
      const startedAt = new Date();

      const onboardingSteps = workflowSteps.map((step, index) => ({
        stepId: step.id,
        stepName: step.stepName,
        responsibleParty: step.responsibleParty ?? null,
        taskType: step.taskType ?? null,
        dueDate: step.dueDate ?? null,
        instructions: step.instructions ?? null,
        attachmentUrls: step.attachmentUrls ?? [],
        isSystem: step.isSystem ?? false,
        isCompleted: false,
        startedAt: index === 0 ? startedAt : null,
        completedAt: null,
        completionRequirements: (step.completionRequirements ?? []).map(
          (req) => ({
            step: req.step,
            isCompleted: false,
            completedAt: null,
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
   * @Responsibility: Retrieve an employee's onboarding detail.
   * Returns the employee header, workflow snapshot metadata, current step,
   * overall and step progress, and every step with its owner, dates, lock
   * state, and completion requirements.
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

      const rawSteps = employee!.employeeOnboardingSteps ?? [];
      const totalSteps = rawSteps.length;
      const completedSteps = rawSteps.filter((s) => s.isCompleted).length;
      const overallProgress =
        totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
      const firstIncompleteIndex = rawSteps.findIndex((s) => !s.isCompleted);
      const currentStepIndex =
        firstIncompleteIndex === -1
          ? totalSteps > 0
            ? totalSteps - 1
            : -1
          : firstIncompleteIndex;
      const currentStepNumber =
        currentStepIndex === -1 ? 0 : currentStepIndex + 1;
      const stepProgress =
        totalSteps === 0
          ? 0
          : Math.round((currentStepNumber / totalSteps) * 100);

      const steps = rawSteps.map((step, index) => {
        const previousIncompleteSteps = rawSteps
          .slice(0, index)
          .filter((previousStep) => !previousStep.isCompleted);
        const isLocked =
          !step.isCompleted && previousIncompleteSteps.length > 0;
        const blockingStep =
          previousIncompleteSteps[previousIncompleteSteps.length - 1];

        return this.toEmployeeOnboardingStepView(
          step,
          employee!.employmentDate,
          isLocked,
          isLocked ? `Locked until ${blockingStep.stepName} is approved` : null,
        );
      });

      const jobTitles = await this.jobTitleRepository.findByOrganization(
        organizationId,
        'code name',
      );
      const jobTitle = employee!.jobTitleCode
        ? jobTitles.find((title) => title.code === employee!.jobTitleCode)
        : null;
      const currentStep =
        currentStepIndex === -1
          ? null
          : {
              stepId: rawSteps[currentStepIndex].stepId,
              stepName: rawSteps[currentStepIndex].stepName,
              number: currentStepNumber,
              total: totalSteps,
            };

      return {
        employeeId: dto.employeeId,
        employeeUniqueId: employee.employeeId,
        employee: {
          employeeId: String(employee!._id),
          employeeName:
            `${employee!.firstName ?? ''} ${employee!.lastName ?? ''}`.trim() ||
            employee!.email,
          email: employee!.email,
          avatarUrl: employee!.avatarUrl ?? null,
          employmentId: employee!.employeeId ?? null,
          role: jobTitle?.name ?? null,
          startDate: employee!.employmentDate
            ? this.formatDate(employee!.employmentDate)
            : null,
        },
        workflow: {
          name: ONBOARDING_WORKFLOW_NAME,
          snapshotDate: this.getWorkflowSnapshotDate(
            rawSteps,
            employee!.employmentDate,
          ),
        },
        status: this.getOnboardingStatus(
          rawSteps,
          employee!.employmentDate,
          overallProgress,
        ),
        currentStep,
        overallProgress,
        stepProgress,
        completedSteps,
        totalSteps,
        steps,
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
      const now = new Date();
      const currentStep = steps[stepIndex];
      const isCompleted = dto.isCompleted || allRequirementsCompleted;
      const existingRequirements = new Map(
        (currentStep.completionRequirements ?? []).map((requirement) => [
          requirement.step,
          requirement,
        ]),
      );
      const completionRequirements = dto.completionRequirements.map(
        (requirement) => {
          const existing = existingRequirements.get(requirement.step);
          const completedAt = requirement.isCompleted
            ? existing?.isCompleted
              ? (existing.completedAt ?? now)
              : now
            : null;

          return {
            step: requirement.step,
            isCompleted: requirement.isCompleted,
            completedAt,
          };
        },
      );

      steps[stepIndex] = {
        ...currentStep,
        isCompleted,
        dueDate: dto.dueDate ?? currentStep.dueDate ?? null,
        startedAt: currentStep.startedAt ?? now,
        completedAt: isCompleted ? (currentStep.completedAt ?? now) : null,
        completionRequirements,
      };

      if (isCompleted && !currentStep.isCompleted) {
        const nextStep = steps[stepIndex + 1];

        if (nextStep && !nextStep.startedAt) {
          nextStep.startedAt = now;
        }
      }

      await this.employeeRepository.updateById(employeeId, {
        employeeOnboardingSteps: steps,
      });

      this.logger.log(
        `Updated onboarding step ${stepId} for employee ${employeeId}`,
      );

      return this.toEmployeeOnboardingStepView(
        steps[stepIndex],
        employee!.employmentDate,
      );
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
          .map((s) =>
            this.resolveStepDueDate(employee.employmentDate, s.dueDate),
          )
          .filter((date): date is Date => date !== null)
          .sort((a, b) => a.getTime() - b.getTime());
        const dueDate =
          upcomingDueDates.length > 0
            ? this.formatDate(upcomingDueDates[0])
            : null;

        return {
          employee,
          employeeUniqueId: employee.employeeId,
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

        if (
          query.startDate &&
          (!item.dueDate || item.dueDate < query.startDate)
        ) {
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
        count: filtered.length,
        // page: batch,
        // limit,
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
   * @Responsibility: Derive the date the onboarding workflow was snapshotted
   * onto the employee. The first step is started at initialization, so its
   * start date is the snapshot date. Falls back to the employment date for
   * legacy records that have no step timestamps.
   */
  private getWorkflowSnapshotDate(
    steps: EmployeeOnboardingStep[],
    employmentDate: Date | null | undefined,
  ): string | null {
    const startedDates = steps
      .map((step) => step.startedAt)
      .filter((date): date is Date => date != null)
      .sort((a, b) => a.getTime() - b.getTime());
    const snapshotDate = startedDates[0] ?? employmentDate ?? null;

    return snapshotDate ? this.formatDate(snapshotDate) : null;
  }

  /**
   * @Responsibility: Convert a stored onboarding step into its API view.
   */
  private toEmployeeOnboardingStepView(
    step: EmployeeOnboardingStep,
    employmentDate: Date | null | undefined = null,
    isLocked = false,
    lockReason: string | null = null,
  ) {
    const resolvedDueDate = step.dueDate
      ? this.resolveStepDueDate(employmentDate, step.dueDate)
      : null;

    return {
      stepId: step.stepId,
      stepName: step.stepName,
      responsibleParty: step.responsibleParty ?? null,
      taskType: step.taskType ?? null,
      dueDate: step.dueDate ?? null,
      resolvedDueDate: resolvedDueDate
        ? this.formatDate(resolvedDueDate)
        : null,
      instructions: step.instructions ?? null,
      attachmentUrls: step.attachmentUrls ?? [],
      isSystem: step.isSystem ?? false,
      isCompleted: step.isCompleted,
      isLocked,
      lockReason,
      startedAt: step.startedAt ? this.formatDate(step.startedAt) : null,
      completedAt: step.completedAt ? this.formatDate(step.completedAt) : null,
      completionRequirements: (step.completionRequirements ?? []).map(
        (requirement) => ({
          step: requirement.step,
          isCompleted: requirement.isCompleted,
          completedAt: requirement.completedAt
            ? this.formatDate(requirement.completedAt)
            : null,
          status: requirement.isCompleted ? 'completed' : 'to_complete',
        }),
      ),
    };
  }
}
