export enum RequestType {
  EMPLOYEE_TERMINATION = 'employee_termination',
  CANCEL_HIRE_BEFORE_START_DATE = 'cancel_hire_before_start_date',
  CONFIRMATION_REQUEST = 'confirmation_request',
  PROBATION_CONFIRMATION_LETTER = 'probation_confirmation_letter',
  EMPLOYMENT_AGREEMENT_AMENDMENT = 'employment_agreement_amendment',
  EMPLOYMENT_AGREEMENT_EXTENSION = 'employment_agreement_extension',
  EMPLOYMENT_AGREEMENT_RENEWAL = 'employment_agreement_renewal',
  EMPLOYEE_MOBILITY = 'employee_mobility',
  PROBATION_EXTENSION = 'probation_extension',
  STAFF_DATA_UPDATE = 'staff_data_update',
  CHANGE_OF_ADDRESS = 'change_of_address',
  REIMBURSEMENT = 'reimbursement',
  EMPLOYMENT_LETTER_REQUEST = 'employment_letter_request',
  RIGHT_TO_WORK = 'right_to_work',
  PERFORMANCE_IMPROVEMENT_PLAN = 'performance_improvement_plan',
  QUERY_REQUEST = 'query_request',
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  [RequestType.EMPLOYEE_TERMINATION]: 'Employee termination',
  [RequestType.CANCEL_HIRE_BEFORE_START_DATE]: 'Cancel hire before start date',
  [RequestType.CONFIRMATION_REQUEST]: 'Confirmation request',
  [RequestType.PROBATION_CONFIRMATION_LETTER]:
    'Probation confirmation letter',
  [RequestType.EMPLOYMENT_AGREEMENT_AMENDMENT]:
    'Employment agreement amendment',
  [RequestType.EMPLOYMENT_AGREEMENT_EXTENSION]:
    'Employment agreement extension',
  [RequestType.EMPLOYMENT_AGREEMENT_RENEWAL]:
    'Employment agreement renewal',
  [RequestType.EMPLOYEE_MOBILITY]: 'Employee mobility',
  [RequestType.PROBATION_EXTENSION]: 'Probation extension',
  [RequestType.STAFF_DATA_UPDATE]: 'Staff data update',
  [RequestType.CHANGE_OF_ADDRESS]: 'Change of address',
  [RequestType.REIMBURSEMENT]: 'Reimbursement',
  [RequestType.EMPLOYMENT_LETTER_REQUEST]: 'Employment letter request',
  [RequestType.RIGHT_TO_WORK]: 'Right to work',
  [RequestType.PERFORMANCE_IMPROVEMENT_PLAN]:
    'Performance improvement plan',
  [RequestType.QUERY_REQUEST]: 'Query request',
};

export const REQUEST_TYPES: RequestType[] = Object.values(RequestType);
