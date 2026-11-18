export enum MobilityRequestType {
  TRANSFER = 'transfer',
  REDEPLOYMENT = 'redeployment',
  CHANGE_OF_JOB_ROLE = 'change_of_job_role',
  PROMOTION = 'promotion',
  REDUNDANCY = 'redundancy',
  TERMINATION = 'termination',
}

export enum PerformanceIssue {
  POOR_QUALITY_OF_WORK = 'poor_quality_of_work',
  MISSED_DEADLINES = 'missed_deadlines',
  LOW_PRODUCTIVITY = 'low_productivity',
  LACK_OF_INITIATIVE = 'lack_of_initiative',
  FREQUENT_ERRORS = 'frequent_errors',
  ATTENDANCE_ISSUES = 'attendance_issues',
  INABILITY_TO_FOLLOW_INSTRUCTIONS = 'inability_to_follow_instructions',
}

export enum AreaOfConcern {
  BEHAVIOURAL_ISSUES = 'behavioural_issues',
  PERFORMANCE_ISSUES = 'performance_issues',
  ATTENDANCE_ISSUES = 'attendance_issues',
  SAFETY_AND_COMPLIANCE_ISSUES = 'safety_and_compliance_issues',
  OTHERS = 'others',
}

export enum TerminationType {
  TERMINATION = 'termination',
  RESIGNATION = 'resignation',
  RETIREMENT = 'retirement',
  LAYOFF = 'layoff',
  END_OF_CONTRACT = 'end_of_contract',
  REDUNDANCY = 'redundancy',
  DEATH_OF_EMPLOYEE = 'death_of_employee',
}

export enum InformationToUpdate {
  CHANGE_OF_ADDRESS = 'change_of_address',
  MARITAL_STATUS = 'marital_status',
  CHANGE_OF_ACCOUNT_DETAILS = 'change_of_account_details',
  CHANGE_OF_NAME = 'change_of_name',
  EDUCATIONAL_QUALIFICATIONS = 'educational_qualifications',
  CHANGE_OF_EMERGENCY_CONTACT = 'change_of_emergency_contact',
}

export enum AmendmentChangeType {
  SALARY = 'salary',
  JOB_TITLE = 'job_title',
  BENEFITS = 'benefits',
  LOCATION = 'location',
}

export enum PerformanceRating {
  EXCEEDS_EXPECTATIONS = 'exceeds_expectations',
  MEETS_EXPECTATIONS = 'meets_expectations',
  NEEDS_IMPROVEMENT = 'needs_improvement',
}

export enum YesNo {
  YES = 'yes',
  NO = 'no',
}

export enum TypeOfMove {
  PROMOTION = 'promotion',
  TRANSFER = 'transfer',
  REDEPLOYMENT = 'redeployment',
}

export enum TerminationReason {
  PERFORMANCE = 'performance',
  MISCONDUCT = 'misconduct',
  REDUNDANCY = 'redundancy',
  RESIGNATION = 'resignation',
  OTHER = 'other',
}

export enum FinalSettlementOption {
  CALCULATE_AUTOMATICALLY = 'calculate_automatically',
  MANUAL = 'manual',
}

export enum CancelHireReason {
  ROLE_WITHDRAWN = 'role_withdrawn',
  CANDIDATE_DECLINED = 'candidate_declined',
  BUDGET = 'budget',
  OTHER = 'other',
}

export enum QueryNature {
  ATTENDANCE = 'attendance',
  CONDUCT = 'conduct',
  PAY = 'pay',
  PERFORMANCE = 'performance',
  OTHER = 'other',
}

export enum StaffDataField {
  BANK_ACCOUNT = 'bank_account',
  PHONE_NUMBER = 'phone_number',
  EMAIL_ADDRESS = 'email_address',
  EMERGENCY_CONTACT = 'emergency_contact',
  ADDRESS = 'address',
  OTHER = 'other',
}

export enum ReimbursementCategory {
  TRAVEL = 'travel',
  MEALS = 'meals',
  EQUIPMENT = 'equipment',
  OTHER = 'other',
}

export enum PayrollPaymentMethod {
  NEXT_PAYROLL_RUN = 'next_payroll_run',
  ONE_OFF_PAYMENT = 'one_off_payment',
}

export enum EmploymentLetterType {
  PROOF_OF_EMPLOYMENT = 'proof_of_employment',
  INCOME_VERIFICATION = 'income_verification',
  VISA_SUPPORT = 'visa_support',
  OTHER = 'other',
}

export enum RightToWorkDocumentType {
  WORK_PERMIT = 'work_permit',
  VISA = 'visa',
  NATIONAL_ID = 'national_id',
  PASSPORT = 'passport',
  OTHER = 'other',
}
