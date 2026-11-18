import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  REQUEST_TYPES,
  RequestType,
} from '../../../generic/setting/request-management/enum/request-management.enum';
import {
  AmendmentChangeType,
  AreaOfConcern,
  EmploymentLetterType,
  InformationToUpdate,
  MobilityRequestType,
  PayrollPaymentMethod,
  PerformanceIssue,
  PerformanceRating,
  ReimbursementCategory,
  RightToWorkDocumentType,
  TerminationType,
} from '../dto/forms';
import { getCreateRequestDtoClass } from '../dto/create/create-request.registry';
import { RequestCreateValidationPipe } from './request-create-validation.pipe';

const VALID_PAYLOADS: Record<RequestType, Record<string, unknown>> = {
  [RequestType.EMPLOYEE_TERMINATION]: {
    terminationDate: '2026-02-01',
    terminationType: TerminationType.RESIGNATION,
    reasonForTermination: 'Resignation',
  },
  [RequestType.CANCEL_HIRE_BEFORE_START_DATE]: {
    reasonForCancelingHire: 'Role no longer required',
  },
  [RequestType.CONFIRMATION_REQUEST]: {
    location: 'Lagos',
  },
  [RequestType.PROBATION_CONFIRMATION_LETTER]: {
    probationEnded: '2026-03-01',
    confirmedFrom: '2026-03-02',
    performanceRating: PerformanceRating.MEETS_EXPECTATIONS,
    lineManagerSummary: 'Met expectations',
  },
  [RequestType.EMPLOYMENT_AGREEMENT_AMENDMENT]: {
    whatsChanging: AmendmentChangeType.JOB_TITLE,
    currentValue: 'Engineer',
    newValue: 'Senior Engineer',
    effectiveFrom: '2026-03-01',
    reasonForChange: 'Promotion',
  },
  [RequestType.EMPLOYMENT_AGREEMENT_EXTENSION]: {
    reasonForExtension: 'Contract extension',
    newExtensionDate: '2026-03-01',
  },
  [RequestType.EMPLOYMENT_AGREEMENT_RENEWAL]: {
    reasonForRenewal: 'Contract renewal',
    renewalDate: '2026-03-01',
  },
  [RequestType.CHANGE_OF_ADDRESS]: {
    newAddress: '12 New Street',
    city: 'Lagos',
    state: 'Lagos',
    effectiveFrom: '2026-03-01',
  },
  [RequestType.REIMBURSEMENT]: {
    category: ReimbursementCategory.TRAVEL,
    amount: '10000',
    dateIncurred: '2026-02-01',
    payWith: PayrollPaymentMethod.NEXT_PAYROLL_RUN,
    purpose: 'Client visit',
  },
  [RequestType.EMPLOYMENT_LETTER_REQUEST]: {
    letterType: EmploymentLetterType.PROOF_OF_EMPLOYMENT,
    addressedTo: 'Landlord',
    purpose: 'Tenancy',
    neededBy: '2026-03-01',
  },
  [RequestType.RIGHT_TO_WORK]: {
    documentType: RightToWorkDocumentType.PASSPORT,
    documentNumber: 'A1234567',
    issuedOn: '2025-01-01',
    expiresOn: '2030-01-01',
  },
  [RequestType.EMPLOYEE_MOBILITY]: {
    mobilityRequestType: MobilityRequestType.TRANSFER,
    justification: 'Business need',
  },
  [RequestType.PROBATION_EXTENSION]: {
    newProbationDate: '2026-03-01',
    reasonForExtension: 'Performance review pending',
  },
  [RequestType.STAFF_DATA_UPDATE]: {
    informationToUpdate: InformationToUpdate.CHANGE_OF_ACCOUNT_DETAILS,
  },
  [RequestType.PERFORMANCE_IMPROVEMENT_PLAN]: {
    performanceIssue: PerformanceIssue.MISSED_DEADLINES,
    improvementActionPlan: 'Weekly check-ins',
    completionTimeline: '2026-03-01',
  },
  [RequestType.QUERY_REQUEST]: {
    areaOfConcern: AreaOfConcern.PERFORMANCE_ISSUES,
    incidentDescription: 'Details of the incident',
  },
};

describe('RequestCreateValidationPipe', () => {
  let pipe: RequestCreateValidationPipe;

  beforeEach(() => {
    pipe = new RequestCreateValidationPipe();
  });

  it.each(REQUEST_TYPES)('validates a flat %s payload', (requestType) => {
    const payload = {
      requestType,
      employeeId: '64f1b2c3d4e5f678901234cc',
      ...VALID_PAYLOADS[requestType],
    };

    const result = pipe.transform(payload);

    expect(result).toBeInstanceOf(getCreateRequestDtoClass(requestType));
    expect(result).toMatchObject(payload);
  });

  it('accepts shared request metadata alongside form fields', () => {
    const payload = {
      requestType: RequestType.STAFF_DATA_UPDATE,
      employeeId: '64f1b2c3d4e5f678901234cc',
      department: 'Engineering',
      informationToUpdate: InformationToUpdate.CHANGE_OF_ADDRESS,
      workflowId: '64f1b2c3d4e5f678901234c0',
      reason: 'Employee moved',
      effectiveDate: '2026-03-01',
      endDate: '2026-04-01',
      attachmentUrls: ['https://example.com/document.pdf'],
    };

    expect(pipe.transform(payload)).toMatchObject(payload);
  });

  it('rejects missing required fields for the selected type', () => {
    expect(() =>
      pipe.transform({
        requestType: RequestType.EMPLOYEE_TERMINATION,
        employeeId: '64f1b2c3d4e5f678901234cc',
      }),
    ).toThrow('Request payload is invalid');
  });

  it('rejects fields that belong to another request type', () => {
    expect(() =>
      pipe.transform({
        requestType: RequestType.STAFF_DATA_UPDATE,
        informationToUpdate: InformationToUpdate.CHANGE_OF_NAME,
        updateDetails: 'Not allowed',
      }),
    ).toThrow('Request payload is invalid');
  });

  it('rejects a request type that does not match the payload shape', () => {
    expect(() =>
      pipe.transform({
        requestType: RequestType.EMPLOYEE_TERMINATION,
        informationToUpdate: InformationToUpdate.CHANGE_OF_NAME,
      }),
    ).toThrow('Request payload is invalid');
  });

  it('rejects a non-object payload', () => {
    expect(() => pipe.transform('invalid')).toThrow(
      'Request payload must be an object.',
    );
  });

  it('rejects an unknown request type', () => {
    expect(() => pipe.transform({ requestType: 'not_a_request' })).toThrow(
      'Request type is not valid.',
    );
  });
});
