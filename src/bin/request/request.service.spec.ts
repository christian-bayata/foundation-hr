import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppException } from '../../common/response/app-exception';
import { RequestType } from '../setting/request-management/enum/request-management.enum';
import {
  EmployeeRequestStatus,
  EmployeeRequestStepAction,
  EmployeeRequestStepStatus,
} from './enum/request.enum';
import { RequestService } from './request.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const EMPLOYEE_ID = '64f1b2c3d4e5f678901234ba';
const REQUEST_ID = '64f1b2c3d4e5f678901234bb';
const WORKFLOW_ID = '64f1b2c3d4e5f678901234c0';
const STEP_ONE_ID = '64f1b2c3d4e5f678901234c1';
const STEP_TWO_ID = '64f1b2c3d4e5f678901234c2';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

const user = { userId: 'usr123', email: 'admin@example.com' };

const buildEmployee = (overrides: Record<string, any> = {}) => ({
  _id: EMPLOYEE_ID,
  organizationId: ORG_ID,
  employeeId: 'FHR0001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  avatarUrl: 'https://example.com/avatar.png',
  jobTitleCode: 'eng',
  employmentDate: new Date(2026, 0, 1),
  ...overrides,
});

const buildWorkflowResponse = (overrides: Record<string, any> = {}) => ({
  requestTypes: [
    {
      type: RequestType.EMPLOYEE_TERMINATION,
      label: 'Employee termination',
      workflows: [
        {
          id: WORKFLOW_ID,
          requestType: RequestType.EMPLOYEE_TERMINATION,
          name: 'Standard termination',
          isDefault: true,
          steps: [
            { id: STEP_ONE_ID, order: 1, responsibleParty: 'HR admin' },
            { id: STEP_TWO_ID, order: 2, responsibleParty: 'Manager' },
          ],
        },
      ],
      ...overrides,
    },
  ],
});

const buildStep = (overrides: Record<string, any> = {}) => ({
  stepId: STEP_ONE_ID,
  order: 1,
  responsibleParty: 'HR admin',
  status: EmployeeRequestStepStatus.IN_PROGRESS,
  startedAt: new Date(2026, 0, 1),
  completedAt: null,
  actedByUserId: null,
  actedByName: null,
  comment: null,
  ...overrides,
});

const buildRequest = (overrides: Record<string, any> = {}) => ({
  _id: REQUEST_ID,
  organizationId: ORG_ID,
  requestType: RequestType.EMPLOYEE_TERMINATION,
  workflowId: WORKFLOW_ID,
  workflowName: 'Standard termination',
  employeeId: EMPLOYEE_ID,
  employee: {
    employeeId: EMPLOYEE_ID,
    employeeUniqueId: 'FHR0001',
    employeeName: 'John Doe',
    email: 'john.doe@example.com',
    avatarUrl: null,
    jobTitle: 'Engineer',
    employmentDate: new Date(2026, 0, 1),
  },
  createdBy: {
    userId: user.userId,
    email: user.email,
    employeeId: null,
    name: 'Admin',
  },
  reason: null,
  effectiveDate: null,
  endDate: null,
  details: {},
  attachmentUrls: [],
  status: EmployeeRequestStatus.PENDING,
  currentStepOrder: 1,
  steps: [
    buildStep(),
    buildStep({
      stepId: STEP_TWO_ID,
      order: 2,
      responsibleParty: 'Manager',
      status: EmployeeRequestStepStatus.PENDING,
      startedAt: null,
    }),
  ],
  submittedAt: new Date(2026, 0, 1),
  completedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: new Date(2026, 0, 1),
  updatedAt: new Date(2026, 0, 1),
  ...overrides,
});

describe('RequestService', () => {
  let requestRepository: {
    create: jest.Mock<AnyPromiseFn>;
    findById: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
    deleteById: jest.Mock<AnyPromiseFn>;
    paginatedQuery: jest.Mock<AnyPromiseFn>;
    count: jest.Mock<AnyPromiseFn>;
  };
  let employeeRepository: { findById: jest.Mock<AnyPromiseFn> };
  let jobTitleRepository: { findByOrganization: jest.Mock<AnyPromiseFn> };
  let organizationDepartmentRepository: {
    findByCode: jest.Mock<AnyPromiseFn>;
  };
  let settingsDomainOrganisationService: {
    getRequestWorkflows: jest.Mock<AnyPromiseFn>;
  };
  let requestFormValidator: { validate: jest.Mock };
  let service: RequestService;

  beforeEach(() => {
    jest.clearAllMocks();

    requestRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      paginatedQuery: jest.fn(),
      count: jest.fn(),
    };
    employeeRepository = { findById: jest.fn() };
    jobTitleRepository = { findByOrganization: jest.fn() };
    organizationDepartmentRepository = { findByCode: jest.fn() };
    settingsDomainOrganisationService = { getRequestWorkflows: jest.fn() };
    requestFormValidator = {
      validate: jest.fn(
        (_type: RequestType, details?: Record<string, unknown>) =>
          details ?? {},
      ),
    };

    service = new RequestService(
      requestRepository as any,
      employeeRepository as any,
      jobTitleRepository as any,
      organizationDepartmentRepository as any,
      settingsDomainOrganisationService as any,
      requestFormValidator as any,
    );
  });

  describe('addRequest', () => {
    it('creates a request from the default workflow with a snapshot', async () => {
      const employee = buildEmployee();
      employeeRepository.findById.mockResolvedValue(employee);
      jobTitleRepository.findByOrganization.mockResolvedValue([
        { code: 'eng', name: 'Engineer' },
      ]);
      settingsDomainOrganisationService.getRequestWorkflows.mockResolvedValue(
        buildWorkflowResponse(),
      );
      requestRepository.create.mockImplementation(async (data: any) => ({
        ...data,
        _id: REQUEST_ID,
        createdAt: new Date(2026, 0, 1),
        updatedAt: new Date(2026, 0, 1),
      }));

      const result = await service.addRequest(ORG_ID, user, {
        requestType: RequestType.EMPLOYEE_TERMINATION,
        employeeId: EMPLOYEE_ID,
        terminationDate: '2026-02-01',
        terminationType: 'resignation',
        reasonForTermination: 'Resignation',
        reason: 'Resignation',
        effectiveDate: '2026-02-01',
      });

      const created = requestRepository.create.mock.calls[0][0] as any;
      expect(created.workflowId).toBe(WORKFLOW_ID);
      expect(created.workflowName).toBe('Standard termination');
      expect(created.employee).toEqual({
        employeeId: EMPLOYEE_ID,
        employeeUniqueId: 'FHR0001',
        employeeName: 'John Doe',
        email: 'john.doe@example.com',
        avatarUrl: 'https://example.com/avatar.png',
        jobTitle: 'Engineer',
        departmentCode: null,
        department: null,
        lineManagerId: null,
        lineManager: null,
        employmentDate: new Date(2026, 0, 1),
      });
      expect(created.steps).toHaveLength(2);
      expect(created.steps[0].status).toBe(
        EmployeeRequestStepStatus.IN_PROGRESS,
      );
      expect(created.steps[1].status).toBe(EmployeeRequestStepStatus.PENDING);
      expect(created.steps[1].startedAt).toBeNull();
      expect(created.status).toBe(EmployeeRequestStatus.PENDING);
      expect(result.id).toBe(REQUEST_ID);
      expect(result.title).toBe('Employee termination for John Doe');
      expect(result.currentStep).toEqual({
        stepId: STEP_ONE_ID,
        responsibleParty: 'HR admin',
        number: 1,
        order: 1,
        total: 2,
      });
      expect(result.progress).toBe(0);
      expect(result.canUpdate).toBe(true);
      expect(result.canCancel).toBe(true);
      expect(
        settingsDomainOrganisationService.getRequestWorkflows,
      ).toHaveBeenCalledWith(ORG_ID, RequestType.EMPLOYEE_TERMINATION);
    });

    it('uses the selected workflow when a workflow ID is provided', async () => {
      employeeRepository.findById.mockResolvedValue(buildEmployee());
      jobTitleRepository.findByOrganization.mockResolvedValue([]);
      settingsDomainOrganisationService.getRequestWorkflows.mockResolvedValue({
        requestTypes: [
          {
            type: RequestType.EMPLOYEE_TERMINATION,
            label: 'Employee termination',
            workflows: [
              buildWorkflowResponse().requestTypes[0].workflows[0],
              {
                id: '64f1b2c3d4e5f678901234c9',
                requestType: RequestType.EMPLOYEE_TERMINATION,
                name: 'Custom termination',
                isDefault: false,
                steps: [{ id: STEP_ONE_ID, order: 1, responsibleParty: null }],
              },
            ],
          },
        ],
      });
      requestRepository.create.mockImplementation(async (data: any) => ({
        ...data,
        _id: REQUEST_ID,
      }));

      const result = await service.addRequest(ORG_ID, user, {
        requestType: RequestType.EMPLOYEE_TERMINATION,
        employeeId: EMPLOYEE_ID,
        workflowId: '64f1b2c3d4e5f678901234c9',
        terminationDate: '2026-02-01',
        terminationType: 'resignation',
        reasonForTermination: 'Resignation',
      });

      expect(result.workflow).toEqual({
        id: '64f1b2c3d4e5f678901234c9',
        name: 'Custom termination',
      });
    });

    it('requires an employee when the current user has no employee profile', async () => {
      await expect(
        service.addRequest(ORG_ID, user, {
          requestType: RequestType.EMPLOYEE_TERMINATION,
        }),
      ).rejects.toThrow(AppException);

      expect(requestRepository.create).not.toHaveBeenCalled();
    });

    it('rejects an employee from another organization', async () => {
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ organizationId: 'other-org' }),
      );

      await expect(
        service.addRequest(ORG_ID, user, {
          requestType: RequestType.EMPLOYEE_TERMINATION,
          employeeId: EMPLOYEE_ID,
        }),
      ).rejects.toThrow(AppException);
    });

    it('normalizes details and snapshots department and line manager', async () => {
      const managerId = '64f1b2c3d4e5f678901234bd';
      const manager = buildEmployee({
        _id: managerId,
        employeeId: 'FHR0002',
        firstName: 'Jane',
        lastName: 'Boss',
        email: 'jane.boss@example.com',
      });
      employeeRepository.findById.mockImplementation(async (id: string) =>
        id === managerId
          ? manager
          : buildEmployee({ departmentCode: 'ENG', supervisor: managerId }),
      );
      jobTitleRepository.findByOrganization.mockResolvedValue([
        { code: 'eng', name: 'Engineer' },
      ]);
      organizationDepartmentRepository.findByCode.mockResolvedValue({
        code: 'ENG',
        name: 'Engineering',
      });
      settingsDomainOrganisationService.getRequestWorkflows.mockResolvedValue(
        buildWorkflowResponse(),
      );
      requestRepository.create.mockImplementation(async (data: any) => ({
        ...data,
        _id: REQUEST_ID,
      }));
      const details = {
        terminationDate: '2026-02-01',
        terminationType: 'resignation',
        reasonForTermination: 'Resignation',
      };

      await service.addRequest(ORG_ID, user, {
        requestType: RequestType.EMPLOYEE_TERMINATION,
        employeeId: EMPLOYEE_ID,
        ...details,
      });

      expect(requestFormValidator.validate).not.toHaveBeenCalled();
      expect(organizationDepartmentRepository.findByCode).toHaveBeenCalledWith(
        ORG_ID,
        'ENG',
      );
      const created = requestRepository.create.mock.calls[0][0] as any;
      expect(created.employee).toEqual(
        expect.objectContaining({
          departmentCode: 'ENG',
          department: 'Engineering',
          lineManagerId: managerId,
          lineManager: 'Jane Boss',
        }),
      );
      expect(created.details).toEqual(details);
    });

    it('extracts only form fields and ignores client employee context', async () => {
      employeeRepository.findById.mockResolvedValue(
        buildEmployee({ firstName: 'Server', lastName: 'Employee' }),
      );
      jobTitleRepository.findByOrganization.mockResolvedValue([]);
      settingsDomainOrganisationService.getRequestWorkflows.mockResolvedValue(
        buildWorkflowResponse(),
      );
      requestRepository.create.mockImplementation(async (data: any) => ({
        ...data,
        _id: REQUEST_ID,
      }));

      await service.addRequest(ORG_ID, user, {
        requestType: RequestType.EMPLOYEE_TERMINATION,
        employeeId: EMPLOYEE_ID,
        employeeName: 'Spoofed Name',
        department: 'Spoofed Department',
        jobTitle: 'Spoofed Title',
        lineManagerId: 'spoofed-manager',
        terminationDate: '2026-02-01',
        terminationType: 'resignation',
        reasonForTermination: '  Resignation  ',
      });

      const created = requestRepository.create.mock.calls[0][0] as any;
      expect(created.details).toEqual({
        terminationDate: '2026-02-01',
        terminationType: 'resignation',
        reasonForTermination: 'Resignation',
      });
      expect(created.employee.employeeName).toBe('Server Employee');
      expect(created.employee.department).toBeNull();
      expect(created.employee.lineManagerId).toBeNull();
    });
  });

  describe('getYourRequests', () => {
    it('scopes the query to requests created by or about the current user', async () => {
      requestRepository.paginatedQuery.mockResolvedValue({
        items: [buildRequest()],
        total: 1,
      });

      const result = await service.getYourRequests(
        ORG_ID,
        { ...user, employeeId: EMPLOYEE_ID },
        { batch: 2, limit: 5 },
      );

      const where = requestRepository.paginatedQuery.mock.calls[0][0] as any;
      expect(where).toEqual({
        $and: [
          { organizationId: ORG_ID },
          {
            $or: [
              { 'createdBy.userId': user.userId },
              { employeeId: EMPLOYEE_ID },
            ],
          },
        ],
      });
      expect(requestRepository.paginatedQuery).toHaveBeenCalledWith(
        where,
        { createdAt: -1 },
        2,
        5,
      );
      expect(result).toEqual({
        data: [
          expect.objectContaining({
            id: REQUEST_ID,
            requestType: RequestType.EMPLOYEE_TERMINATION,
            status: EmployeeRequestStatus.PENDING,
          }),
        ],
        count: 1,
        batch: 2,
        limit: 5,
      });
    });
  });

  describe('getEmployeeRequests', () => {
    it('excludes the current user employee from employee requests', async () => {
      requestRepository.paginatedQuery.mockResolvedValue({
        items: [],
        total: 0,
      });

      await service.getEmployeeRequests(
        ORG_ID,
        { ...user, employeeId: EMPLOYEE_ID },
        { status: EmployeeRequestStatus.PENDING },
      );

      const where = requestRepository.paginatedQuery.mock.calls[0][0] as any;
      expect(where).toEqual({
        $and: [
          { organizationId: ORG_ID },
          { employeeId: { $ne: EMPLOYEE_ID } },
          { status: EmployeeRequestStatus.PENDING },
        ],
      });
    });
  });

  describe('updateRequestStep', () => {
    it('advances the request to the next step when approved', async () => {
      const request = buildRequest();
      requestRepository.findById.mockResolvedValue(request);
      requestRepository.updateById.mockImplementation(
        async (_id: string, updates: any) => ({ ...request, ...updates }),
      );

      const result = await service.updateRequestStep(ORG_ID, user, REQUEST_ID, {
        stepId: STEP_ONE_ID,
        action: EmployeeRequestStepAction.APPROVE,
      });

      const updates = requestRepository.updateById.mock.calls[0][1] as any;
      expect(updates.status).toBe(EmployeeRequestStatus.IN_PROGRESS);
      expect(updates.currentStepOrder).toBe(2);
      expect(updates.completedAt).toBeNull();
      expect(updates.steps[0]).toEqual(
        expect.objectContaining({
          status: EmployeeRequestStepStatus.APPROVED,
          actedByUserId: user.userId,
          actedByName: user.email,
        }),
      );
      expect(updates.steps[1].status).toBe(
        EmployeeRequestStepStatus.IN_PROGRESS,
      );
      expect(updates.steps[1].startedAt).toBeInstanceOf(Date);
      expect(result.currentStep).toEqual(
        expect.objectContaining({ stepId: STEP_TWO_ID, number: 2 }),
      );
    });

    it('completes the request when the final step is approved', async () => {
      const request = buildRequest({
        status: EmployeeRequestStatus.IN_PROGRESS,
        currentStepOrder: 2,
        steps: [
          buildStep({ status: EmployeeRequestStepStatus.APPROVED }),
          buildStep({
            stepId: STEP_TWO_ID,
            order: 2,
            status: EmployeeRequestStepStatus.IN_PROGRESS,
          }),
        ],
      });
      requestRepository.findById.mockResolvedValue(request);
      requestRepository.updateById.mockImplementation(
        async (id: string, updates: any) => ({ ...request, ...updates }),
      );

      const result = await service.updateRequestStep(ORG_ID, user, REQUEST_ID, {
        stepId: STEP_TWO_ID,
        action: EmployeeRequestStepAction.APPROVE,
      });

      const updates = requestRepository.updateById.mock.calls[0][1] as any;
      expect(updates.status).toBe(EmployeeRequestStatus.APPROVED);
      expect(updates.completedAt).toBeInstanceOf(Date);
      expect(result.status).toBe(EmployeeRequestStatus.APPROVED);
      expect(result.progress).toBe(100);
      expect(result.currentStep).toBeNull();
    });

    it('rejects the request when a step is rejected', async () => {
      const request = buildRequest();
      requestRepository.findById.mockResolvedValue(request);
      requestRepository.updateById.mockImplementation(
        async (id: string, updates: any) => ({ ...request, ...updates }),
      );

      const result = await service.updateRequestStep(ORG_ID, user, REQUEST_ID, {
        stepId: STEP_ONE_ID,
        action: EmployeeRequestStepAction.REJECT,
        comment: 'Missing documents',
      });

      const updates = requestRepository.updateById.mock.calls[0][1] as any;
      expect(updates.status).toBe(EmployeeRequestStatus.REJECTED);
      expect(updates.completedAt).toBeInstanceOf(Date);
      expect(updates.steps[1].status).toBe(EmployeeRequestStepStatus.PENDING);
      expect(result.status).toBe(EmployeeRequestStatus.REJECTED);
      expect(result.currentStep).toBeNull();
      expect(result.steps[0].comment).toBe('Missing documents');
    });

    it('rejects a step that is not the current step', async () => {
      requestRepository.findById.mockResolvedValue(buildRequest());

      await expect(
        service.updateRequestStep(ORG_ID, user, REQUEST_ID, {
          stepId: STEP_TWO_ID,
          action: EmployeeRequestStepAction.APPROVE,
        }),
      ).rejects.toThrow(AppException);

      expect(requestRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('cancelRequest', () => {
    it('cancels a pending request', async () => {
      const request = buildRequest();
      requestRepository.findById.mockResolvedValue(request);
      requestRepository.updateById.mockImplementation(
        async (id: string, updates: any) => ({ ...request, ...updates }),
      );

      const result = await service.cancelRequest(ORG_ID, REQUEST_ID, {
        reason: 'No longer needed',
      });

      expect(requestRepository.updateById).toHaveBeenCalledWith(
        REQUEST_ID,
        expect.objectContaining({
          status: EmployeeRequestStatus.CANCELLED,
          cancellationReason: 'No longer needed',
          cancelledAt: expect.any(Date),
        }),
      );
      expect(result.status).toBe(EmployeeRequestStatus.CANCELLED);
      expect(result.canCancel).toBe(false);
    });

    it('does not cancel a completed request', async () => {
      requestRepository.findById.mockResolvedValue(
        buildRequest({ status: EmployeeRequestStatus.APPROVED }),
      );

      await expect(
        service.cancelRequest(ORG_ID, REQUEST_ID, {}),
      ).rejects.toThrow(AppException);

      expect(requestRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('updateRequest', () => {
    it('updates editable fields on a pending request', async () => {
      const request = buildRequest();
      requestRepository.findById.mockResolvedValue(request);
      requestRepository.updateById.mockImplementation(
        async (id: string, updates: any) => ({ ...request, ...updates }),
      );

      const result = await service.updateRequest(ORG_ID, REQUEST_ID, {
        reason: 'Updated reason',
        effectiveDate: '2026-03-01',
        attachmentUrls: ['https://example.com/doc.pdf'],
      });

      expect(requestRepository.updateById).toHaveBeenCalledWith(REQUEST_ID, {
        reason: 'Updated reason',
        effectiveDate: new Date(2026, 2, 1),
        attachmentUrls: ['https://example.com/doc.pdf'],
      });
      expect(result.reason).toBe('Updated reason');
    });

    it('validates form details when updating a pending request', async () => {
      const request = buildRequest();
      const details = {
        terminationDate: '2026-02-01',
        terminationType: 'resignation',
        reasonForTermination: 'Resignation',
      };
      requestRepository.findById.mockResolvedValue(request);
      requestRepository.updateById.mockImplementation(
        async (id: string, updates: any) => ({ ...request, ...updates }),
      );

      await service.updateRequest(ORG_ID, REQUEST_ID, { details });

      expect(requestFormValidator.validate).toHaveBeenCalledWith(
        RequestType.EMPLOYEE_TERMINATION,
        details,
      );
      expect(requestRepository.updateById).toHaveBeenCalledWith(REQUEST_ID, {
        details,
      });
    });

    it('merges partial details with the stored details before validating', async () => {
      const storedDetails = {
        terminationDate: '2026-02-01',
        terminationType: 'resignation',
        reasonForTermination: 'Resignation',
      };
      const request = buildRequest({ details: storedDetails });
      requestRepository.findById.mockResolvedValue(request);
      requestRepository.updateById.mockImplementation(
        async (id: string, updates: any) => ({ ...request, ...updates }),
      );

      await service.updateRequest(ORG_ID, REQUEST_ID, {
        details: { reasonForTermination: 'Updated resignation reason' },
      });

      const mergedDetails = {
        ...storedDetails,
        reasonForTermination: 'Updated resignation reason',
      };
      expect(requestFormValidator.validate).toHaveBeenCalledWith(
        RequestType.EMPLOYEE_TERMINATION,
        mergedDetails,
      );
      expect(requestRepository.updateById).toHaveBeenCalledWith(REQUEST_ID, {
        details: mergedDetails,
      });
    });

    it('does not update a request that is no longer pending', async () => {
      requestRepository.findById.mockResolvedValue(
        buildRequest({ status: EmployeeRequestStatus.APPROVED }),
      );

      await expect(
        service.updateRequest(ORG_ID, REQUEST_ID, { reason: 'Nope' }),
      ).rejects.toThrow(AppException);

      expect(requestRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('deleteRequest', () => {
    it('deletes a cancelled request', async () => {
      requestRepository.findById.mockResolvedValue(
        buildRequest({ status: EmployeeRequestStatus.CANCELLED }),
      );
      requestRepository.deleteById.mockResolvedValue(buildRequest());

      const result = await service.deleteRequest(ORG_ID, REQUEST_ID);

      expect(requestRepository.deleteById).toHaveBeenCalledWith(REQUEST_ID);
      expect(result).toBe('Request deleted');
    });

    it('does not delete an active request', async () => {
      requestRepository.findById.mockResolvedValue(buildRequest());

      await expect(service.deleteRequest(ORG_ID, REQUEST_ID)).rejects.toThrow(
        AppException,
      );

      expect(requestRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe('getRequestTypes', () => {
    it('summarizes workflows per request type', async () => {
      settingsDomainOrganisationService.getRequestWorkflows.mockResolvedValue(
        buildWorkflowResponse(),
      );

      const result = await service.getRequestTypes(ORG_ID);

      expect(result.requestTypes[0]).toEqual({
        type: RequestType.EMPLOYEE_TERMINATION,
        label: 'Employee termination',
        hasWorkflow: true,
        defaultWorkflowId: WORKFLOW_ID,
        defaultWorkflowName: 'Standard termination',
        workflows: [
          {
            id: WORKFLOW_ID,
            name: 'Standard termination',
            isDefault: true,
            stepCount: 2,
          },
        ],
      });
    });
  });

  describe('getRequestForm', () => {
    it('returns the form definition for a request type', () => {
      const form = service.getRequestForm(RequestType.EMPLOYEE_TERMINATION);

      expect(form.requestType).toBe(RequestType.EMPLOYEE_TERMINATION);
      expect(form.label).toBe('Employee termination');
      expect(form.fields.map((field) => field.key)).toEqual([
        'terminationDate',
        'terminationType',
        'reasonForTermination',
        'exitInterviewDate',
      ]);
    });
  });

  describe('getSummary', () => {
    it('returns counts for your requests and employee requests', async () => {
      requestRepository.count.mockResolvedValue(2);

      const result = await service.getSummary(ORG_ID, {
        ...user,
        employeeId: EMPLOYEE_ID,
      });

      expect(requestRepository.count).toHaveBeenCalledTimes(10);
      expect(result.your).toEqual({
        total: 10,
        pending: 2,
        in_progress: 2,
        approved: 2,
        rejected: 2,
        cancelled: 2,
      });
      expect(result.employee).toEqual(result.your);
    });
  });
});
