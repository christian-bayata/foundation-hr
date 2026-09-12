export enum Department {
  DESIGN = 'design',
  ENGINEERING = 'engineering',
  HR = 'hr',
  IT = 'it',
  MARKETING = 'marketing',
  SALES = 'sales',
}

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  INTERN = 'intern',
}

export enum ContractDuration {
  INDEFINITE = 'indefinite',
  FIXED_TERM = 'fixed_term',
}

export enum ProbationPeriod {
  INDEFINITE = 'indefinite',
  M1 = '1M',
  M3 = '3M',
  M6 = '6M',
  M9 = '9M',
  Y1 = '1Y',
  Y2 = '2Y',
  Y3 = '3Y',
  Y4 = '4Y',
  Y5 = '5Y',
}

export enum WorkMode {
  ON_SITE = 'on_site',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  SHIFT = 'shift',
}

export enum EmployeeType {
  EMPLOYEE = 'employee',
  CONTRACTOR = 'contractor',
}

export enum EmployeeStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
}
