export enum DocumentFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  DOC = 'doc',
  TXT = 'txt',
  XLSX = 'xlsx',
  XLS = 'xls',
  CSV = 'csv',
  ODS = 'ods',
  PPTX = 'pptx',
  PPT = 'ppt',
  ODP = 'odp',
  JPG = 'jpg',
  JPEG = 'jpeg',
  PNG = 'png',
  TIFF = 'tiff',
  TIF = 'tif',
  GIF = 'gif',
  MP3 = 'mp3',
  WAV = 'wav',
  MOV = 'mov',
  MP4 = 'mp4',
  AVI = 'avi',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  INTERN = 'intern',
  CONTRACT = 'contract',
}

export enum WorkflowType {
  ONBOARDING = 'onboarding',
  LEAVE = 'leave',
  OFFBOARDING = 'offboarding',
}

export enum CompletionRequirement {
  MARKED_AS_COMPLETE = 'marked_as_complete',
  APPROVED_BY_MANAGER = 'approved_by_manager',
  AUTOMATIC_COMPLETION = 'automatic_completion',
}

// export enum ResponsibleParty {
//   ADMIN = 'admin',
//   ONBOARDING_MANAGER = 'onboarding_manager',
//   HEAD_OF_DEPARTMENT = 'head_of_department',
//   LINE_MANAGER = 'line_manager',
//   NEW_HIRE = 'new_hire',
//   EMPLOYEE = 'employee',
// }

export enum TaskType {
  UPLOAD_DOCUMENTS = 'upload_documents',
  COMPLETE_FORM = 'complete_form',
  ATTEND_ORIENTATION = 'attend_orientation',
  OTHER = 'other',
}

export enum DueDate {
  ONE_DAY_AFTER_JOINING = '1_day_after_joining',
  TWO_DAYS_AFTER_JOINING = '2_days_after_joining',
  THREE_DAYS_AFTER_JOINING = '3_days_after_joining',
  FOUR_DAYS_AFTER_JOINING = '4_days_after_joining',
}
