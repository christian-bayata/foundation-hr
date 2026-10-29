import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  REQUEST_TYPES,
  RequestType,
} from '../../setting/request-management/enum/request-management.enum';
import {
  AreaOfConcern,
  InformationToUpdate,
  MobilityRequestType,
  PerformanceIssue,
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
  [RequestType.EMPLOYMENT_AGREEMENT_EXTENSION]: {
    reasonForExtension: 'Contract extension',
    newExtensionDate: '2026-03-01',
  },
  [RequestType.EMPLOYMENT_AGREEMENT_RENEWAL]: {
    reasonForRenewal: 'Contract renewal',
    renewalDate: '2026-03-01',
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
