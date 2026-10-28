import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppException } from '../../common/response/app-exception';
import { DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS } from '../setting/domain/settings.domain.organisation.service';
import { OnboardingService } from './onboarding.service';
import {
  AddEmployeeOnboardingDto,
  RetrieveEmployeeOnboardingDto,
  UpdateEmployeeOnboardingStepDto,
} from './dto/employee-onboarding.dto';
import { DueDate } from '../setting/employee-profiles/enum/employee-profile.enum';
import { OnboardingStatus } from './enum/onboarding-status.enum';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const EMPLOYEE_ID = '64f1b2c3d4e5f678901234ba';
const STEP_ID = '64f1b2c3d4e5f678901234c1';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

const buildEmployee = (overrides: Record<string, any> = {}) => ({
  _id: EMPLOYEE_ID,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  organizationId: ORG_ID,
  status: 'active',
  employeeOnboardingSteps: [],
  ...overrides,
});

describe('OnboardingService', () => {
  let employeeRepository: {
    findById: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
    findByOrganization: jest.Mock<AnyPromiseFn>;
  };
  let jobTitleRepository: {
    findByOrganization: jest.Mock<AnyPromiseFn>;
  };
  let settingsDomainOrganisationService: {
    getEmployeeWorkflow: jest.Mock<AnyPromiseFn>;
  };
  let service: OnboardingService;

  beforeEach(() => {
    jest.clearAllMocks();

    employeeRepository = {
      findById: jest.fn(),
      updateById: jest.fn(),
      findByOrganization: jest.fn(),
    };
    jobTitleRepository = {
      findByOrganization: jest.fn(),
    };
    settingsDomainOrganisationService = {
      getEmployeeWorkflow: jest.fn(),
    };

    service = new OnboardingService(
      employeeRepository as any,
      jobTitleRepository as any,
      settingsDomainOrganisationService as any,
    );
  });

  describe('addEmployeeOnboarding', () => {
    it('initializes onboarding with the full organization workflow snapshot', async () => {
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ employeeOnboardingSteps: [] }),
      );
      employeeRepository.updateById.mockResolvedValue(buildEmployee());
      settingsDomainOrganisationService.getEmployeeWorkflow.mockResolvedValue({
        onboarding: [
          {
            ...DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS.onboarding[0],
            id: STEP_ID,
          },
          {
            ...DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS.onboarding[1],
            id: 'step-2',
          },
          {
            id: 'step-3',
            stepName: 'Right to work check',
            responsibleParty: 'New hire',
            taskType: 'upload_documents',
            dueDate: DueDate.ONE_DAY_AFTER_JOINING,
            instructions: 'Upload a valid right to work document.',
            attachmentUrls: ['https://example.com/guide.pdf'],
            completionRequirements: [
              { step: 'Employee uploads right to work document' },
            ],
            isSystem: false,
            isCompleted: false,
          },
        ],
      });

      const dto: AddEmployeeOnboardingDto = { employeeId: EMPLOYEE_ID };

      const result = await service.addEmployeeOnboarding(ORG_ID, dto);

      expect(result.employeeId).toBe(EMPLOYEE_ID);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].stepName).toBe('Adding and inviting new employee');
      expect(result.steps[1].stepName).toBe('Self-enrolment');
      expect(result.steps[2].stepName).toBe('Right to work check');
      expect(result.steps[0].dueDate).toBeNull();
      expect(result.steps[2].dueDate).toBe('1_day_after_joining');
      expect(result.steps[2].responsibleParty).toBe('New hire');
      expect(result.steps[2].taskType).toBe('upload_documents');
      expect(result.steps[2].attachmentUrls).toEqual([
        'https://example.com/guide.pdf',
      ]);
      expect(result.steps[0].startedAt).toBeInstanceOf(Date);
      expect(result.steps[1].startedAt).toBeNull();
      expect(result.steps[2].startedAt).toBeNull();
      expect(result.overallProgress).toBe(0);
      expect(
        settingsDomainOrganisationService.getEmployeeWorkflow,
      ).toHaveBeenCalledWith(ORG_ID);
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
          responsibleParty: 'Admin',
          taskType: null,
          dueDate: null,
          instructions: null,
          attachmentUrls: [],
          isSystem: true,
          isCompleted: true,
          startedAt: new Date(2026, 0, 1),
          completedAt: new Date(2026, 0, 1),
          completionRequirements: [
            {
              step: 'Admin adds employment details',
              isCompleted: true,
              completedAt: new Date(2026, 0, 1),
            },
            {
              step: 'Admin invites employees to Foundation HR',
              isCompleted: true,
              completedAt: new Date(2026, 0, 1),
            },
          ],
        },
        {
          stepId: 'step-2',
          stepName: 'Self-enrolment',
          responsibleParty: 'New hire',
          taskType: 'complete_form',
          dueDate: null,
          instructions: 'Complete your employee profile.',
          attachmentUrls: [],
          isSystem: true,
          isCompleted: false,
          startedAt: new Date(2026, 0, 2),
          completedAt: null,
          completionRequirements: [
            {
              step: 'Employee creates an account',
              isCompleted: false,
              completedAt: null,
            },
          ],
        },
      ];
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({
          employeeId: 'FHR2024',
          avatarUrl: 'https://example.com/avatar.png',
          employmentDate: new Date(2026, 0, 1),
          jobTitleCode: 'eng',
          employeeOnboardingSteps: steps,
        }),
      );
      jobTitleRepository.findByOrganization.mockResolvedValue([
        { code: 'eng', name: 'Engineer' },
      ]);

      const dto: RetrieveEmployeeOnboardingDto = { employeeId: EMPLOYEE_ID };

      const result = await service.getEmployeeOnboarding(ORG_ID, dto);

      expect(result.employeeId).toBe(EMPLOYEE_ID);
      expect(result.employee).toEqual({
        employeeId: EMPLOYEE_ID,
        employeeName: 'John Doe',
        email: 'john.doe@example.com',
        avatarUrl: 'https://example.com/avatar.png',
        employmentId: 'FHR2024',
        role: 'Engineer',
        startDate: '2026-01-01',
      });
      expect(result.workflow).toEqual({
        name: 'Onboarding',
        snapshotDate: '2026-01-01',
      });
      expect(result.status).toBe(OnboardingStatus.INCOMPLETE);
      expect(result.currentStep).toEqual({
        stepId: 'step-2',
        stepName: 'Self-enrolment',
        number: 2,
        total: 2,
      });
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].dueDate).toBeNull();
      expect(result.steps[1].dueDate).toBeNull();
      expect(result.steps[1].resolvedDueDate).toBeNull();
      expect(result.steps[0].isLocked).toBe(false);
      expect(result.steps[1].isLocked).toBe(false);
      expect(result.steps[0].startedAt).toBe('2026-01-01');
      expect(result.steps[0].completedAt).toBe('2026-01-01');
      expect(result.steps[0].completionRequirements[0]).toEqual({
        step: 'Admin adds employment details',
        isCompleted: true,
        completedAt: '2026-01-01',
        status: 'completed',
      });
      expect(result.steps[1].completionRequirements[0].status).toBe(
        'to_complete',
      );
      expect(result.completedSteps).toBe(1);
      expect(result.totalSteps).toBe(2);
      expect(result.overallProgress).toBe(50);
      expect(result.stepProgress).toBe(100);
    });

    it('locks steps until earlier steps are complete', async () => {
      const steps = [
        {
          stepId: STEP_ID,
          stepName: 'Adding and inviting new employee',
          isCompleted: false,
          startedAt: new Date(2026, 0, 1),
          completionRequirements: [],
        },
        {
          stepId: 'step-2',
          stepName: 'Self-enrolment',
          isCompleted: false,
          startedAt: null,
          completionRequirements: [],
        },
        {
          stepId: 'step-3',
          stepName: 'Employment agreement',
          isCompleted: false,
          startedAt: null,
          completionRequirements: [],
        },
      ];
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ employeeOnboardingSteps: steps }),
      );
      jobTitleRepository.findByOrganization.mockResolvedValue([]);

      const result = await service.getEmployeeOnboarding(ORG_ID, {
        employeeId: EMPLOYEE_ID,
      });

      expect(result.currentStep).toEqual({
        stepId: STEP_ID,
        stepName: 'Adding and inviting new employee',
        number: 1,
        total: 3,
      });
      expect(result.stepProgress).toBe(33);
      expect(result.steps[0].isLocked).toBe(false);
      expect(result.steps[1].isLocked).toBe(true);
      expect(result.steps[1].lockReason).toBe(
        'Locked until Adding and inviting new employee is approved',
      );
      expect(result.steps[2].isLocked).toBe(true);
      expect(result.steps[2].lockReason).toBe(
        'Locked until Self-enrolment is approved',
      );
    });

    it('throws 404 when employee does not exist', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(
        service.getEmployeeOnboarding(ORG_ID, { employeeId: EMPLOYEE_ID }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('updateEmployeeOnboardingStep', () => {
    it('updates a step completion status, due date, and auto-completes when all requirements are done', async () => {
      const steps = [
        {
          stepId: STEP_ID,
          stepName: 'Self-enrolment',
          dueDate: null,
          isCompleted: false,
          startedAt: null,
          completedAt: null,
          completionRequirements: [
            {
              step: 'Employee creates an account',
              isCompleted: false,
              completedAt: null,
            },
          ],
        },
        {
          stepId: 'step-2',
          stepName: 'Right to work check',
          dueDate: null,
          isCompleted: false,
          startedAt: null,
          completedAt: null,
          completionRequirements: [],
        },
      ];
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ employeeOnboardingSteps: steps }),
      );
      employeeRepository.updateById.mockResolvedValue(buildEmployee());

      const dto: UpdateEmployeeOnboardingStepDto = {
        stepId: STEP_ID,
        isCompleted: true,
        dueDate: DueDate.ONE_DAY_AFTER_JOINING,
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
      expect(result.dueDate).toBe('1_day_after_joining');
      expect(result.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.completionRequirements[0].isCompleted).toBe(true);
      expect(result.completionRequirements[0].completedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
      expect(result.completionRequirements[0].status).toBe('completed');

      const updatedSteps =
        employeeRepository.updateById.mock.calls[0][1].employeeOnboardingSteps;
      expect(updatedSteps[1].startedAt).toBeInstanceOf(Date);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        EMPLOYEE_ID,
        expect.objectContaining({ employeeOnboardingSteps: expect.any(Array) }),
      );
    });

    it('preserves the due date and startedAt when they are omitted from the update', async () => {
      const steps = [
        {
          stepId: STEP_ID,
          stepName: 'Self-enrolment',
          dueDate: DueDate.TWO_DAYS_AFTER_JOINING,
          isCompleted: false,
          startedAt: new Date(2026, 0, 2),
          completedAt: null,
          completionRequirements: [
            {
              step: 'Employee creates an account',
              isCompleted: false,
              completedAt: null,
            },
          ],
        },
      ];
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({
          employmentDate: new Date(2026, 0, 1),
          employeeOnboardingSteps: steps,
        }),
      );
      employeeRepository.updateById.mockResolvedValue(buildEmployee());

      const result = await service.updateEmployeeOnboardingStep(
        ORG_ID,
        EMPLOYEE_ID,
        STEP_ID,
        {
          stepId: STEP_ID,
          isCompleted: false,
          completionRequirements: [
            { step: 'Employee creates an account', isCompleted: false },
          ],
        },
      );

      expect(result.dueDate).toBe('2_days_after_joining');
      expect(result.resolvedDueDate).toBe('2026-01-03');
      expect(result.startedAt).toBe('2026-01-02');
      expect(result.completedAt).toBeNull();
      expect(result.completionRequirements[0].completedAt).toBeNull();
    });

    it('clears completion timestamps when a step is reopened', async () => {
      const steps = [
        {
          stepId: STEP_ID,
          stepName: 'Self-enrolment',
          dueDate: null,
          isCompleted: true,
          startedAt: new Date(2026, 0, 1),
          completedAt: new Date(2026, 0, 2),
          completionRequirements: [
            {
              step: 'Employee creates an account',
              isCompleted: true,
              completedAt: new Date(2026, 0, 2),
            },
          ],
        },
      ];
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ employeeOnboardingSteps: steps }),
      );
      employeeRepository.updateById.mockResolvedValue(buildEmployee());

      const result = await service.updateEmployeeOnboardingStep(
        ORG_ID,
        EMPLOYEE_ID,
        STEP_ID,
        {
          stepId: STEP_ID,
          isCompleted: false,
          completionRequirements: [
            { step: 'Employee creates an account', isCompleted: false },
          ],
        },
      );

      expect(result.isCompleted).toBe(false);
      expect(result.completedAt).toBeNull();
      expect(result.completionRequirements[0].completedAt).toBeNull();
      expect(result.completionRequirements[0].status).toBe('to_complete');
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
    it('returns all employees with their onboarding progress, status, job title, and due date', async () => {
      const steps = [
        {
          stepId: STEP_ID,
          stepName: 'Step 1',
          dueDate: DueDate.TWO_DAYS_AFTER_JOINING,
          isCompleted: true,
          completionRequirements: [],
        },
        {
          stepId: 'step-2',
          stepName: 'Step 2',
          dueDate: DueDate.ONE_DAY_AFTER_JOINING,
          isCompleted: false,
          completionRequirements: [],
        },
      ];
      employeeRepository.findByOrganization.mockResolvedValue([
        buildEmployee({
          _id: 'emp-1',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          jobTitleCode: 'eng',
          employeeOnboardingSteps: steps,
        }),
        buildEmployee({
          _id: 'emp-2',
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'bob@example.com',
          jobTitleCode: 'mgr',
          employeeOnboardingSteps: [],
        }),
      ]);
      jobTitleRepository.findByOrganization.mockResolvedValue([
        { code: 'eng', name: 'Engineer' },
        { code: 'mgr', name: 'Manager' },
      ]);

      const result = await service.listEmployeeOnboarding(ORG_ID);

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].employeeName).toBe('Alice Smith');
      expect(result.data[0].email).toBe('alice@example.com');
      expect(result.data[0].jobTitle).toBe('Engineer');
      expect(result.data[0].dueDate).toBeNull();
      expect(result.data[0].status).toBe(OnboardingStatus.INCOMPLETE);
      expect(result.data[0].completedSteps).toBe(1);
      expect(result.data[0].totalSteps).toBe(2);
      expect(result.data[0].overallProgress).toBe(50);
      expect(result.data[1].employeeName).toBe('Bob Jones');
      expect(result.data[1].email).toBe('bob@example.com');
      expect(result.data[1].jobTitle).toBe('Manager');
      expect(result.data[1].dueDate).toBeNull();
      expect(result.data[1].status).toBe(OnboardingStatus.DRAFT);
      expect(result.data[1].completedSteps).toBe(0);
      expect(result.data[1].totalSteps).toBe(0);
      expect(result.data[1].overallProgress).toBe(0);
    });

    it('returns the earliest incomplete step due date as YYYY-MM-DD', async () => {
      employeeRepository.findByOrganization.mockResolvedValue([
        buildEmployee({
          employmentDate: new Date(2026, 0, 1),
          employeeOnboardingSteps: [
            {
              stepId: STEP_ID,
              stepName: 'Step 1',
              dueDate: DueDate.ONE_DAY_AFTER_JOINING,
              isCompleted: false,
              completionRequirements: [],
            },
            {
              stepId: 'step-2',
              stepName: 'Step 2',
              dueDate: DueDate.THREE_DAYS_AFTER_JOINING,
              isCompleted: false,
              completionRequirements: [],
            },
          ],
        }),
      ]);
      jobTitleRepository.findByOrganization.mockResolvedValue([]);

      const result = await service.listEmployeeOnboarding(ORG_ID);

      expect(result.data[0].dueDate).toBe('2026-01-02');
    });

    it('filters by role, status, and due date range', async () => {
      employeeRepository.findByOrganization.mockResolvedValue([
        buildEmployee({
          _id: 'emp-1',
          employmentDate: new Date(2026, 0, 1),
          jobTitleCode: 'eng',
          employeeOnboardingSteps: [
            {
              stepId: STEP_ID,
              stepName: 'Step 1',
              dueDate: DueDate.ONE_DAY_AFTER_JOINING,
              isCompleted: false,
              completionRequirements: [],
            },
          ],
        }),
        buildEmployee({
          _id: 'emp-2',
          employmentDate: new Date(2026, 0, 1),
          jobTitleCode: 'mgr',
          employeeOnboardingSteps: [
            {
              stepId: 'step-2',
              stepName: 'Step 2',
              dueDate: DueDate.TWO_DAYS_AFTER_JOINING,
              isCompleted: false,
              completionRequirements: [],
            },
          ],
        }),
      ]);
      jobTitleRepository.findByOrganization.mockResolvedValue([
        { code: 'eng', name: 'Engineer' },
        { code: 'mgr', name: 'Manager' },
      ]);

      const result = await service.listEmployeeOnboarding(ORG_ID, {
        role: 'Manager',
        status: OnboardingStatus.OVERDUE,
        startDate: '2026-01-03',
        endDate: '2026-01-03',
      });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].employeeId).toBe('emp-2');
    });

    it('paginates results using batch and limit', async () => {
      employeeRepository.findByOrganization.mockResolvedValue(
        Array.from({ length: 5 }, (_, index) =>
          buildEmployee({
            _id: `emp-${index + 1}`,
            employeeOnboardingSteps: [],
          }),
        ),
      );
      jobTitleRepository.findByOrganization.mockResolvedValue([]);

      const result = await service.listEmployeeOnboarding(ORG_ID, {
        batch: 2,
        limit: 2,
      });

      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].employeeId).toBe('emp-3');
      expect(result.data[1].employeeId).toBe('emp-4');
    });

    it('marks onboarding as overdue when an incomplete step is past its due date', async () => {
      employeeRepository.findByOrganization.mockResolvedValue([
        buildEmployee({
          employmentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          employeeOnboardingSteps: [
            {
              stepId: STEP_ID,
              stepName: 'Step 1',
              dueDate: DueDate.ONE_DAY_AFTER_JOINING,
              isCompleted: false,
              completionRequirements: [],
            },
          ],
        }),
      ]);
      jobTitleRepository.findByOrganization.mockResolvedValue([]);

      const result = await service.listEmployeeOnboarding(ORG_ID);

      expect(result.data[0].status).toBe(OnboardingStatus.OVERDUE);
    });

    it('marks onboarding as onboarded when overall progress reaches 100%', async () => {
      employeeRepository.findByOrganization.mockResolvedValue([
        buildEmployee({
          employmentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          employeeOnboardingSteps: [
            {
              stepId: STEP_ID,
              stepName: 'Step 1',
              dueDate: DueDate.ONE_DAY_AFTER_JOINING,
              isCompleted: true,
              completionRequirements: [],
            },
          ],
        }),
      ]);
      jobTitleRepository.findByOrganization.mockResolvedValue([]);

      const result = await service.listEmployeeOnboarding(ORG_ID);

      expect(result.data[0].status).toBe(OnboardingStatus.ONBOARDED);
    });
  });
});
