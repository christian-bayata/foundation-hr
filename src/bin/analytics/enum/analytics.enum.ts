export enum AnalyticsSection {
  EMPLOYEE = 'employee',
  ONBOARDING = 'onboarding',
  LEAVE = 'leave',
  OFFBOARDING = 'offboarding',
}

export const ANALYTICS_SECTION_LABELS: Record<AnalyticsSection, string> = {
  [AnalyticsSection.EMPLOYEE]: 'Employee analysis',
  [AnalyticsSection.ONBOARDING]: 'Onboarding analysis',
  [AnalyticsSection.LEAVE]: 'Leave analysis',
  [AnalyticsSection.OFFBOARDING]: 'Offboarding analysis',
};
