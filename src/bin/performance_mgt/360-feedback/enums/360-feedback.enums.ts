export enum FeedbackCycleStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  ENDED = 'ended',
  ARCHIVED = 'archived',
}

export enum FeedbackStage {
  SELF = 'self',
  PEER = 'peer',
  MANAGER = 'manager',
  HOD = 'hod',
  EXTERNAL = 'external_stakeholder',
  FINAL = 'final',
}

export enum FeedbackStageStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  OVERDUE = 'overdue',
}

export enum FeedbackStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PENDING = 'pending',
}

export enum RespondentType {
  SELF = 'self',
  HOD = 'hod',
  PEERS = 'peers',
  SUBORDINATES = 'subordinates',
  EXTERNAL_STAKEHOLDERS = 'external_stakeholders',
}

export enum FeedbackActionType {
  NOMINATE_RESPONDENTS = 'nominate_respondents',
  SEND_REMINDER = 'send_reminder',
  EXPORT_REPORT = 'export_report',
  DOWNLOAD_REPORT = 'download_report',
}

export enum FeedbackTab {
  OVERVIEW = 'overview',
  APPRAISALS = 'appraisals',
  CALIBRATION = 'calibration',
  GOAL_SETTINGS = 'goal_settings',
  REPORT_ANALYTICS = 'report_analytics',
  PERFORMANCE_PLAN = 'performance_plan',
}
