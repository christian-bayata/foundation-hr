import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppException } from '../../common/response/app-exception';
import { LeaveService } from './leave.service';
import { LeaveRequestStatus } from './enum/leave.enum';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const EMPLOYEE_ID = '64f1b2c3d4e5f678901234ba';
const EMPLOYEE_TWO_ID = '64f1b2c3d4e5f678901234bb';
const DRAFT_EMPLOYEE_ID = '64f1b2c3d4e5f678901234bc';
const LEAVE_REQUEST_ID = '64f1b2c3d4e5f678901234bd';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

const user = { userId: 'usr123', email: 'admin@example.com' };

const categories = [
  { id: 'annual_leave', label: 'Annual leave', entitlementDays: 20 },
  { id: 'sick_leave', label: 'Sick leave', entitlementDays: 5 },
];

const buildEmployee = (overrides: Record<string, any> = {}) => ({
  _id: EMPLOYEE_ID,
  organizationId: ORG_ID,
  employeeId: 'FHR0001',
  employeeUniqueId: 'E-0001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  avatarUrl: null,
  jobTitleCode: 'eng',
  departmentCode: 'eng',
  status: 'active',
  ...overrides,
});

const today = new Date();
const approvedStart = new Date(today);
approvedStart.setDate(today.getDate() - 1);
const approvedEnd = new Date(today);
approvedEnd.setDate(today.getDate() + 1);

const buildLeaveRequest = (overrides: Record<string, any> = {}) => ({
  _id: LEAVE_REQUEST_ID,
  organizationId: ORG_ID,
  employeeId: EMPLOYEE_ID,
  employee: {
    employeeId: EMPLOYEE_ID,
    employeeUniqueId: 'E-0001',
    employeeName: 'John Doe',
    email: 'john.doe@example.com',
    avatarUrl: null,
    jobTitle: 'Engineer',
    departmentCode: 'eng',
    department: 'Engineering',
  },
  leaveCategoryId: 'annual_leave',
  leaveCategory: { id: 'annual_leave', label: 'Annual leave' },
  startDate: approvedStart,
  endDate: approvedEnd,
  durationDays: 3,
  reliefStaff: null,
  note: 'Family trip',
  attachmentUrls: [],
  status: LeaveRequestStatus.PENDING,
  requestedAt: new Date(),
  reviewedBy: null,
  reviewedAt: null,
  reviewComment: null,
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('LeaveService', () => {
  let leaveRequestRepository: {
    create: jest.Mock<AnyPromiseFn>;
    findById: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
    paginatedQuery: jest.Mock<AnyPromiseFn>;
    findAll: jest.Mock<AnyPromiseFn>;
    findForSummary: jest.Mock<AnyPromiseFn>;
  };
  let leaveBalanceRepository: {
    findForEmployeesYear: jest.Mock<AnyPromiseFn>;
    upsertDefaults: jest.Mock<AnyPromiseFn>;
  };
  let employeeRepository: {
    findById: jest.Mock<AnyPromiseFn>;
    findByOrganization: jest.Mock<AnyPromiseFn>;
  };
  let organizationRepository: { findOrg: jest.Mock<AnyPromiseFn> };
  let organizationDepartmentRepository: {
    findByOrganization: jest.Mock<AnyPromiseFn>;
  };
  let jobTitleRepository: { findByOrganization: jest.Mock<AnyPromiseFn> };
  let service: LeaveService;

  beforeEach(() => {
    jest.clearAllMocks();

    leaveRequestRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      paginatedQuery: jest.fn(),
      findAll: jest.fn(),
      findForSummary: jest.fn(),
    };
    leaveBalanceRepository = {
      findForEmployeesYear: jest.fn(),
      upsertDefaults: jest.fn(),
    };
    employeeRepository = {
      findById: jest.fn(),
      findByOrganization: jest.fn(),
    };
    organizationRepository = { findOrg: jest.fn() };
    organizationDepartmentRepository = { findByOrganization: jest.fn() };
    jobTitleRepository = { findByOrganization: jest.fn() };

    service = new LeaveService(
      leaveRequestRepository as any,
      leaveBalanceRepository as any,
      employeeRepository as any,
      organizationRepository as any,
      organizationDepartmentRepository as any,
      jobTitleRepository as any,
    );
  });

  describe('listRequests', () => {
    it('returns paginated leave requests scoped to the organization', async () => {
      leaveRequestRepository.paginatedQuery.mockResolvedValue({
        items: [buildLeaveRequest()],
        total: 1,
      });

      const result = await service.listRequests(ORG_ID, {
        batch: 1,
        limit: 10,
        status: LeaveRequestStatus.PENDING,
        search: 'john',
      });

      expect(result.count).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: LEAVE_REQUEST_ID,
        status: LeaveRequestStatus.PENDING,
        leaveCategory: { id: 'annual_leave', label: 'Annual leave' },
        durationDays: 3,
      });

      const [where, sort, page, pageSize] =
        leaveRequestRepository.paginatedQuery.mock.calls[0];
      expect(where).toMatchObject({
        $and: [
          { organizationId: ORG_ID },
          { status: LeaveRequestStatus.PENDING },
          {
            $or: [
              { 'employee.employeeName': { $regex: 'john', $options: 'i' } },
              { 'employee.email': { $regex: 'john', $options: 'i' } },
              {
                'employee.employeeUniqueId': {
                  $regex: 'john',
                  $options: 'i',
                },
              },
              { 'leaveCategory.label': { $regex: 'john', $options: 'i' } },
            ],
          },
        ],
      });
      expect(sort).toEqual({ createdAt: -1 });
      expect(page).toBe(1);
      expect(pageSize).toBe(10);
    });

    it('filters requests by an overlapping date range', async () => {
      leaveRequestRepository.paginatedQuery.mockResolvedValue({
        items: [],
        total: 0,
      });

      await service.listRequests(ORG_ID, {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      });

      const [where] = leaveRequestRepository.paginatedQuery.mock.calls[0];
      expect(where).toEqual({
        $and: [
          { organizationId: ORG_ID },
          { endDate: { $gte: new Date(2026, 2, 1) } },
          {
            startDate: {
              $lte: new Date(2026, 2, 31, 23, 59, 59, 999),
            },
          },
        ],
      });
    });
  });

  describe('retrieveRequest', () => {
    it('returns the leave request detail', async () => {
      leaveRequestRepository.findById.mockResolvedValue(buildLeaveRequest());

      const result = await service.retrieveRequest(ORG_ID, {
        leaveRequestId: LEAVE_REQUEST_ID,
      });

      expect(result.employee).toMatchObject({
        employeeId: EMPLOYEE_ID,
        employeeName: 'John Doe',
        department: 'Engineering',
      });
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(leaveRequestRepository.findById).toHaveBeenCalledWith(
        ORG_ID,
        LEAVE_REQUEST_ID,
      );
    });

    it('throws when the leave request does not exist', async () => {
      leaveRequestRepository.findById.mockResolvedValue(null);

      await expect(
        service.retrieveRequest(ORG_ID, {
          leaveRequestId: LEAVE_REQUEST_ID,
        }),
      ).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('approveRequest', () => {
    it('approves a pending leave request', async () => {
      const request = buildLeaveRequest();
      leaveRequestRepository.findById.mockResolvedValue(request);
      leaveRequestRepository.updateById.mockResolvedValue({
        ...request,
        status: LeaveRequestStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: {
          userId: user.userId,
          email: user.email,
          name: null,
        },
      });

      const result = await service.approveRequest(
        ORG_ID,
        user,
        { leaveRequestId: LEAVE_REQUEST_ID, comment: 'Enjoy' },
      );

      expect(result.status).toBe(LeaveRequestStatus.APPROVED);
      expect(leaveRequestRepository.updateById).toHaveBeenCalledWith(
        LEAVE_REQUEST_ID,
        expect.objectContaining({
          status: LeaveRequestStatus.APPROVED,
          reviewComment: 'Enjoy',
          rejectionReason: null,
          reviewedBy: {
            userId: user.userId,
            email: user.email,
            name: null,
          },
        }),
      );
    });

    it('rejects a leave request that is not pending', async () => {
      leaveRequestRepository.findById.mockResolvedValue(
        buildLeaveRequest({ status: LeaveRequestStatus.APPROVED }),
      );

      await expect(
        service.approveRequest(ORG_ID, user, {
          leaveRequestId: LEAVE_REQUEST_ID,
        }),
      ).rejects.toBeInstanceOf(AppException);
      expect(leaveRequestRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('rejectRequest', () => {
    it('rejects a pending leave request with a reason', async () => {
      const request = buildLeaveRequest();
      leaveRequestRepository.findById.mockResolvedValue(request);
      leaveRequestRepository.updateById.mockResolvedValue({
        ...request,
        status: LeaveRequestStatus.REJECTED,
        rejectionReason: 'Insufficient balance',
      });

      const result = await service.rejectRequest(
        ORG_ID,
        user,
        {
          leaveRequestId: LEAVE_REQUEST_ID,
          reason: 'Insufficient balance',
        },
      );

      expect(result.status).toBe(LeaveRequestStatus.REJECTED);
      expect(leaveRequestRepository.updateById).toHaveBeenCalledWith(
        LEAVE_REQUEST_ID,
        expect.objectContaining({
          status: LeaveRequestStatus.REJECTED,
          rejectionReason: 'Insufficient balance',
        }),
      );
    });

    it('rejects a leave request that is not pending', async () => {
      leaveRequestRepository.findById.mockResolvedValue(
        buildLeaveRequest({ status: LeaveRequestStatus.REJECTED }),
      );

      await expect(
        service.rejectRequest(ORG_ID, user, {
          leaveRequestId: LEAVE_REQUEST_ID,
          reason: 'Duplicate request',
        }),
      ).rejects.toBeInstanceOf(AppException);
      expect(leaveRequestRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('builds category totals and per-employee leave balances', async () => {
      const year = new Date().getFullYear();
      organizationRepository.findOrg.mockResolvedValue({
        leaveManagement: { leaveCategories: categories },
      });
      employeeRepository.findByOrganization.mockResolvedValue([
        buildEmployee(),
        buildEmployee({
          _id: EMPLOYEE_TWO_ID,
          employeeId: 'FHR0002',
          employeeUniqueId: 'E-0002',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@example.com',
        }),
        buildEmployee({
          _id: DRAFT_EMPLOYEE_ID,
          employeeId: 'FHR0003',
          firstName: 'Draft',
          status: 'draft',
        }),
      ]);
      leaveBalanceRepository.findForEmployeesYear.mockResolvedValue([
        {
          employeeId: EMPLOYEE_ID,
          leaveCategoryId: 'annual_leave',
          entitledDays: 20,
          carriedOverDays: 0,
          adjustmentDays: 0,
        },
      ]);
      leaveRequestRepository.findForSummary.mockResolvedValue([
        buildLeaveRequest({
          status: LeaveRequestStatus.APPROVED,
          durationDays: 3,
        }),
        buildLeaveRequest({
          _id: '64f1b2c3d4e5f678901234be',
          status: LeaveRequestStatus.PENDING,
          durationDays: 2,
        }),
        buildLeaveRequest({
          _id: '64f1b2c3d4e5f678901234bf',
          employeeId: EMPLOYEE_TWO_ID,
          leaveCategoryId: 'sick_leave',
          leaveCategory: { id: 'sick_leave', label: 'Sick leave' },
          status: LeaveRequestStatus.REJECTED,
          durationDays: 2,
        }),
      ]);
      organizationDepartmentRepository.findByOrganization.mockResolvedValue([
        { code: 'eng', name: 'Engineering' },
      ]);
      jobTitleRepository.findByOrganization.mockResolvedValue([
        { code: 'eng', name: 'Engineer' },
      ]);

      const result = await service.getSummary(ORG_ID, { year });

      expect(result.year).toBe(year);
      expect(result.totalEmployees).toBe(2);
      expect(result.onLeave).toBe(1);
      expect(result.pendingRequests).toBe(1);
      expect(result.approvedRequests).toBe(1);
      expect(result.rejectedRequests).toBe(1);
      expect(leaveBalanceRepository.upsertDefaults).toHaveBeenCalledWith(
        ORG_ID,
        year,
        expect.arrayContaining([
          {
            employeeId: EMPLOYEE_ID,
            leaveCategoryId: 'annual_leave',
            entitledDays: 20,
          },
          {
            employeeId: EMPLOYEE_TWO_ID,
            leaveCategoryId: 'sick_leave',
            entitledDays: 5,
          },
        ]),
      );

      expect(result.categoryTotals).toEqual([
        {
          leaveCategoryId: 'annual_leave',
          label: 'Annual leave',
          entitledDays: 40,
          usedDays: 3,
          pendingDays: 2,
          remainingDays: 35,
        },
        {
          leaveCategoryId: 'sick_leave',
          label: 'Sick leave',
          entitledDays: 10,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: 10,
        },
      ]);

      const john = result.data.find(
        (employee: any) => employee.employeeId === EMPLOYEE_ID,
      );
      const jane = result.data.find(
        (employee: any) => employee.employeeId === EMPLOYEE_TWO_ID,
      );

      expect(result.data).toHaveLength(2);
      expect(john).toMatchObject({
        employeeName: 'John Doe',
        department: 'Engineering',
        jobTitle: 'Engineer',
        totals: {
          entitledDays: 25,
          usedDays: 3,
          pendingDays: 2,
          remainingDays: 20,
        },
      });
      expect(jane).toMatchObject({
        employeeName: 'Jane Doe',
        totals: {
          entitledDays: 25,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: 25,
        },
      });
    });

    it('defaults to the current year and paginates employees', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        leaveManagement: { leaveCategories: [] },
      });
      employeeRepository.findByOrganization.mockResolvedValue([
        buildEmployee(),
      ]);
      leaveBalanceRepository.findForEmployeesYear.mockResolvedValue([]);
      leaveRequestRepository.findForSummary.mockResolvedValue([]);
      organizationDepartmentRepository.findByOrganization.mockResolvedValue(
        [],
      );
      jobTitleRepository.findByOrganization.mockResolvedValue([]);

      const result = await service.getSummary(ORG_ID, {});

      expect(result.year).toBe(new Date().getFullYear());
      expect(result.categoryTotals).toEqual([]);
      expect(result.data[0].leaveBalances).toEqual([]);
    });
  });

  describe('exportRequests', () => {
    it('builds an escaped CSV export', async () => {
      leaveRequestRepository.findAll.mockResolvedValue([
        buildLeaveRequest({
          status: LeaveRequestStatus.APPROVED,
          note: 'Needs "rest", please',
          reviewedBy: {
            userId: user.userId,
            email: user.email,
            name: 'Admin User',
          },
          reviewedAt: new Date(2026, 2, 1),
        }),
      ]);

      const result = await service.exportRequests(ORG_ID, {
        status: LeaveRequestStatus.APPROVED,
      });

      expect(result.filename).toMatch(/^leave-requests-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(result.content.split('\r\n')[0]).toBe(
        'Employee,Employee ID,Email,Department,Leave type,Duration,Start date,End date,Note,Requested on,Status,Reviewer,Reviewed date',
      );
      expect(result.content).toContain('John Doe,E-0001,john.doe@example.com');
      expect(result.content).toContain('"Needs ""rest"", please"');
      expect(result.content).toContain('Admin User');
      expect(leaveRequestRepository.findAll).toHaveBeenCalledWith(
        {
          $and: [
            { organizationId: ORG_ID },
            { status: LeaveRequestStatus.APPROVED },
          ],
        },
        { createdAt: -1 },
      );
    });
  });
});
