import { DashboardMetricKey } from '../enum/dashboard.enum';

export interface DashboardPeriod {
  startDate: string;
  endDate: string;
}

export interface DashboardMetric {
  key: DashboardMetricKey;
  label: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number | null;
  changeDirection: 'up' | 'down' | 'flat';
  comparisonLabel: string;
}

export interface DashboardTrendBucket {
  key: string;
  label: string;
  shortLabel: string;
  headcount: number;
  newHires: number;
  exits: number;
  approvedLeaveRequests: number;
}

export interface DashboardSummary {
  generatedAt: string;
  period: DashboardPeriod;
  rangeMonths: number;
  hasData: boolean;
  metrics: DashboardMetric[];
  trend: DashboardTrendBucket[];
}

export interface DashboardOnboardingSummary {
  total: number;
  draft: number;
  incomplete: number;
  overdue: number;
  onboarded: number;
  completionRate: number;
}

export interface DashboardOnboardingItem {
  employeeId: string;
  employeeUniqueId: string | null;
  employeeName: string;
  email: string;
  avatarUrl: string | null;
  departmentCode: string | null;
  department: string | null;
  jobTitle: string | null;
  employmentDate: string | null;
  status: string;
  progress: number;
  completedSteps: number;
  totalSteps: number;
  dueDate: string | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
}

export interface DashboardOnboardingProgress {
  generatedAt: string;
  hasData: boolean;
  summary: DashboardOnboardingSummary;
  data: DashboardOnboardingItem[];
  count: number;
  page: number;
  limit: number;
}

export interface DashboardDistributionItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface DashboardEmployeeDistribution {
  generatedAt: string;
  hasData: boolean;
  dimension: string;
  total: number;
  data: DashboardDistributionItem[];
}

export interface DashboardActivityActor {
  userId: string;
  name: string | null;
}

export interface DashboardActivityEmployee {
  employeeId: string;
  employeeUniqueId: string | null;
  employeeName: string;
  avatarUrl: string | null;
}

export interface DashboardActivity {
  id: string;
  type: string;
  action: string;
  title: string;
  description: string;
  occurredAt: string;
  actor: DashboardActivityActor | null;
  employee: DashboardActivityEmployee | null;
}

export interface DashboardRecentActivities {
  generatedAt: string;
  hasData: boolean;
  data: DashboardActivity[];
  count: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
