import {
  REQUEST_TYPE_LABELS,
  RequestType,
} from '../../../generic/setting/request-management/enum/request-management.enum';
import {
  AmendmentChangeType,
  AreaOfConcern,
  CancelHireReason,
  ChangeOfAddressDetailsDto,
  EmploymentAgreementAmendmentDetailsDto,
  EmploymentLetterRequestDetailsDto,
  EmploymentLetterType,
  FinalSettlementOption,
  PayrollPaymentMethod,
  PerformanceRating,
  ProbationConfirmationLetterDetailsDto,
  QueryNature,
  ReimbursementCategory,
  ReimbursementDetailsDto,
  RightToWorkDetailsDto,
  RightToWorkDocumentType,
  StaffDataField,
  TerminationReason,
  TypeOfMove,
  YesNo,
} from '../dto/forms';
import {
  RequestFormDefinition,
  RequestFormDtoClass,
  RequestFormFieldDefinition,
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

const OPTION_LABEL_OVERRIDES: Record<string, string> = {
  NATIONAL_ID: 'National ID',
  ONE_OFF_PAYMENT: 'One-off payment',
};

const toOptions = (values: Record<string, string>): RequestFormSelectOption[] =>
  Object.entries(values).map(([key, value]) => {
    const [first, ...rest] = value.split('_');
    return {
      value,
      label:
        OPTION_LABEL_OVERRIDES[key] ??
        [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' '),
    };
  });

const textField = (
  key: string,
  label: string,
  required = true,
): RequestFormFieldDefinition => ({
  key,
  label,
  type: 'text',
  required,
  maxLength: 2000,
  placeholder: `Enter ${label.toLowerCase()}`,
});

const textareaField = (
  key: string,
  label: string,
  required = true,
): RequestFormFieldDefinition => ({
  key,
  label,
  type: 'textarea',
  required,
  maxLength: 2000,
  placeholder: `Enter ${label.toLowerCase()}`,
});

const dateField = (
  key: string,
  label: string,
  required = true,
): RequestFormFieldDefinition => ({
  key,
  label,
  type: 'date',
  required,
  placeholder: `Select ${label.toLowerCase()}`,
});

const selectField = (
  key: string,
  label: string,
  options: RequestFormSelectOption[],
  required = true,
): RequestFormFieldDefinition => ({
  key,
  label,
  type: 'select',
  required,
  options,
  placeholder: `Select ${label.toLowerCase()}`,
});

const AMENDMENT_CHANGE_OPTIONS = toOptions(AmendmentChangeType);
const AREA_OF_CONCERN_OPTIONS = toOptions(AreaOfConcern);
const PERFORMANCE_RATING_OPTIONS = toOptions(PerformanceRating);
const YES_NO_OPTIONS = toOptions(YesNo);
const TYPE_OF_MOVE_OPTIONS = toOptions(TypeOfMove);
const TERMINATION_REASON_OPTIONS = toOptions(TerminationReason);
const FINAL_SETTLEMENT_OPTIONS = toOptions(FinalSettlementOption);
const CANCEL_HIRE_REASON_OPTIONS = toOptions(CancelHireReason);
const QUERY_NATURE_OPTIONS = toOptions(QueryNature);
const STAFF_DATA_FIELD_OPTIONS = toOptions(StaffDataField);
const REIMBURSEMENT_CATEGORY_OPTIONS = toOptions(ReimbursementCategory);
const PAYROLL_PAYMENT_OPTIONS = toOptions(PayrollPaymentMethod);
const EMPLOYMENT_LETTER_TYPE_OPTIONS = toOptions(EmploymentLetterType);
const RIGHT_TO_WORK_DOCUMENT_OPTIONS = toOptions(RightToWorkDocumentType);

const definition = (
  requestType: RequestType,
  employeeContext: string[],
  data: Omit<RequestFormDefinition, 'requestType' | 'label' | 'employeeContext'>,
): RequestFormDefinition => ({
  requestType,
  label: REQUEST_TYPE_LABELS[requestType],
  employeeContext,
  ...data,
});

export const FIGMA_FORM_DEFINITIONS: Record<
  RequestType,
  RequestFormDefinition
> = {
  [RequestType.EMPLOYEE_TERMINATION]: definition(
    RequestType.EMPLOYEE_TERMINATION,
    EMPLOYEE_CONTEXT,
    {
      category: 'employee_lifecycle',
      restricted: true,
      direction: 'outgoing',
      approvalChainPreview: [
        'Line manager',
        'HR business partner',
        'HR director',
      ],
      attachments: [
        { key: 'terminationLetter', label: 'Termination letter', required: true },
      ],
      primaryActionLabel: 'Submit termination request',
      fields: [
        selectField('reason', 'Reason', TERMINATION_REASON_OPTIONS),
        dateField('lastWorkingDay', 'Last working day'),
        textField('noticePeriod', 'Notice period'),
        selectField('finalSettlement', 'Final settlement', FINAL_SETTLEMENT_OPTIONS),
        textareaField('background', 'Background', false),
      ],
    },
  ),
  [RequestType.CANCEL_HIRE_BEFORE_START_DATE]: definition(
    RequestType.CANCEL_HIRE_BEFORE_START_DATE,
    EMPLOYEE_CONTEXT,
    {
      category: 'onboarding',
      restricted: true,
      direction: 'outgoing',
      approvalChainPreview: ['Hiring manager', 'HR business partner'],
      attachments: [
        {
          key: 'offerWithdrawal',
          label: 'Offer withdrawal confirmation',
          required: false,
        },
      ],
      primaryActionLabel: 'Submit cancellation',
      fields: [
        dateField('agreedStartDate', 'Agreed start date'),
        selectField('reason', 'Reason', CANCEL_HIRE_REASON_OPTIONS),
        dateField('offerWithdrawnOn', 'Offer withdrawn on'),
        textareaField('background', 'Background', false),
      ],
    },
  ),
  [RequestType.CONFIRMATION_REQUEST]: definition(
    RequestType.CONFIRMATION_REQUEST,
    EMPLOYEE_CONTEXT,
    {
      category: 'employee_lifecycle',
      restricted: false,
      direction: 'self_service',
      approvalChainPreview: ['Line manager', 'HR business partner'],
      attachments: [],
      primaryActionLabel: 'Submit confirmation request',
      fields: [
        textareaField('location', 'Location'),
      ],
    },
  ),
  [RequestType.PROBATION_CONFIRMATION_LETTER]: definition(
    RequestType.PROBATION_CONFIRMATION_LETTER,
    EMPLOYEE_CONTEXT,
    {
      category: 'employee_lifecycle',
      restricted: true,
      direction: 'outgoing',
      approvalChainPreview: ['Line manager', 'HR business partner'],
      attachments: [
        {
          key: 'probationReview',
          label: 'Probation review document',
          required: false,
        },
      ],
      primaryActionLabel: 'Submit confirmation letter',
      fields: [
        dateField('probationEnded', 'Probation ended'),
        dateField('confirmedFrom', 'Confirmed from'),
        selectField('performanceRating', 'Performance rating', PERFORMANCE_RATING_OPTIONS),
        textareaField('lineManagerSummary', 'Line manager summary'),
      ],
    },
  ),
  [RequestType.EMPLOYMENT_AGREEMENT_AMENDMENT]: definition(
    RequestType.EMPLOYMENT_AGREEMENT_AMENDMENT,
    EMPLOYEE_CONTEXT,
    {
      category: 'contract',
      restricted: true,
      direction: 'outgoing',
      approvalChainPreview: ['Line manager', 'HR business partner', 'Legal'],
      attachments: [
        { key: 'amendmentDocument', label: 'Amendment document', required: false },
      ],
      primaryActionLabel: 'Submit amendment',
      fields: [
        selectField('whatsChanging', "What's changing", AMENDMENT_CHANGE_OPTIONS),
        textField('currentValue', 'Current value'),
        textField('newValue', 'New value'),
        dateField('effectiveFrom', 'Effective from'),
        textareaField('reasonForChange', 'Reason for change'),
      ],
    },
  ),
  [RequestType.EMPLOYMENT_AGREEMENT_EXTENSION]: definition(
    RequestType.EMPLOYMENT_AGREEMENT_EXTENSION,
    EMPLOYEE_CONTEXT,
    {
      category: 'contract',
      restricted: true,
      direction: 'outgoing',
      approvalChainPreview: ['Line manager', 'HR business partner'],
      attachments: [
        { key: 'extensionAgreement', label: 'Extension agreement', required: false },
      ],
      primaryActionLabel: 'Submit extension',
      fields: [
        dateField('currentAgreementEnds', 'Current agreement ends'),
        textField('extendByMonths', 'Extend by months'),
        dateField('newEndDate', 'New end date'),
      ],
    },
  ),
  [RequestType.EMPLOYMENT_AGREEMENT_RENEWAL]: definition(
    RequestType.EMPLOYMENT_AGREEMENT_RENEWAL,
    EMPLOYEE_CONTEXT,
    {
      category: 'contract',
      restricted: true,
      direction: 'outgoing',
      approvalChainPreview: ['Line manager', 'HR business partner', 'Legal'],
      attachments: [
        { key: 'renewalAgreement', label: 'Renewal agreement', required: false },
      ],
      primaryActionLabel: 'Submit renewal',
      fields: [
        dateField('currentAgreementEnds', 'Current agreement ends'),
        dateField('newStartDate', 'New start date'),
        dateField('newEndDate', 'New end date'),
        selectField('termsChanging', 'Terms changing', YES_NO_OPTIONS),
      ],
    },
  ),
  [RequestType.EMPLOYEE_MOBILITY]: definition(
    RequestType.EMPLOYEE_MOBILITY,
    EMPLOYEE_CONTEXT,
    {
      category: 'employee_lifecycle',
      restricted: true,
      direction: 'outgoing',
      approvalChainPreview: [
        'Current line manager',
        'New line manager',
        'HR business partner',
      ],
      attachments: [],
      primaryActionLabel: 'Submit mobility request',
      fields: [
        selectField('typeOfMove', 'Type of move', TYPE_OF_MOVE_OPTIONS),
        textField('newJobTitle', 'New job title'),
        textField('newDepartment', 'New department'),
        textField('newLineManager', 'New line manager'),
        dateField('effectiveFrom', 'Effective from'),
      ],
    },
  ),
  [RequestType.PROBATION_EXTENSION]: definition(
    RequestType.PROBATION_EXTENSION,
    EMPLOYEE_CONTEXT,
    {
      category: 'employee_lifecycle',
      restricted: true,
      direction: 'outgoing',
      approvalChainPreview: ['Line manager', 'HR business partner'],
      attachments: [
        { key: 'probationReview', label: 'Probation review document', required: false },
      ],
      primaryActionLabel: 'Submit extension',
      fields: [
        dateField('currentProbationEnds', 'Current probation ends'),
        textField('extendByMonths', 'Extend by months'),
        dateField('newEndDate', 'New end date'),
      ],
    },
  ),
  [RequestType.STAFF_DATA_UPDATE]: definition(
    RequestType.STAFF_DATA_UPDATE,
    STAFF_DATA_UPDATE_CONTEXT,
    {
      category: 'employee_data',
      restricted: false,
      direction: 'self_service',
      approvalChainPreview: ['HR business partner'],
      attachments: [
        { key: 'supportingDocument', label: 'Supporting document', required: false },
      ],
      primaryActionLabel: 'Submit update',
      fields: [
        selectField('fieldToUpdate', 'Field to update', STAFF_DATA_FIELD_OPTIONS),
        textField('currentValue', 'Current value'),
        textField('newValue', 'New value'),
        dateField('effectiveFrom', 'Effective from'),
        textareaField('noteFromEmployee', 'Note from employee', false),
      ],
    },
  ),
  [RequestType.CHANGE_OF_ADDRESS]: definition(
    RequestType.CHANGE_OF_ADDRESS,
    EMPLOYEE_CONTEXT,
    {
      category: 'employee_data',
      restricted: false,
      direction: 'self_service',
      approvalChainPreview: ['HR business partner'],
      attachments: [
        { key: 'proofOfAddress', label: 'Proof of address', required: false },
      ],
      primaryActionLabel: 'Submit address change',
      fields: [
        textField('newAddress', 'New address'),
        textField('city', 'City'),
        textField('state', 'State'),
        dateField('effectiveFrom', 'Effective from'),
        textareaField('noteFromEmployee', 'Note from employee', false),
      ],
    },
  ),
  [RequestType.REIMBURSEMENT]: definition(
    RequestType.REIMBURSEMENT,
    EMPLOYEE_CONTEXT,
    {
      category: 'finance',
      restricted: false,
      direction: 'self_service',
      approvalChainPreview: ['Line manager', 'Finance'],
      attachments: [{ key: 'receipt', label: 'Receipt', required: true }],
      primaryActionLabel: 'Submit reimbursement',
      fields: [
        selectField('category', 'Category', REIMBURSEMENT_CATEGORY_OPTIONS),
        textField('amount', 'Amount'),
        dateField('dateIncurred', 'Date incurred'),
        selectField('payWith', 'Pay with', PAYROLL_PAYMENT_OPTIONS),
        textareaField('purpose', 'Purpose'),
      ],
    },
  ),
  [RequestType.EMPLOYMENT_LETTER_REQUEST]: definition(
    RequestType.EMPLOYMENT_LETTER_REQUEST,
    EMPLOYEE_CONTEXT,
    {
      category: 'documents',
      restricted: false,
      direction: 'self_service',
      approvalChainPreview: ['HR business partner'],
      attachments: [],
      primaryActionLabel: 'Request letter',
      fields: [
        selectField('letterType', 'Letter type', EMPLOYMENT_LETTER_TYPE_OPTIONS),
        textField('addressedTo', 'Addressed to'),
        textareaField('purpose', 'Purpose'),
        dateField('neededBy', 'Needed by'),
        textareaField('noteFromEmployee', 'Note from employee', false),
      ],
    },
  ),
  [RequestType.RIGHT_TO_WORK]: definition(
    RequestType.RIGHT_TO_WORK,
    EMPLOYEE_CONTEXT,
    {
      category: 'compliance',
      restricted: true,
      direction: 'incoming',
      approvalChainPreview: ['HR compliance'],
      attachments: [
        {
          key: 'rightToWorkDocument',
          label: 'Right to work document',
          required: true,
        },
      ],
      primaryActionLabel: 'Submit document',
      fields: [
        selectField('documentType', 'Document type', RIGHT_TO_WORK_DOCUMENT_OPTIONS),
        textField('documentNumber', 'Document number'),
        dateField('issuedOn', 'Issued on'),
        dateField('expiresOn', 'Expires on'),
        textareaField('noteFromEmployee', 'Note from employee', false),
      ],
    },
  ),
  [RequestType.PERFORMANCE_IMPROVEMENT_PLAN]: definition(
    RequestType.PERFORMANCE_IMPROVEMENT_PLAN,
    EMPLOYEE_CONTEXT,
    {
      category: 'performance',
      restricted: true,
      direction: 'outgoing',
      approvalChainPreview: ['Line manager', 'HR business partner'],
      attachments: [
        {
          key: 'improvementPlanDocument',
          label: 'Improvement plan document',
          required: false,
        },
      ],
      primaryActionLabel: 'Submit improvement plan',
      fields: [
        selectField('areaOfConcern', 'Area of concern', AREA_OF_CONCERN_OPTIONS),
        textField('objectives', 'Objectives'),
        textareaField('supportProvided', 'Support provided'),
        dateField('reviewDate', 'Review date'),
        textareaField('background', 'Background', false),
      ],
    },
  ),
  [RequestType.QUERY_REQUEST]: definition(
    RequestType.QUERY_REQUEST,
    EMPLOYEE_CONTEXT,
    {
      category: 'employee_relations',
      restricted: true,
      direction: 'outgoing',
      approvalChainPreview: ['HR business partner'],
      attachments: [
        { key: 'supportingDocument', label: 'Supporting document', required: false },
      ],
      primaryActionLabel: 'Send query',
      fields: [
        selectField('natureOfQuery', 'Nature of query', QUERY_NATURE_OPTIONS),
        dateField('incidentDate', 'Incident date'),
        dateField('responseDue', 'Response due'),
        textareaField('queryDetails', 'Query details'),
      ],
    },
  ),
};

export const FIGMA_FORM_DTO_CLASSES: Partial<
  Record<RequestType, RequestFormDtoClass>
> = {
  [RequestType.PROBATION_CONFIRMATION_LETTER]:
    ProbationConfirmationLetterDetailsDto,
  [RequestType.EMPLOYMENT_AGREEMENT_AMENDMENT]:
    EmploymentAgreementAmendmentDetailsDto,
  [RequestType.CHANGE_OF_ADDRESS]: ChangeOfAddressDetailsDto,
  [RequestType.REIMBURSEMENT]: ReimbursementDetailsDto,
  [RequestType.EMPLOYMENT_LETTER_REQUEST]: EmploymentLetterRequestDetailsDto,
  [RequestType.RIGHT_TO_WORK]: RightToWorkDetailsDto,
};
