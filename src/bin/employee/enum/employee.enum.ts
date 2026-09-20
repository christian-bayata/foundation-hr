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

export enum Sex {
  MALE = 'male',
  FEMALE = 'female',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
}

export enum Religion {
  CHRISTIANITY = 'christianity',
  ISLAM = 'islam',
  OTHERS = 'others',
}

export enum EducationLevel {
  SSCE = 'ssce',
  OND = 'ond',
  HND = 'hnd',
  BSC = 'bsc',
  MSC = 'msc',
  PHD = 'phd',
  OTHERS = 'others',
}

export enum ContactType {
  EMERGENCY_CONTACT = 'emergency_contact',
  GUARANTOR = 'guarantor',
  DEPENDANT = 'dependant',
}

export enum VoluntaryContribution {
  YES = 'yes',
  NO = 'no',
}

export enum OnboardingStep {
  BASIC_INFORMATION = 'basic_information',
  ASSOCIATED_CONTACTS = 'associated_contacts',
  FINANCE_INFORMATION = 'finance_information',
}
