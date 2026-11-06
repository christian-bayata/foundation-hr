export enum RequestType {
  EMPLOYEE_TERMINATION = 'employee_termination',
  CANCEL_HIRE_BEFORE_START_DATE = 'cancel_hire_before_start_date',
  CONFIRMATION_REQUEST = 'confirmation_request',
  EMPLOYMENT_AGREEMENT_EXTENSION = 'employment_agreement_extension',
  EMPLOYMENT_AGREEMENT_RENEWAL = 'employment_agreement_renewal',
  EMPLOYEE_MOBILITY = 'employee_mobility',
  PROBATION_EXTENSION = 'probation_extension',
  STAFF_DATA_UPDATE = 'staff_data_update',
  PERFORMANCE_IMPROVEMENT_PLAN = 'performance_improvement_plan',
  QUERY_REQUEST = 'query_request',
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  [RequestType.EMPLOYEE_TERMINATION]: 'Employee termination',
  [RequestType.CANCEL_HIRE_BEFORE_START_DATE]: 'Cancel hire before start date',
  [RequestType.CONFIRMATION_REQUEST]: 'Confirmation request',
  [RequestType.EMPLOYMENT_AGREEMENT_EXTENSION]:
    'Employment agreement extension',
  [RequestType.EMPLOYMENT_AGREEMENT_RENEWAL]: 'Employment agreement renewal',
  [RequestType.EMPLOYEE_MOBILITY]: 'Employee mobility',
  [RequestType.PROBATION_EXTENSION]: 'Probation extension',
  [RequestType.STAFF_DATA_UPDATE]: 'Staff data update',
  [RequestType.PERFORMANCE_IMPROVEMENT_PLAN]: 'Performance improvement plan',
  [RequestType.QUERY_REQUEST]: 'Query request',
};

export const REQUEST_TYPES: RequestType[] = Object.values(RequestType);
