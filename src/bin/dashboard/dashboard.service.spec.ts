import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DashboardService } from './dashboard.service';
import { EmployeeStatus } from '../employee/enum/employee.enum';
import { LeaveRequestStatus } from '../leave/enum/leave.enum';
import { EmployeeRequestStatus } from '../request/enum/request.enum';
import { RequestType } from '../setting/request-management/enum/request-management.enum';
import { OnboardingStatus } from '../onboarding/enum/onboarding-status.enum';
import { DueDate } from '../setting/employee-profiles/enum/employee-profile.enum';
import {
  DashboardActivityType,
  DashboardDistributionDimension,
  DashboardInterval,
  DashboardMetricKey,
} from './enum/dashboard.enum';
import { formatDate } from './dashboard.utility';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

const ORG_ID = '64f1b2c3d4e5f678901234ab';

const buildEmployee = (overrides: Record<string, any> = {}) => ({
  _id: '64f1b2c3d4e5f678901234b1',
  organizationId: ORG_ID,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  employeeId: 'EMP-1',
  avatarUrl: null,
  employmentDate: new Date(),
  status: EmployeeStatus.ACTIVE,
  departmentCode: 'eng',
  jobTitleCode: 'eng',
  employeeType: 'employee',
  jobType: 'full_time',
  workMode: 'on_site',
  location: 'Lagos',
  employeeOnboardingSteps: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildLeaveRequest = (overrides: Record<string, any> = {}) => ({
  _id: '64f1b2c3d4e5f678901234c1',
  organizationId: ORG_ID,
  employeeId: '64f1b2c3d4e5f678901234b2',
  employee: {
    employeeId: '64f1b2c3d4e5f678901234b2',
    employeeUniqueId: 'EMP-2',
    employeeName: 'John Smith',
    email: 'john@example.com',
    avatarUrl: null,
  },
  leaveCategory: { id: 'annual', label: 'Annual leave' },
  startDate: new Date(),
  endDate: new Date(),
  status: LeaveRequestStatus.APPROVED,
  requestedAt: new Date(),
  reviewedAt: new Date(),
  reviewedBy: { userId: 'usr1', email: 'hr@example.com', name: 'HR Admin' },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildExitRequest = (overrides: Record<string, any> = {}) => ({
  _id: '64f1b2c3d4e5f678901234d1',
  organizationId: ORG_ID,
  requestType: RequestType.EMPLOYEE_TERMINATION,
  employeeId: '64f1b2c3d4e5f678901234b3',
  employee: {
    employeeId: '64f1b2c3d4e5f678901234b3',
    employeeUniqueId: 'EMP-3',
    employeeName: 'Mary Jones',
    email: 'mary@example.com',
    avatarUrl: null,
  },
  createdBy: { userId: 'usr2', email: 'owner@example.com', name: 'Owner' },
  status: EmployeeRequestStatus.IN_PROGRESS,
  details: { terminationDate: formatDate(new Date()) },
  effectiveDate: new Date(),
  submittedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('DashboardService', () => {
  let service: DashboardService;
  let employeeRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let departmentRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let jobTitleRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let leaveRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let requestRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let exitTrackingRepository: Record<string, jest.Mock<AnyPromiseFn>>;

  beforeEach(() => {
    jest.clearAllMocks();

    employeeRepository = { findByOrganization: jest.fn() };
    departmentRepository = { findByOrganization: jest.fn() };
    jobTitleRepository = { findByOrganization: jest.fn() };
    leaveRepository = { findAll: jest.fn() };
    requestRepository = { findAll: jest.fn() };
    exitTrackingRepository = { findByRequestIds: jest.fn() };

    departmentRepository.findByOrganization.mockResolvedValue([
      { code: 'eng', name: 'Engineering' },
      { code: 'design', name: 'Design' },
    ]);
    jobTitleRepository.findByOrganization.mockResolvedValue([
      { code: 'eng', name: 'Engineer' },
    ]);
    exitTrackingRepository.findByRequestIds.mockResolvedValue([]);

    service = new DashboardService(
      employeeRepository as any,
      departmentRepository as any,
      jobTitleRepository as any,
      leaveRepository as any,
      requestRepository as any,
      exitTrackingRepository as any,
    );
  });

  it('builds summary metrics and trend buckets from current records', async () => {
    const now = new Date();
    const previousMonth = new Date(now);
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const employees = [
      buildEmployee({ _id: 'emp-today', employmentDate: now }),
      buildEmployee({
        _id: 'emp-older',
        employmentDate: new Date(now.getFullYear(), now.getMonth() - 2, 10),
      }),
      buildEmployee({
        _id: 'emp-previous',
        employmentDate: previousMonth,
        email: 'previous@example.com',
      }),
    ];
    const leaveRequest = buildLeaveRequest({
      startDate: now,
      endDate: now,
    });
    const exitRequest = buildExitRequest({
      employeeId: 'emp-previous',
      details: { terminationDate: formatDate(now) },
    });

    employeeRepository.findByOrganization.mockResolvedValue(employees);
    leaveRepository.findAll.mockResolvedValue([leaveRequest]);
    requestRepository.findAll.mockResolvedValue([exitRequest]);

    const result = await service.getSummary(ORG_ID, {
      interval: DashboardInterval.TWELVE_MONTHS,
    });

    expect(result.rangeMonths).toBe(12);
    expect(result.hasData).toBe(true);
    expect(result.trend).toHaveLength(12);
    expect(
      result.metrics.find(
        (metric) => metric.key === DashboardMetricKey.TOTAL_EMPLOYEES,
      )?.value,
    ).toBe(2);
    expect(
      result.metrics.find((metric) => metric.key === DashboardMetricKey.LEAVE)
        ?.value,
    ).toBe(1);
    expect(
      result.metrics.find(
        (metric) => metric.key === DashboardMetricKey.NEW_HIRES,
      )?.value,
    ).toBe(3);
    expect(
      result.metrics.find((metric) => metric.key === DashboardMetricKey.EXITS)
        ?.value,
    ).toBe(1);

    const currentBucket = result.trend[result.trend.length - 1];
    expect(currentBucket.headcount).toBe(2);
    expect(currentBucket.newHires).toBe(1);
    expect(currentBucket.exits).toBe(1);
    expect(currentBucket.approvedLeaveRequests).toBe(1);
  });

  it('builds daily trend buckets for the 7_days interval', async () => {
    employeeRepository.findByOrganization.mockResolvedValue([
      buildEmployee(),
    ]);
    leaveRepository.findAll.mockResolvedValue([]);
    requestRepository.findAll.mockResolvedValue([]);

    const result = await service.getSummary(ORG_ID, {
      interval: DashboardInterval.SEVEN_DAYS,
    });

    expect(result.rangeMonths).toBe(7);
    expect(result.trend).toHaveLength(7);
  });

  it('builds daily trend buckets for the 30_days interval', async () => {
    employeeRepository.findByOrganization.mockResolvedValue([
      buildEmployee(),
    ]);
    leaveRepository.findAll.mockResolvedValue([]);
    requestRepository.findAll.mockResolvedValue([]);

    const result = await service.getSummary(ORG_ID, {
      interval: DashboardInterval.THIRTY_DAYS,
    });

    expect(result.rangeMonths).toBe(30);
    expect(result.trend).toHaveLength(30);
  });

  it('returns onboarding progress with summary and default non-onboarded list', async () => {
    const now = new Date();
    const employmentDate = new Date(now);
    employmentDate.setDate(employmentDate.getDate() - 5);

    employeeRepository.findByOrganization.mockResolvedValue([
      buildEmployee({
        employmentDate,
        employeeOnboardingSteps: [
          {
            stepId: 'step-1',
            stepName: 'Basic information',
            dueDate: DueDate.ONE_DAY_AFTER_JOINING,
            isCompleted: true,
            completedAt: now,
          },
          {
            stepId: 'step-2',
            stepName: 'Finance information',
            dueDate: DueDate.ONE_DAY_AFTER_JOINING,
            isCompleted: false,
            completedAt: null,
          },
        ],
      }),
      buildEmployee({
        _id: 'emp-no-steps',
        email: 'nosteps@example.com',
        employeeOnboardingSteps: [],
      }),
    ]);

    const result = await service.getOnboardingProgress(ORG_ID, { limit: 5 });

    expect(result.hasData).toBe(true);
    expect(result.summary.total).toBe(1);
    expect(result.summary.overdue).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe(OnboardingStatus.OVERDUE);
    expect(result.data[0].progress).toBe(50);
    expect(result.data[0].department).toBe('Engineering');
    expect(result.data[0].jobTitle).toBe('Engineer');
  });

  it('groups the current workforce by department', async () => {
    employeeRepository.findByOrganization.mockResolvedValue([
      buildEmployee({ _id: 'emp-1', departmentCode: 'eng' }),
      buildEmployee({ _id: 'emp-2', departmentCode: 'eng', email: 'two@example.com' }),
      buildEmployee({ _id: 'emp-3', departmentCode: 'design', email: 'three@example.com' }),
      buildEmployee({
        _id: 'emp-draft',
        departmentCode: 'eng',
        email: 'draft@example.com',
        status: EmployeeStatus.DRAFT,
      }),
      buildEmployee({
        _id: 'emp-terminated',
        departmentCode: 'eng',
        email: 'terminated@example.com',
        status: EmployeeStatus.TERMINATED,
      }),
    ]);

    const result = await service.getEmployeeDistribution(ORG_ID, {
      dimension: DashboardDistributionDimension.DEPARTMENT,
    });

    expect(result.hasData).toBe(true);
    expect(result.total).toBe(3);
    expect(result.data[0]).toMatchObject({
      key: 'eng',
      label: 'Engineering',
      count: 2,
      percentage: 66.7,
    });
    expect(result.data[1]).toMatchObject({
      key: 'design',
      label: 'Design',
      count: 1,
      percentage: 33.3,
    });
  });

  it('merges recent activities from employees, leave and exits', async () => {
    const now = new Date();

    employeeRepository.findByOrganization.mockResolvedValue([
      buildEmployee({
        createdAt: now,
        employeeOnboardingSteps: [
          {
            stepId: 'step-1',
            stepName: 'Basic information',
            dueDate: DueDate.ONE_DAY_AFTER_JOINING,
            isCompleted: true,
            completedAt: now,
          },
        ],
      }),
    ]);
    leaveRepository.findAll.mockResolvedValue([buildLeaveRequest()]);
    requestRepository.findAll.mockResolvedValue([buildExitRequest()]);
    exitTrackingRepository.findByRequestIds.mockResolvedValue([
      {
        requestId: '64f1b2c3d4e5f678901234d1',
        completedAt: now,
        completedByUserId: 'usr3',
        completedByName: 'Exit Admin',
      },
    ]);

    const result = await service.getRecentActivities(ORG_ID, {
      limit: 10,
      days: 90,
    });

    expect(result.hasData).toBe(true);
    expect(result.data.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        DashboardActivityType.EMPLOYEE_ADDED,
        DashboardActivityType.ONBOARDING_STEP_COMPLETED,
        DashboardActivityType.LEAVE_REQUESTED,
        DashboardActivityType.LEAVE_REVIEWED,
        DashboardActivityType.EXIT_REQUESTED,
        DashboardActivityType.EXIT_COMPLETED,
      ]),
    );
    expect(result.count).toBe(6);
  });

  it('filters recent activities by type', async () => {
    employeeRepository.findByOrganization.mockResolvedValue([
      buildEmployee({ createdAt: new Date() }),
    ]);
    leaveRepository.findAll.mockResolvedValue([]);
    requestRepository.findAll.mockResolvedValue([]);

    const result = await service.getRecentActivities(ORG_ID, {
      type: DashboardActivityType.EMPLOYEE_ADDED,
    });

    expect(result.count).toBe(1);
    expect(result.data[0].type).toBe(DashboardActivityType.EMPLOYEE_ADDED);
  });
});
