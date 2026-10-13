export enum RequestType {
  EMPLOYEE_TERMINATION = 'employee_termination',
  CANCEL_HIRE_BEFORE_START_DATE = 'cancel_hire_before_start_date',
  EMPLOYMENT_AGREEMENT_AMENDMENT = 'employment_agreement_amendment',
  EMPLOYMENT_AGREEMENT_EXTENSION = 'employment_agreement_extension',
  EMPLOYMENT_AGREEMENT_RENEWAL = 'employment_agreement_renewal',
  PROBATION_CONFIRMATION_LETTER = 'probation_confirmation_letter',
  PROBATION_EXTENSION = 'probation_extension',
  CONFIRMATION_REQUEST = 'confirmation_request',
  PERFORMANCE_IMPROVEMENT_PLAN = 'performance_improvement_plan',
  QUERY_REQUEST = 'query_request',
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  [RequestType.EMPLOYEE_TERMINATION]: 'Employee termination',
  [RequestType.CANCEL_HIRE_BEFORE_START_DATE]: 'Cancel hire before start date',
  [RequestType.EMPLOYMENT_AGREEMENT_AMENDMENT]:
    'Employment agreement amendment',
  [RequestType.EMPLOYMENT_AGREEMENT_EXTENSION]:
    'Employment agreement extension',
  [RequestType.EMPLOYMENT_AGREEMENT_RENEWAL]: 'Employment agreement renewal',
  [RequestType.PROBATION_CONFIRMATION_LETTER]: 'Probation confirmation letter',
  [RequestType.PROBATION_EXTENSION]: 'Probation extension',
  [RequestType.CONFIRMATION_REQUEST]: 'Confirmation request',
  [RequestType.PERFORMANCE_IMPROVEMENT_PLAN]: 'Performance improvement plan',
  [RequestType.QUERY_REQUEST]: 'Query request',
};

export const REQUEST_TYPES: RequestType[] = Object.values(RequestType);
