import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AppResponse } from '../../common/response/app-response';
import {
  DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS,
  SettingsDomainOrganisationService,
} from '../setting/domain/settings.domain.organisation.service';
import {
  AddEmployeeOnboardingDto,
  RetrieveEmployeeOnboardingDto,
  UpdateEmployeeOnboardingStepDto,
} from './dto/employee-onboarding.dto';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import { EmployeeOnboardingStep } from '../employee/entity/employee.schema';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(SettingsDomainOrganisationService)
    private readonly settingsDomainOrganisationService: SettingsDomainOrganisationService,
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

      const defaultSteps =
        DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS.onboarding ?? [];

      const onboardingSteps = defaultSteps.map((step) => ({
        stepId: String(step._id),
        stepName: step.stepName,
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
   * Returns each step with its completion status and completion requirements,
   * plus an overall progress percentage.
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

      const steps = employee!.employeeOnboardingSteps ?? [];
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
   * @param dto - The completion status and requirements
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
   * @Responsibility: List all employees in an organization with their
   * onboarding completion status.
   *
   * @param organizationId - The organization to list employees for
   *
   * @throws {404} Organization not found
   */
  async listEmployeeOnboarding(organizationId: string) {
    try {
      const employees =
        await this.employeeRepository.findByOrganization(organizationId);

      const result = employees.map((employee) => {
        const steps = employee.employeeOnboardingSteps ?? [];
        const totalSteps = steps.length;
        const completedSteps = steps.filter((s) => s.isCompleted).length;
        const overallProgress =
          totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

        return {
          employeeId: String(employee._id),
          employeeName:
            `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
            employee.email,
          email: employee.email,
          overallProgress,
          completedSteps,
          totalSteps,
        };
      });

      return result;
    } catch (error: any) {
      error.location = `OnboardingService.${this.listEmployeeOnboarding.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Convert a stored onboarding step into its API view.
   */
  private toEmployeeOnboardingStepView(step: EmployeeOnboardingStep) {
    return {
      stepId: step.stepId,
      stepName: step.stepName,
      isCompleted: step.isCompleted,
      completionRequirements: step.completionRequirements,
    };
  }
}
