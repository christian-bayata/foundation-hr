export enum GoalLevel {
  ORGANISATION = 'organisation',
  DEPARTMENT = 'department',
  EMPLOYEE = 'employee',
}

export enum GoalPerspective {
  FINANCIAL = 'financial',
  INTERNAL_PROCESS = 'internal_process',
  CUSTOMER = 'customer',
  LEARNING_AND_GROWTH = 'learning_and_growth',
  CORE_VALUES = 'core_values',
}

export enum GoalStatus {
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  PENDING_APPROVAL = 'pending_approval',
  COMPLETED = 'completed',
}

export enum GoalFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  BI_ANNUALLY = 'bi_annually',
  ANNUALLY = 'annually',
}

export enum KpiType {
  HIGHER_IS_BETTER = 'higher_is_better',
  ALL_IN = 'all_in',
  LESS_IS_MORE = 'less_is_more',
  NEGATIVE_SCORE = 'negative_score',
  MINIMALIST = 'minimalist',
}

export enum GoalPlanType {
  CASCADING_GOALS = 'cascading_goals',
  INDIVIDUAL_GOALS = 'individual_goals',
  DEPARTMENT_GOALS = 'department_goals',
}

export enum TargetPopulation {
  DEPARTMENT = 'department',
  ALL_EMPLOYEES = 'all_employees',
  BUSINESS_UNIT = 'business_unit',
}

export enum GoalPlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ENDED = 'ended',
  ARCHIVED = 'archived',
}
