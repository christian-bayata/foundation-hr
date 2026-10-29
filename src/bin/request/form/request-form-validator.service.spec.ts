import { describe, it, expect, beforeEach } from '@jest/globals';
import { AppException } from '../../../common/response/app-exception';
import {
  REQUEST_TYPES,
  RequestType,
} from '../../setting/request-management/enum/request-management.enum';
import {
  AreaOfConcern,
  MobilityRequestType,
  PerformanceIssue,
  InformationToUpdate,
  TerminationType,
} from '../dto/forms';
import {
  getRequestFormDefinition,
  getRequestFormDtoClass,
} from './request-form.registry';
import { RequestFormValidatorService } from './request-form-validator.service';

const VALID_DETAILS: Record<RequestType, Record<string, unknown>> = {
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

describe('RequestFormValidatorService', () => {
  let service: RequestFormValidatorService;

  beforeEach(() => {
    service = new RequestFormValidatorService();
  });

  it('has a form definition and DTO for every request type', () => {
    for (const requestType of REQUEST_TYPES) {
      expect(getRequestFormDefinition(requestType)).toBeDefined();
      expect(getRequestFormDtoClass(requestType)).toBeDefined();
    }
  });

  it('exposes select options with readable labels', () => {
    const mobility = getRequestFormDefinition(RequestType.EMPLOYEE_MOBILITY);
    const query = getRequestFormDefinition(RequestType.QUERY_REQUEST);

    expect(mobility.fields[0].options).toContainEqual({
      value: MobilityRequestType.CHANGE_OF_JOB_ROLE,
      label: 'Change of job role',
    });
    expect(query.fields[0].options).toContainEqual({
      value: AreaOfConcern.SAFETY_AND_COMPLIANCE_ISSUES,
      label: 'Safety and compliance issues',
    });
  });

  it('exposes the staff data update context, field, and options', () => {
    const form = getRequestFormDefinition(RequestType.STAFF_DATA_UPDATE);

    expect(form.employeeContext).toEqual(['employeeId', 'department']);
    expect(form.fields).toEqual([
      expect.objectContaining({
        key: 'informationToUpdate',
        label: 'Information to update',
        type: 'select',
        required: true,
      }),
    ]);
    expect(form.fields[0].options).toContainEqual({
      value: InformationToUpdate.CHANGE_OF_ACCOUNT_DETAILS,
      label: 'Change of account details',
    });
  });

  it.each(REQUEST_TYPES)('accepts valid details for %s', (requestType) => {
    const result = service.validate(requestType, VALID_DETAILS[requestType]);

    expect(result).toEqual(VALID_DETAILS[requestType]);
  });

  it.each(REQUEST_TYPES)(
    'rejects missing required details for %s',
    (requestType) => {
      expect(() => service.validate(requestType, {})).toThrow(AppException);
    },
  );

  it('trims string values', () => {
    const result = service.validate(RequestType.EMPLOYEE_TERMINATION, {
      ...VALID_DETAILS[RequestType.EMPLOYEE_TERMINATION],
      reasonForTermination: '  Resignation  ',
    });

    expect(result.reasonForTermination).toBe('Resignation');
  });

  it('omits empty optional fields', () => {
    const result = service.validate(RequestType.EMPLOYEE_TERMINATION, {
      ...VALID_DETAILS[RequestType.EMPLOYEE_TERMINATION],
      exitInterviewDate: '',
    });

    expect(result).not.toHaveProperty('exitInterviewDate');
  });

  it('rejects an invalid information to update option', () => {
    expect(() =>
      service.validate(RequestType.STAFF_DATA_UPDATE, {
        informationToUpdate: 'bank_details',
      }),
    ).toThrow('Request details are invalid');
  });

  it('rejects unknown detail fields', () => {
    expect(() =>
      service.validate(RequestType.EMPLOYEE_TERMINATION, {
        ...VALID_DETAILS[RequestType.EMPLOYEE_TERMINATION],
        unexpected: 'value',
      }),
    ).toThrow('Request details are invalid');
  });

  it('rejects invalid select and date values', () => {
    expect(() =>
      service.validate(RequestType.EMPLOYEE_TERMINATION, {
        ...VALID_DETAILS[RequestType.EMPLOYEE_TERMINATION],
        terminationType: 'not-a-type',
        terminationDate: '02/01/2026',
      }),
    ).toThrow('Request details are invalid');
  });

  it('rejects details that are not an object', () => {
    expect(() =>
      service.validate(RequestType.EMPLOYEE_TERMINATION, 'invalid' as any),
    ).toThrow(AppException);
  });
});
