export enum AppraisalCycleStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  ENDED = 'ended',
  ARCHIVED = 'archived',
}

export enum AppraisalReviewType {
  ANNUAL = 'annual_review',
  MID_YEAR = 'mid_year_review',
  QUARTERLY = 'quarterly_review',
  PROBATION = 'probation_review',
  PROJECT = 'project_review',
}

export enum AppraisalTargetPopulation {
  DEPARTMENTS = 'departments',
  ALL_EMPLOYEES = 'all_employees',
  JOB_TITLES = 'job_titles',
}

export enum AppraisalStatus {
  NOT_STARTED = 'not_started',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  NO_GOAL_SET = 'no_goal_set',
  SKIPPED = 'skipped',
}

export enum AppraisalStage {
  SELF = 'self',
  MANAGER = 'manager',
  FINAL = 'final',
}

export enum AppraisalStageStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  OVERDUE = 'overdue',
}

export enum AppraisalRatingTag {
  OUTSTANDING_PERFORMANCE = 'outstanding_performance',
  EXCEEDS_EXPECTATIONS = 'exceeds_expectations',
  MEETS_EXPECTATIONS = 'meets_expectations',
  AVERAGE_PERFORMANCE = 'average_performance',
  IMPROVEMENT_NEEDED = 'improvement_needed',
}

export enum AppraisalPerspective {
  FINANCIAL = 'financial',
  INTERNAL_PROCESS = 'internal_process',
  CUSTOMER = 'customer',
  LEARNING_AND_GROWTH = 'learning_and_growth',
  CORE_VALUES = 'core_values',
}

export enum AppraisalActionType {
  REROUTE = 'reroute',
  RESET = 'reset',
  CALIBRATE = 'calibrate',
  RECOMPUTE = 'recompute',
  SKIP = 'skip',
}

export enum CalibrationSessionStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  FINALISED = 'finalised',
  LOCKED = 'locked',
  CLOSED = 'closed',
}

export enum CalibrationModel {
  RATING_DISTRIBUTION = 'rating_distribution',
  NINE_BOX = 'nine_box',
}

export enum CalibrationPerformanceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum CalibrationPotential {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum CalibrationParticipantStatus {
  PENDING = 'pending',
  ADJUSTED = 'adjusted',
  JUSTIFIED = 'justified',
  FINALISED = 'finalised',
}

export enum CalibrationTimeInBox {
  LT_3M = 'lt_3m',
  FROM_3_6M = '3_6m',
  FROM_6_12M = '6_12m',
  GT_12M = 'gt_12m',
}

export enum CalibrationParticipantTab {
  ALL = 'all',
  NEEDS_JUSTIFICATION = 'needs_justification',
  ADJUSTED = 'adjusted',
  MOVED = 'moved',
}

export enum ParticipantAuditAction {
  SUBMIT_SELF = 'submit_self',
  SUBMIT_MANAGER = 'submit_manager',
  SUBMIT_FINAL = 'submit_final',
  CALIBRATE = 'calibrate',
  REROUTE = 'reroute',
  RESET = 'reset',
  SKIP = 'skip',
  REMINDER_SENT = 'reminder_sent',
  RATING_ADJUSTED = 'rating_adjusted',
  JUSTIFICATION_ADDED = 'justification_added',
  POTENTIAL_SET = 'potential_set',
  MOVED_BOX = 'moved_box',
  SESSION_STARTED = 'session_started',
  SESSION_FINALISED = 'session_finalised',
  SESSION_LOCKED = 'session_locked',
}
