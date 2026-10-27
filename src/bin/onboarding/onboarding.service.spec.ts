import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppException } from '../../common/response/app-exception';
import {
  DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS,
  SettingsDomainOrganisationService,
} from '../setting/domain/settings.domain.organisation.service';
import { OnboardingService } from './onboarding.service';
import {
  AddEmployeeOnboardingDto,
  RetrieveEmployeeOnboardingDto,
  UpdateEmployeeOnboardingStepDto,
} from './dto/employee-onboarding.dto';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const EMPLOYEE_ID = '64f1b2c3d4e5f678901234ba';
const STEP_ID = '64f1b2c3d4e5f678901234c1';

const buildEmployee = (overrides: Record<string, any> = {}) => ({
  _id: EMPLOYEE_ID,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  organizationId: ORG_ID,
  employeeOnboardingSteps: [],
  ...overrides,
});

describe('OnboardingService', () => {
  let employeeRepository: {
    findById: jest.Mock;
    updateById: jest.Mock;
    findByOrganization: jest.Mock;
  };
  let settingsDomainOrganisationService: {
    getEmployeeWorkflow: jest.Mock;
  };
  let service: OnboardingService;

  beforeEach(() => {
    jest.clearAllMocks();

    employeeRepository = {
      findById: jest.fn(),
      updateById: jest.fn(),
      findByOrganization: jest.fn(),
    };
    settingsDomainOrganisationService = {
      getEmployeeWorkflow: jest.fn(),
    };

    service = new OnboardingService(
      employeeRepository as any,
      settingsDomainOrganisationService as any,
    );
  });

  describe('addEmployeeOnboarding', () => {
    it('initializes onboarding with system steps for a valid employee', async () => {
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ employeeOnboardingSteps: [] }),
      );
      employeeRepository.updateById.mockResolvedValue(buildEmployee());

      const dto: AddEmployeeOnboardingDto = { employeeId: EMPLOYEE_ID };

      const result = await service.addEmployeeOnboarding(ORG_ID, dto);

      expect(result.employeeId).toBe(EMPLOYEE_ID);
      expect(result.steps).toHaveLength(
        DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS.onboarding.length,
      );
      expect(result.steps[0].stepName).toBe(
        'Adding and inviting new employee',
      );
      expect(result.steps[1].stepName).toBe('Self-enrolment');
      expect(result.overallProgress).toBe(0);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        EMPLOYEE_ID,
        expect.objectContaining({
          employeeOnboardingSteps: expect.any(Array),
        }),
      );
    });

    it('throws 404 when employee does not exist', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(
        service.addEmployeeOnboarding(ORG_ID, { employeeId: EMPLOYEE_ID }),
      ).rejects.toThrow(AppException);
    });

    it('throws 403 when employee belongs to another organization', async () => {
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ organizationId: 'other-org' }),
      );

      await expect(
        service.addEmployeeOnboarding(ORG_ID, { employeeId: EMPLOYEE_ID }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getEmployeeOnboarding', () => {
    it('returns employee onboarding progress with steps', async () => {
      const steps = [
        {
          stepId: STEP_ID,
          stepName: 'Adding and inviting new employee',
          isCompleted: true,
          completionRequirements: [
            { step: 'Admin adds employment details', isCompleted: true },
            { step: 'Admin invites employees to Foundation HR', isCompleted: true },
          ],
        },
        {
          stepId: 'step-2',
          stepName: 'Self-enrolment',
          isCompleted: false,
          completionRequirements: [
            { step: 'Employee creates an account', isCompleted: false },
          ],
        },
      ];
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ employeeOnboardingSteps: steps }),
      );

      const dto: RetrieveEmployeeOnboardingDto = { employeeId: EMPLOYEE_ID };

      const result = await service.getEmployeeOnboarding(ORG_ID, dto);

      expect(result.employeeId).toBe(EMPLOYEE_ID);
      expect(result.steps).toHaveLength(2);
      expect(result.completedSteps).toBe(1);
      expect(result.totalSteps).toBe(2);
      expect(result.overallProgress).toBe(50);
    });

    it('throws 404 when employee does not exist', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(
        service.getEmployeeOnboarding(ORG_ID, { employeeId: EMPLOYEE_ID }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('updateEmployeeOnboardingStep', () => {
    it('updates a step completion status and auto-completes when all requirements are done', async () => {
      const steps = [
        {
          stepId: STEP_ID,
          stepName: 'Self-enrolment',
          isCompleted: false,
          completionRequirements: [
            { step: 'Employee creates an account', isCompleted: false },
          ],
        },
      ];
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ employeeOnboardingSteps: steps }),
      );
      employeeRepository.updateById.mockResolvedValue(buildEmployee());

      const dto: UpdateEmployeeOnboardingStepDto = {
        stepId: STEP_ID,
        isCompleted: true,
        completionRequirements: [
          { step: 'Employee creates an account', isCompleted: true },
        ],
      };

      const result = await service.updateEmployeeOnboardingStep(
        ORG_ID,
        EMPLOYEE_ID,
        STEP_ID,
        dto,
      );

      expect(result.isCompleted).toBe(true);
      expect(result.completionRequirements[0].isCompleted).toBe(true);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        EMPLOYEE_ID,
        expect.objectContaining({ employeeOnboardingSteps: expect.any(Array) }),
      );
    });

    it('throws 404 when step does not exist', async () => {
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ employeeOnboardingSteps: [] }),
      );

      await expect(
        service.updateEmployeeOnboardingStep(
          ORG_ID,
          EMPLOYEE_ID,
          'non-existent-step',
          {
            stepId: 'non-existent-step',
            isCompleted: true,
            completionRequirements: [],
          },
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('listEmployeeOnboarding', () => {
    it('returns all employees with their onboarding progress', async () => {
      const steps = [
        { stepId: STEP_ID, stepName: 'Step 1', isCompleted: true, completionRequirements: [] },
        { stepId: 'step-2', stepName: 'Step 2', isCompleted: false, completionRequirements: [] },
      ];
      employeeRepository.findByOrganization.mockResolvedValue([
        buildEmployee({ _id: 'emp-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', employeeOnboardingSteps: steps }),
        buildEmployee({ _id: 'emp-2', firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com', employeeOnboardingSteps: [] }),
      ]);

      const result = await service.listEmployeeOnboarding(ORG_ID);

      expect(result).toHaveLength(2);
      expect(result[0].employeeName).toBe('Alice Smith');
      expect(result[0].completedSteps).toBe(1);
      expect(result[0].totalSteps).toBe(2);
      expect(result[0].overallProgress).toBe(50);
      expect(result[1].completedSteps).toBe(0);
      expect(result[1].totalSteps).toBe(0);
      expect(result[1].overallProgress).toBe(0);
    });
  });
});
