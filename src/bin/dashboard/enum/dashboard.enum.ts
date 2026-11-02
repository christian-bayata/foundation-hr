export enum DashboardMetricKey {
  TOTAL_EMPLOYEES = 'total_employees',
  LEAVE = 'leave',
  NEW_HIRES = 'new_hires',
  EXITS = 'exits',
}

export enum DashboardActivityType {
  EMPLOYEE_ADDED = 'employee_added',
  ONBOARDING_STEP_COMPLETED = 'onboarding_step_completed',
  LEAVE_REQUESTED = 'leave_requested',
  LEAVE_REVIEWED = 'leave_reviewed',
  EXIT_REQUESTED = 'exit_requested',
  EXIT_COMPLETED = 'exit_completed',
}

export enum DashboardDistributionDimension {
  DEPARTMENT = 'department',
  STATUS = 'status',
  EMPLOYMENT_TYPE = 'employment_type',
  JOB_TYPE = 'job_type',
  WORK_MODE = 'work_mode',
  LOCATION = 'location',
}

export enum DashboardInterval {
  SEVEN_DAYS = '7_days',
  THIRTY_DAYS = '30_days',
  TWELVE_MONTHS = '12_months',
}
