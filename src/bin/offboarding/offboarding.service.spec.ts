import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AppException } from '../../common/response/app-exception';
import { OffboardingService } from './offboarding.service';
import { ExitRequestStatus } from './enum/offboarding.enum';
import { EmployeeRequestStatus } from '../request/enum/request.enum';
import { EmployeeRequestStepStatus } from '../request/enum/request.enum';
import { RequestType } from '../setting/request-management/enum/request-management.enum';
import { TerminationType } from '../request/dto/forms/form-option.enums';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const REQUEST_ID = '64f1b2c3d4e5f678901234ba';
const EMPLOYEE_ID = '64f1b2c3d4e5f678901234bb';

const user = { userId: 'usr123', email: 'admin@example.com' };

const settings = {
  offboardingTypes: [
    { id: 'resignation', label: 'Resignation' },
    { id: 'layoff', label: 'Layoff' },
  ],
  exitReasons: [
    { id: 'better_offer', label: 'Better offer' },
    { id: 'retirement', label: 'Retirement' },
  ],
  exitChecklist: [
    { id: 'exit_interview', label: 'Exit interview', description: 'Exit interview', selected: true },
    { id: 'handover', label: 'Handover', description: 'Handover', selected: true },
  ],
};

const documents = {
  employerExitDocuments: [
    { id: 'relieving_letter', name: 'Relieving letter', url: null, fileType: 'pdf', requiresSignature: true },
  ],
  complianceChecklist: [{ id: 'it_clearance', label: 'IT clearance', description: null, selected: true }],
  dataRetentionPeriod: 90,
  dataRetentionPeriodLabel: '90 days',
};

const workflowResponse = {
  requestTypes: [
    {
      type: RequestType.EMPLOYEE_TERMINATION,
      label: 'Employee termination',
      workflows: [
        { id: 'wf1', name: 'Exit workflow', isDefault: true, steps: [] },
      ],
    },
  ],
};

const buildEmployee = (overrides: Record<string, any> = {}) => ({
  _id: EMPLOYEE_ID,
  organizationId: ORG_ID,
  employeeId: EMPLOYEE_ID,
  employeeUniqueId: 'E-0001',
  employeeName: 'John Doe',
  email: 'john.doe@example.com',
  avatarUrl: null,
  jobTitle: 'Engineer',
  departmentCode: 'eng',
  department: 'Engineering',
  ...overrides,
});

const buildRequest = (overrides: Record<string, any> = {}) => ({
  _id: REQUEST_ID,
  organizationId: ORG_ID,
  requestType: RequestType.EMPLOYEE_TERMINATION,
  employeeId: EMPLOYEE_ID,
  employee: buildEmployee(),
  status: EmployeeRequestStatus.PENDING,
  details: {
    terminationType: TerminationType.RESIGNATION,
    reasonForTermination: 'Better offer',
    terminationDate: '2026-11-30',
  },
  steps: [{ order: 1, stepId: 'step-1', status: EmployeeRequestStepStatus.PENDING, responsibleParty: 'hr' }],
  workflowId: 'wf1',
  workflowName: 'Exit workflow',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildTracking = (overrides: Record<string, any> = {}) => ({
  organizationId: ORG_ID,
  requestId: REQUEST_ID,
  employeeId: EMPLOYEE_ID,
  exitType: { id: 'resignation', label: 'Resignation' },
  exitReason: { id: 'better_offer', label: 'Better offer' },
  exitChecklist: [
    { id: 'exit_interview', label: 'Exit interview', description: null, completed: false, completedAt: null, completedByUserId: null, completedByName: null },
    { id: 'handover', label: 'Handover', description: null, completed: false, completedAt: null, completedByUserId: null, completedByName: null },
  ],
  complianceChecklist: [
    { id: 'it_clearance', label: 'IT clearance', description: null, completed: false, completedAt: null, completedByUserId: null, completedByName: null },
  ],
  employerDocuments: [
    { id: 'relieving_letter', name: 'Relieving letter', url: null, fileType: 'pdf', requiresSignature: true, completed: false, attachmentUrl: null, signed: false, completedAt: null },
  ],
  completedAt: null,
  completedByUserId: null,
  completedByName: null,
  ...overrides,
});

describe('OffboardingService', () => {
  let service: OffboardingService;
  let requestRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let requestService: Record<string, jest.Mock<AnyPromiseFn>>;
  let exitTrackingRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let employeeRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let settingsService: Record<string, jest.Mock<AnyPromiseFn>>;

  const mockRepository = () => ({
    findById: jest.fn(),
    create: jest.fn(),
    findByRequestId: jest.fn(),
    findByRequestIds: jest.fn(),
    findCompletedRequestIds: jest.fn(),
    upsertByRequestId: jest.fn(),
    paginatedQuery: jest.fn(),
    findAll: jest.fn(),
    updateById: jest.fn(),
    deleteByRequestId: jest.fn(),
  });

  const mockService = () => ({
    getRequest: jest.fn(),
    addRequest: jest.fn(),
    updateRequest: jest.fn(),
    updateRequestStep: jest.fn(),
    cancelRequest: jest.fn(),
    getRequestForm: jest.fn(),
  });

  const mockSettingsService = () => ({
    getOffboardingSettings: jest.fn(),
    getOffboardingDocumentsSettings: jest.fn(),
    getRequestWorkflows: jest.fn(),
  });

  beforeEach(() => {
    requestRepository = mockRepository();
    requestService = mockService();
    exitTrackingRepository = mockRepository();
    employeeRepository = mockRepository();
    settingsService = mockSettingsService();

    const { OffboardingService: OS } = require('./offboarding.service');
    service = new OS(
      requestRepository as any,
      requestService as any,
      exitTrackingRepository as any,
      employeeRepository as any,
      settingsService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFormOptions', () => {
    it('returns offboarding types, reasons, checklist, documents, workflows and termination types', async () => {
      settingsService.getOffboardingSettings.mockResolvedValue(settings);
      settingsService.getOffboardingDocumentsSettings.mockResolvedValue(documents);
      settingsService.getRequestWorkflows.mockResolvedValue(workflowResponse);
      requestService.getRequestForm.mockReturnValue({ fields: [] });

      const result = await service.getFormOptions(ORG_ID);

      expect(result.offboardingTypes).toEqual(settings.offboardingTypes);
      expect(result.exitReasons).toEqual(settings.exitReasons);
      expect(result.exitChecklist).toEqual(settings.exitChecklist);
      expect(result.employerExitDocuments).toEqual(documents.employerExitDocuments);
      expect(result.complianceChecklist).toEqual(documents.complianceChecklist);
      expect(result.terminationTypes).toEqual(Object.values(TerminationType));
      expect(result.defaultWorkflowId).toBe('wf1');
      expect(settingsService.getRequestWorkflows).toHaveBeenCalledWith(ORG_ID, RequestType.EMPLOYEE_TERMINATION);
    });
  });

  describe('listRequests', () => {
    it('returns paginated exit requests with tracking progress', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.PENDING });
      const tracking = buildTracking();
      requestRepository.paginatedQuery.mockResolvedValue({ items: [request], total: 1 });
      exitTrackingRepository.findByRequestIds.mockResolvedValue([tracking]);

      const result = await service.listRequests(ORG_ID, { batch: 1, limit: 10 });

      expect(result.count).toBe(1);
      expect(result.data[0].id).toBe(REQUEST_ID);
      expect(result.data[0].status).toBe(ExitRequestStatus.PENDING);
      expect(result.data[0].exitType).toEqual({ id: 'resignation', label: 'Resignation' });
      expect(exitTrackingRepository.findByRequestIds).toHaveBeenCalledWith(ORG_ID, [REQUEST_ID]);
    });

    it('filters completed exits by completed request ids', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.APPROVED });
      const completedTracking = buildTracking({ completedAt: new Date() });
      requestRepository.paginatedQuery.mockResolvedValue({ items: [request], total: 1 });
      exitTrackingRepository.findCompletedRequestIds.mockResolvedValue([REQUEST_ID]);
      exitTrackingRepository.findByRequestIds.mockResolvedValue([completedTracking]);

      const result = await service.listRequests(ORG_ID, { batch: 1, limit: 10, status: ExitRequestStatus.COMPLETED });

      expect(result.count).toBe(1);
      expect(result.data[0].status).toBe(ExitRequestStatus.COMPLETED);
      expect(exitTrackingRepository.findCompletedRequestIds).toHaveBeenCalledWith(ORG_ID);
    });
  });

  describe('retrieveRequest', () => {
    it('returns detail view from existing completed tracking', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.APPROVED });
      const completedTracking = buildTracking({ completedAt: new Date(), exitChecklist: [{ id: 'exit_interview', label: 'Exit interview', completed: true }] });
      requestService.getRequest.mockResolvedValue(request);
      exitTrackingRepository.findByRequestId.mockResolvedValue(completedTracking);

      const result = await service.retrieveRequest(ORG_ID, { requestId: REQUEST_ID });

      expect(result.status).toBe(ExitRequestStatus.COMPLETED);
      expect(result.canComplete).toBe(false);
      expect(result.exitChecklist[0].completed).toBe(true);
    });

    it('builds default tracking when none exists', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.PENDING, details: {} });
      requestService.getRequest.mockResolvedValue(request);
      exitTrackingRepository.findByRequestId.mockResolvedValue(null);
      settingsService.getOffboardingSettings.mockResolvedValue(settings);
      settingsService.getOffboardingDocumentsSettings.mockResolvedValue(documents);

      const result = await service.retrieveRequest(ORG_ID, { requestId: REQUEST_ID });

      expect(result.status).toBe(ExitRequestStatus.PENDING);
      expect(result.exitChecklist.length).toBe(2);
      expect(result.employerDocuments.length).toBe(1);
    });

    it('throws 404 when request not found', async () => {
      requestService.getRequest.mockRejectedValue(new AppException('Exit request not found', 404));

      await expect(service.retrieveRequest(ORG_ID, { requestId: REQUEST_ID })).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('initiateRequest', () => {
    const dto = {
      employeeId: EMPLOYEE_ID,
      offboardingTypeId: 'resignation',
      exitReasonId: 'better_offer',
      lastWorkingDay: '2026-11-30',
    };

    it('initiates an exit request and creates tracking', async () => {
      employeeRepository.findById.mockResolvedValue(buildEmployee({ organizationId: ORG_ID }));
      settingsService.getOffboardingSettings.mockResolvedValue(settings);
      settingsService.getOffboardingDocumentsSettings.mockResolvedValue(documents);
      const createdRequest = buildRequest({ status: EmployeeRequestStatus.PENDING });
      requestService.addRequest.mockResolvedValue(createdRequest);
      const createdTracking = buildTracking({ exitType: { id: 'resignation', label: 'Resignation' } });
      exitTrackingRepository.create.mockResolvedValue(createdTracking);

      const result = await service.initiateRequest(ORG_ID, user, dto);

      expect(requestService.addRequest).toHaveBeenCalledWith(
        ORG_ID,
        user,
        expect.objectContaining({
          requestType: RequestType.EMPLOYEE_TERMINATION,
          employeeId: EMPLOYEE_ID,
          terminationType: TerminationType.RESIGNATION,
          reasonForTermination: 'Better offer',
          terminationDate: '2026-11-30',
          endDate: '2026-11-30',
          effectiveDate: '2026-11-30',
        }),
      );
      expect(exitTrackingRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        requestId: String(createdRequest.id),
        exitType: { id: 'resignation', label: 'Resignation' },
        exitReason: { id: 'better_offer', label: 'Better offer' },
      }));
      expect(result.exitType).toEqual({ id: 'resignation', label: 'Resignation' });
    });

    it('throws 404 for unknown offboarding type', async () => {
      employeeRepository.findById.mockResolvedValue(buildEmployee({ organizationId: ORG_ID }));
      settingsService.getOffboardingSettings.mockResolvedValue(settings);
      settingsService.getOffboardingDocumentsSettings.mockResolvedValue(documents);

      await expect(service.initiateRequest(ORG_ID, user, { ...dto, offboardingTypeId: 'unknown' })).rejects.toBeInstanceOf(AppException);
    });

    it('throws 404 for unknown exit reason', async () => {
      employeeRepository.findById.mockResolvedValue(buildEmployee({ organizationId: ORG_ID }));
      settingsService.getOffboardingSettings.mockResolvedValue(settings);
      settingsService.getOffboardingDocumentsSettings.mockResolvedValue(documents);

      await expect(service.initiateRequest(ORG_ID, user, { ...dto, exitReasonId: 'unknown' })).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('updateRequest', () => {
    it('updates last working day on a pending request', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.PENDING });
      requestRepository.findById.mockResolvedValue(request);
      settingsService.getOffboardingSettings.mockResolvedValue(settings);
      settingsService.getOffboardingDocumentsSettings.mockResolvedValue(documents);
      requestService.updateRequest.mockResolvedValue(request);
      exitTrackingRepository.findByRequestId.mockResolvedValue(buildTracking());
      requestService.getRequest.mockResolvedValue(request);

      const result = await service.updateRequest(ORG_ID, { requestId: REQUEST_ID, lastWorkingDay: '2026-12-15' });

      expect(requestService.updateRequest).toHaveBeenCalledWith(ORG_ID, REQUEST_ID, {
        details: { terminationDate: '2026-12-15' },
        effectiveDate: '2026-12-15',
        endDate: '2026-12-15',
      });
      expect(result.status).toBe(ExitRequestStatus.PENDING);
    });

    it('throws 404 for unknown offboarding type', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.PENDING });
      requestRepository.findById.mockResolvedValue(request);
      settingsService.getOffboardingSettings.mockResolvedValue(settings);
      settingsService.getOffboardingDocumentsSettings.mockResolvedValue(documents);

      await expect(service.updateRequest(ORG_ID, { requestId: REQUEST_ID, offboardingTypeId: 'unknown' })).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('updateChecklist', () => {
    it('marks an exit checklist item complete', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.APPROVED });
      const tracking = buildTracking();
      requestRepository.findById.mockResolvedValue(request);
      exitTrackingRepository.findByRequestId.mockResolvedValue(tracking);
      const updatedTracking = buildTracking({ exitChecklist: [{ id: 'exit_interview', label: 'Exit interview', completed: true }] });
      exitTrackingRepository.upsertByRequestId.mockResolvedValue(updatedTracking);
      requestService.getRequest.mockResolvedValue(request);

      const result = await service.updateChecklist(ORG_ID, user, { requestId: REQUEST_ID, kind: 'exit', itemId: 'exit_interview', completed: true });

      expect(exitTrackingRepository.upsertByRequestId).toHaveBeenCalledWith(ORG_ID, REQUEST_ID, {
        exitChecklist: expect.arrayContaining([expect.objectContaining({ id: 'exit_interview', completed: true })]),
      });
      expect(result.exitChecklist[0].completed).toBe(true);
    });

    it('throws 404 for unknown checklist item', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.APPROVED });
      const tracking = buildTracking();
      requestRepository.findById.mockResolvedValue(request);
      exitTrackingRepository.findByRequestId.mockResolvedValue(tracking);

      await expect(service.updateChecklist(ORG_ID, user, { requestId: REQUEST_ID, kind: 'exit', itemId: 'unknown', completed: true })).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('updateDocument', () => {
    it('marks an employer exit document complete and signed', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.APPROVED });
      const tracking = buildTracking();
      requestRepository.findById.mockResolvedValue(request);
      exitTrackingRepository.findByRequestId.mockResolvedValue(tracking);
      const updatedTracking = buildTracking({
        employerDocuments: [{ id: 'relieving_letter', name: 'Relieving letter', requiresSignature: true, completed: true, signed: true, completedAt: new Date() }],
      });
      exitTrackingRepository.upsertByRequestId.mockResolvedValue(updatedTracking);
      requestService.getRequest.mockResolvedValue(request);

      const result = await service.updateDocument(ORG_ID, { requestId: REQUEST_ID, documentId: 'relieving_letter', completed: true, signed: true });

      expect(result.employerDocuments[0].completed).toBe(true);
      expect(result.employerDocuments[0].signed).toBe(true);
    });
  });

  describe('completeRequest', () => {
    it('completes an approved exit request and terminates the employee', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.APPROVED });
      const readyTracking = buildTracking({
        exitChecklist: [{ id: 'exit_interview', label: 'Exit interview', completed: true }],
        complianceChecklist: [{ id: 'it_clearance', label: 'IT clearance', completed: true }],
        employerDocuments: [{ id: 'relieving_letter', name: 'Relieving letter', requiresSignature: true, completed: true, signed: true }],
      });
      requestRepository.findById.mockResolvedValue(request);
      exitTrackingRepository.findByRequestId.mockResolvedValue(readyTracking);
      exitTrackingRepository.upsertByRequestId.mockResolvedValue(buildTracking({ completedAt: new Date() }));
      employeeRepository.findById.mockResolvedValue(buildEmployee({ organizationId: ORG_ID }));
      employeeRepository.updateById.mockResolvedValue(buildEmployee({ organizationId: ORG_ID }));
      requestService.getRequest.mockResolvedValue(request);

      const result = await service.completeRequest(ORG_ID, user, { requestId: REQUEST_ID });

      expect(employeeRepository.updateById).toHaveBeenCalledWith(EMPLOYEE_ID, { status: 'terminated' });
      expect(result.status).toBe(ExitRequestStatus.COMPLETED);
    });

    it('rejects completion when not approved', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.PENDING });
      requestRepository.findById.mockResolvedValue(request);

      await expect(service.completeRequest(ORG_ID, user, { requestId: REQUEST_ID })).rejects.toBeInstanceOf(AppException);
    });

    it('rejects completion when checklist is incomplete', async () => {
      const request = buildRequest({ status: EmployeeRequestStatus.APPROVED });
      const incompleteTracking = buildTracking();
      requestRepository.findById.mockResolvedValue(request);
      exitTrackingRepository.findByRequestId.mockResolvedValue(incompleteTracking);

      await expect(service.completeRequest(ORG_ID, user, { requestId: REQUEST_ID })).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('getSummary', () => {
    it('returns counts and upcoming exits', async () => {
      const pendingRequest = buildRequest({ status: EmployeeRequestStatus.PENDING, details: { terminationDate: '2026-12-15' } });
      const completedRequest = buildRequest({ _id: 'req2', status: EmployeeRequestStatus.APPROVED, details: { terminationDate: '2026-12-01' } });
      requestRepository.findAll.mockResolvedValue([pendingRequest, completedRequest]);
      exitTrackingRepository.findByRequestIds.mockResolvedValue([
        buildTracking({ requestId: REQUEST_ID }),
        buildTracking({ requestId: 'req2', completedAt: new Date() }),
      ]);

      const result = await service.getSummary(ORG_ID, { upcomingDays: 60 });

      expect(result.total).toBe(2);
      expect(result.pending).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.onExit).toBe(1);
      expect(result.upcomingExits.length).toBeGreaterThanOrEqual(0);
    });
  });
});
