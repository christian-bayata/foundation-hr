import {
  REQUEST_TYPE_LABELS,
  RequestType,
} from '../../setting/request-management/enum/request-management.enum';
import {
  AreaOfConcern,
  CancelHireBeforeStartDateDetailsDto,
  ConfirmationRequestDetailsDto,
  EmployeeMobilityDetailsDto,
  EmployeeTerminationDetailsDto,
  EmploymentAgreementExtensionDetailsDto,
  EmploymentAgreementRenewalDetailsDto,
  InformationToUpdate,
  MobilityRequestType,
  PerformanceImprovementPlanDetailsDto,
  PerformanceIssue,
  ProbationExtensionDetailsDto,
  QueryRequestDetailsDto,
  StaffDataUpdateDetailsDto,
  TerminationType,
} from '../dto/forms';
import {
  RequestFormDefinition,
  RequestFormDtoClass,
  RequestFormSelectOption,
} from './request-form.types';

const EMPLOYEE_CONTEXT = [
  'employeeName',
  'employeeId',
  'department',
  'jobTitle',
  'lineManagerId',
];

const STAFF_DATA_UPDATE_CONTEXT = ['employeeId', 'department'];

const toOptions = (values: Record<string, string>): RequestFormSelectOption[] =>
  Object.values(values).map((value) => {
    const [first, ...rest] = value.split('_');
    return {
      value,
      label: [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(
        ' ',
      ),
    };
  });

const MOBILITY_OPTIONS = toOptions(MobilityRequestType);
const PERFORMANCE_ISSUE_OPTIONS = toOptions(PerformanceIssue);
const AREA_OF_CONCERN_OPTIONS = toOptions(AreaOfConcern);
const TERMINATION_TYPE_OPTIONS = toOptions(TerminationType);
const INFORMATION_TO_UPDATE_OPTIONS = toOptions(InformationToUpdate);

const FORM_DEFINITIONS: Record<RequestType, RequestFormDefinition> = {
  [RequestType.EMPLOYEE_TERMINATION]: {
    requestType: RequestType.EMPLOYEE_TERMINATION,
    label: REQUEST_TYPE_LABELS[RequestType.EMPLOYEE_TERMINATION],
    employeeContext: EMPLOYEE_CONTEXT,
    fields: [
      {
        key: 'terminationDate',
        label: 'Termination date',
        type: 'date',
        required: true,
        placeholder: 'Select termination date',
      },
      {
        key: 'terminationType',
        label: 'Type of termination',
        type: 'select',
        required: true,
        options: TERMINATION_TYPE_OPTIONS,
        placeholder: 'Select type of termination',
      },
      {
        key: 'reasonForTermination',
        label: 'Reason for termination',
        type: 'textarea',
        required: true,
        maxLength: 2000,
        placeholder: 'Enter reason for termination',
      },
      {
        key: 'exitInterviewDate',
        label: 'Exit interview date',
        type: 'date',
        required: false,
        placeholder: 'Select exit interview date',
      },
    ],
  },
  [RequestType.CANCEL_HIRE_BEFORE_START_DATE]: {
    requestType: RequestType.CANCEL_HIRE_BEFORE_START_DATE,
    label: REQUEST_TYPE_LABELS[RequestType.CANCEL_HIRE_BEFORE_START_DATE],
    employeeContext: EMPLOYEE_CONTEXT,
    fields: [
      {
        key: 'reasonForCancelingHire',
        label: 'Reason for canceling hire',
        type: 'textarea',
        required: true,
        maxLength: 2000,
        placeholder: 'Enter reason for canceling hire',
      },
    ],
  },
  [RequestType.CONFIRMATION_REQUEST]: {
    requestType: RequestType.CONFIRMATION_REQUEST,
    label: REQUEST_TYPE_LABELS[RequestType.CONFIRMATION_REQUEST],
    employeeContext: EMPLOYEE_CONTEXT,
    fields: [
      {
        key: 'location',
        label: 'Location',
        type: 'textarea',
        required: true,
        maxLength: 2000,
        placeholder: 'Enter location',
      },
    ],
  },
  [RequestType.EMPLOYMENT_AGREEMENT_EXTENSION]: {
    requestType: RequestType.EMPLOYMENT_AGREEMENT_EXTENSION,
    label: REQUEST_TYPE_LABELS[RequestType.EMPLOYMENT_AGREEMENT_EXTENSION],
    employeeContext: EMPLOYEE_CONTEXT,
    fields: [
      {
        key: 'reasonForExtension',
        label: 'Reason for extension',
        type: 'textarea',
        required: true,
        maxLength: 2000,
        placeholder: 'Enter reason for extension',
      },
      {
        key: 'newExtensionDate',
        label: 'New extension date',
        type: 'date',
        required: true,
        placeholder: 'Select new extension date',
      },
    ],
  },
  [RequestType.EMPLOYMENT_AGREEMENT_RENEWAL]: {
    requestType: RequestType.EMPLOYMENT_AGREEMENT_RENEWAL,
    label: REQUEST_TYPE_LABELS[RequestType.EMPLOYMENT_AGREEMENT_RENEWAL],
    employeeContext: EMPLOYEE_CONTEXT,
    fields: [
      {
        key: 'reasonForRenewal',
        label: 'Reason for renewal',
        type: 'textarea',
        required: true,
        maxLength: 2000,
        placeholder: 'Enter reason for renewal',
      },
      {
        key: 'renewalDate',
        label: 'Renewal date',
        type: 'date',
        required: true,
        placeholder: 'Select renewal date',
      },
    ],
  },
  [RequestType.EMPLOYEE_MOBILITY]: {
    requestType: RequestType.EMPLOYEE_MOBILITY,
    label: REQUEST_TYPE_LABELS[RequestType.EMPLOYEE_MOBILITY],
    employeeContext: EMPLOYEE_CONTEXT,
    fields: [
      {
        key: 'mobilityRequestType',
        label: 'Mobility request type',
        type: 'select',
        required: true,
        options: MOBILITY_OPTIONS,
        placeholder: 'Select mobility request type',
      },
      {
        key: 'justification',
        label: 'Justification',
        type: 'textarea',
        required: true,
        maxLength: 2000,
        placeholder: 'Enter justification',
      },
    ],
  },
  [RequestType.PROBATION_EXTENSION]: {
    requestType: RequestType.PROBATION_EXTENSION,
    label: REQUEST_TYPE_LABELS[RequestType.PROBATION_EXTENSION],
    employeeContext: EMPLOYEE_CONTEXT,
    fields: [
      {
        key: 'newProbationDate',
        label: 'New probation date',
        type: 'date',
        required: true,
        placeholder: 'Select new probation date',
      },
      {
        key: 'reasonForExtension',
        label: 'Reason for extension',
        type: 'textarea',
        required: true,
        maxLength: 2000,
        placeholder: 'Enter reason for extension',
      },
    ],
  },
  [RequestType.STAFF_DATA_UPDATE]: {
    requestType: RequestType.STAFF_DATA_UPDATE,
    label: REQUEST_TYPE_LABELS[RequestType.STAFF_DATA_UPDATE],
    employeeContext: STAFF_DATA_UPDATE_CONTEXT,
    fields: [
      {
        key: 'informationToUpdate',
        label: 'Information to update',
        type: 'select',
        required: true,
        options: INFORMATION_TO_UPDATE_OPTIONS,
        placeholder: 'Select information to update',
      },
    ],
  },
  [RequestType.PERFORMANCE_IMPROVEMENT_PLAN]: {
    requestType: RequestType.PERFORMANCE_IMPROVEMENT_PLAN,
    label: REQUEST_TYPE_LABELS[RequestType.PERFORMANCE_IMPROVEMENT_PLAN],
    employeeContext: EMPLOYEE_CONTEXT,
    fields: [
      {
        key: 'performanceIssue',
        label: 'Performance issues',
        type: 'select',
        required: true,
        options: PERFORMANCE_ISSUE_OPTIONS,
        placeholder: 'Select performance issue',
      },
      {
        key: 'improvementActionPlan',
        label: 'Improvement action plan',
        type: 'textarea',
        required: true,
        maxLength: 2000,
        placeholder: 'Enter improvement action plan',
      },
      {
        key: 'completionTimeline',
        label: 'Timeline for completion',
        type: 'date',
        required: true,
        placeholder: 'Select timeline for completion',
      },
    ],
  },
  [RequestType.QUERY_REQUEST]: {
    requestType: RequestType.QUERY_REQUEST,
    label: REQUEST_TYPE_LABELS[RequestType.QUERY_REQUEST],
    employeeContext: EMPLOYEE_CONTEXT,
    fields: [
      {
        key: 'areaOfConcern',
        label: 'Area of concern',
        type: 'select',
        required: true,
        options: AREA_OF_CONCERN_OPTIONS,
        placeholder: 'Select area of concern',
      },
      {
        key: 'incidentDescription',
        label: 'Incident description',
        type: 'textarea',
        required: true,
        maxLength: 2000,
        placeholder: 'Describe the incident',
      },
    ],
  },
};

const FORM_DTO_CLASSES: Record<RequestType, RequestFormDtoClass> = {
  [RequestType.EMPLOYEE_TERMINATION]: EmployeeTerminationDetailsDto,
  [RequestType.CANCEL_HIRE_BEFORE_START_DATE]:
    CancelHireBeforeStartDateDetailsDto,
  [RequestType.CONFIRMATION_REQUEST]: ConfirmationRequestDetailsDto,
  [RequestType.EMPLOYMENT_AGREEMENT_EXTENSION]:
    EmploymentAgreementExtensionDetailsDto,
  [RequestType.EMPLOYMENT_AGREEMENT_RENEWAL]:
    EmploymentAgreementRenewalDetailsDto,
  [RequestType.EMPLOYEE_MOBILITY]: EmployeeMobilityDetailsDto,
  [RequestType.PROBATION_EXTENSION]: ProbationExtensionDetailsDto,
  [RequestType.STAFF_DATA_UPDATE]: StaffDataUpdateDetailsDto,
  [RequestType.PERFORMANCE_IMPROVEMENT_PLAN]:
    PerformanceImprovementPlanDetailsDto,
  [RequestType.QUERY_REQUEST]: QueryRequestDetailsDto,
};

export const getRequestFormDefinition = (
  requestType: RequestType,
): RequestFormDefinition => FORM_DEFINITIONS[requestType];

export const getRequestFormDtoClass = (
  requestType: RequestType,
): RequestFormDtoClass => FORM_DTO_CLASSES[requestType];

export const getRequestFormDefinitions = (): RequestFormDefinition[] =>
  Object.values(FORM_DEFINITIONS);
