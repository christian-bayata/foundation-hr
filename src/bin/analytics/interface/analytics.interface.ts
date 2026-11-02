export interface AnalyticsPeriod {
  startDate: string;
  endDate: string;
}

export interface AnalyticsPagination {
  count: number;
  page: number;
  limit: number;
}

export interface AnalyticsCountItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface AnalyticsMonthBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

export interface AnalyticsOverviewSection {
  key: string;
  label: string;
  available: boolean;
  recordCount: number;
  lastActivityAt: string | null;
}

export interface AnalyticsOverview {
  generatedAt: string;
  hasData: boolean;
  sections: AnalyticsOverviewSection[];
}

export interface OnboardingAnalysisRecord {
  employeeId: string;
  employeeUniqueId: string | null;
  employeeName: string;
  email: string;
  avatarUrl: string | null;
  departmentCode: string | null;
  department: string | null;
  jobTitleCode: string | null;
  jobTitle: string | null;
  employmentDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  overallProgress: number;
  completedSteps: number;
  totalSteps: number;
  dueDate: string | null;
  completionDays: number | null;
}

export interface ExitAnalysisRecord {
  id: string;
  employeeId: string;
  employeeUniqueId: string | null;
  employeeName: string | null;
  email: string | null;
  departmentCode: string | null;
  department: string | null;
  jobTitle: string | null;
  exitType: { id: string | null; label: string } | null;
  exitReason: { id: string | null; label: string } | null;
  lastWorkingDay: string | null;
  status: string;
  requestedAt: string | null;
  completedAt: string | null;
  exitChecklistProgress: number;
  complianceProgress: number;
  documentsProgress: number;
}
