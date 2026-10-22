import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from '../../auth/enum/product.enum';
import { BusinessType } from '../../setting/organisation/enum/organisation.enum';
import {
  CompletionRequirement,
  DocumentFormat,
  DueDate,
  EmploymentType,
  TaskType,
} from '../../setting/employee-profiles/enum/employee-profile.enum';
import { RequestType } from '../../setting/request-management/enum/request-management.enum';
import {
  ApprovalDeadline,
  LeaveAllocationMethod,
} from '../../setting/leave-management/enum/leave-management.enum';
import { DataRetentionPeriod } from '../../setting/offboarding/enum/offboarding.enum';

export type OrganizationDocument = Organization & Document;

// @Schema({ _id: false })
// export class TaxDetails {
//   @Prop({ type: String, trim: true, default: null })
//   taxIdentificationNumber: string | null;

//   @Prop({ type: String, trim: true, default: null })
//   vatNumber: string | null;
// }

@Schema({ _id: true })
export class Location {
  @Prop({ type: String, trim: true, required: true })
  name: string;

  @Prop({ type: String, trim: true, required: true })
  address: string;

  @Prop({ type: String, trim: true, default: null })
  phoneNumber: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email: string | null;
}

@Schema({ _id: false })
export class BusinessDetails {
  // @Prop({ type: String, trim: true, default: null })
  // legalName: string | null;

  @Prop({
    type: String,
    enum: Object.values(BusinessType),
    default: null,
  })
  businessType: BusinessType | null;

  @Prop({ type: String, trim: true, default: null })
  industry: string | null;

  @Prop({ type: String, trim: true, default: null })
  incorporationDate: string | null;

  @Prop({ type: String, trim: true, default: null })
  currency: string | null;

  @Prop({ type: String, trim: true, default: null })
  companySize: string | null;

  @Prop({ type: String, default: null })
  tin: string | null;
}

@Schema({ _id: false })
export class Branding {
  @Prop({ type: String, default: null })
  logoUrl: string | null;

  @Prop({ type: String, default: null })
  navigationBackgroundColor: string | null;

  @Prop({ type: String, default: null })
  buttonColor: string | null;

  @Prop({ type: [String], default: [] })
  customDomains: string[];

  @Prop({ type: [String], default: [] })
  loginPageImages: string[];

  @Prop({ type: String, default: null })
  selectedLoginImg?: string | null;
}

@Schema({ _id: false })
export class NotificationPreferences {
  @Prop({ type: Boolean, default: true })
  newsAndUpdates: boolean;

  @Prop({ type: Boolean, default: true })
  remindersAndEvents: boolean;

  @Prop({ type: Boolean, default: false })
  promotionsAndOffers: boolean;

  @Prop({ type: Boolean, default: true })
  emailNotifications: boolean;

  @Prop({ type: Boolean, default: true })
  pushNotifications: boolean;

  @Prop({ type: Boolean, default: false })
  smsNotifications: boolean;

  @Prop({ type: Boolean, default: true })
  leaveAndAttendance: boolean;

  @Prop({ type: Boolean, default: true })
  deadlineNotification: boolean;
}

@Schema({ _id: false })
export class EmployeeProfileSettings {
  @Prop({ type: Boolean, default: true })
  useEmployeeIdGenerator: boolean;

  @Prop({
    type: [String],
    enum: Object.values(DocumentFormat),
    default: [],
  })
  documentFormats: DocumentFormat[];

  @Prop({
    type: [String],
    enum: Object.values(EmploymentType),
    default: [],
  })
  employmentTypes: EmploymentType[];
}

@Schema({ _id: true })
export class WorkflowStep {
  _id: Types.ObjectId;

  @Prop({ type: String, trim: true, required: true })
  stepName: string;

  @Prop({ type: String, trim: true, default: null })
  responsibleParty: string | null;

  @Prop({ type: String, enum: Object.values(TaskType), default: null })
  taskType: TaskType | null;

  @Prop({ type: String, enum: Object.values(DueDate), default: null })
  dueDate: DueDate | null;

  @Prop({ type: String, trim: true, default: null })
  instructions: string | null;

  @Prop({ type: [String], default: [] })
  attachmentUrls: string[];

  @Prop({
    type: [String],
    enum: Object.values(CompletionRequirement),
    default: [],
  })
  completionRequirements: CompletionRequirement[];
}

@Schema({ _id: false })
export class EmployeeWorkflowSettings {
  @Prop({ type: () => [WorkflowStep], default: [] })
  onboarding: WorkflowStep[];

  @Prop({ type: () => [WorkflowStep], default: [] })
  leave: WorkflowStep[];

  @Prop({ type: () => [WorkflowStep], default: [] })
  offboarding: WorkflowStep[];
}

@Schema({ _id: true })
export class PensionFundAdministrator {
  _id: Types.ObjectId;

  @Prop({ type: String, trim: true, required: true })
  name: string;
}

@Schema({ _id: false })
export class OnboardingDocument {
  @Prop({ type: String, trim: true, required: true })
  id: string;

  @Prop({ type: String, trim: true, required: true })
  label: string;

  @Prop({ type: Boolean, default: true })
  selected: boolean;

  @Prop({ type: Boolean, default: false })
  optional: boolean;
}

@Schema({ _id: false })
export class EmployerIssuedDocument {
  @Prop({ type: String, trim: true, required: true })
  id: string;

  @Prop({ type: String, trim: true, required: true })
  name: string;

  @Prop({ type: String, trim: true, default: null })
  fileType: string | null;

  @Prop({ type: String, trim: true, default: null })
  url: string | null;

  @Prop({ type: Boolean, default: false })
  requiresSignature: boolean;
}

@Schema({ _id: false })
export class OnboardingSettings {
  @Prop({ type: Boolean, default: false })
  welcomeMessageEnabled: boolean;

  @Prop({ type: String, default: null })
  welcomeMessage: string | null;

  @Prop({ type: Boolean, default: false })
  defaultDurationEnabled: boolean;

  @Prop({ type: String, trim: true, default: null })
  defaultDuration: string | null;

  @Prop({ type: () => [OnboardingDocument], default: [] })
  personalIdentificationDocuments: OnboardingDocument[];

  @Prop({ type: () => [OnboardingDocument], default: [] })
  educationalProfessionalCerts: OnboardingDocument[];

  @Prop({ type: () => [OnboardingDocument], default: [] })
  medicalHealthRecords: OnboardingDocument[];

  @Prop({ type: () => [EmployerIssuedDocument], default: [] })
  employerIssuedDocuments: EmployerIssuedDocument[];
}

@Schema({ _id: false })
export class LeaveCategory {
  @Prop({ type: String, trim: true, required: true })
  id: string;

  @Prop({ type: String, trim: true, required: true })
  label: string;
}

@Schema({ _id: false })
export class LeaveManagementSettings {
  @Prop({ type: () => [LeaveCategory], default: [] })
  leaveCategories: LeaveCategory[];

  @Prop({ type: Boolean, default: false })
  allowCarryover: boolean;

  @Prop({ type: Boolean, default: false })
  autoApprovalEnabled: boolean;

  @Prop({ type: String, enum: Object.values(ApprovalDeadline), default: null })
  approvalDeadline: ApprovalDeadline | null;

  @Prop({ type: Boolean, default: false })
  holidaysCountAsLeave: boolean;
}

@Schema({ _id: false })
export class LeaveRestrictedPeriod {
  @Prop({ type: String, trim: true, required: true })
  id: string;

  @Prop({ type: String, trim: true, required: true })
  name: string;

  @Prop({ type: String, trim: true, default: null })
  startDate: string | null;

  @Prop({ type: String, trim: true, default: null })
  endDate: string | null;

  @Prop({ type: [String], default: [] })
  departmentCodes: string[];
}

@Schema({ _id: false })
export class LeaveEntitlementSettings {
  @Prop({
    type: String,
    enum: Object.values(LeaveAllocationMethod),
    default: null,
  })
  allocationMethod: LeaveAllocationMethod | null;

  @Prop({
    type: [String],
    enum: Object.values(EmploymentType),
    default: [],
  })
  employmentTypes: EmploymentType[];

  @Prop({ type: () => [LeaveRestrictedPeriod], default: [] })
  restrictedPeriods: LeaveRestrictedPeriod[];
}

@Schema({ _id: false })
export class OffboardingType {
  @Prop({ type: String, trim: true, required: true })
  id: string;

  @Prop({ type: String, trim: true, required: true })
  label: string;
}

@Schema({ _id: false })
export class ExitReason {
  @Prop({ type: String, trim: true, required: true })
  id: string;

  @Prop({ type: String, trim: true, required: true })
  label: string;
}

@Schema({ _id: false })
export class ExitChecklistItem {
  @Prop({ type: String, trim: true, required: true })
  id: string;

  @Prop({ type: String, trim: true, required: true })
  label: string;

  @Prop({ type: String, trim: true, default: null })
  description: string | null;

  @Prop({ type: Boolean, default: true })
  selected: boolean;
}

@Schema({ _id: false })
export class OffboardingSettings {
  @Prop({ type: () => [OffboardingType], default: [] })
  offboardingTypes: OffboardingType[];

  @Prop({ type: () => [ExitReason], default: [] })
  exitReasons: ExitReason[];

  @Prop({ type: () => [ExitChecklistItem], default: [] })
  exitChecklist: ExitChecklistItem[];
}

@Schema({ _id: false })
export class EmployerExitDocument {
  @Prop({ type: String, trim: true, required: true })
  id: string;

  @Prop({ type: String, trim: true, required: true })
  name: string;

  @Prop({ type: String, trim: true, default: null })
  fileType: string | null;

  @Prop({ type: Boolean, default: false })
  requiresSignature: boolean;
}

@Schema({ _id: false })
export class OffboardingDocumentsSettings {
  @Prop({ type: () => [EmployerExitDocument], default: [] })
  employerExitDocuments: EmployerExitDocument[];

  @Prop({ type: () => [ExitChecklistItem], default: [] })
  complianceChecklist: ExitChecklistItem[];

  @Prop({
    type: String,
    enum: Object.values(DataRetentionPeriod),
    default: null,
  })
  dataRetentionPeriod: DataRetentionPeriod | null;
}

@Schema({ _id: true })
export class RequestWorkflowStep {
  _id: Types.ObjectId;

  @Prop({ type: Number, default: 1 })
  order: number;

  @Prop({ type: String, trim: true, default: null })
  responsibleParty: string | null;
}

@Schema({ _id: true })
export class RequestWorkflow {
  _id: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(RequestType), required: true })
  requestType: RequestType;

  @Prop({ type: String, trim: true, required: true })
  name: string;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  @Prop({ type: () => [RequestWorkflowStep], default: [] })
  steps: RequestWorkflowStep[];
}

@Schema({ _id: false })
export class PaymentMethod {
  @Prop({ type: String, default: null })
  brand: string | null;

  @Prop({ type: String, default: null })
  last4: string | null;

  @Prop({ type: String, default: null })
  expiry: string | null;
}

@Schema({ _id: false })
export class Plan {
  @Prop({ type: String, default: null })
  name: string | null;

  @Prop({ type: String, default: null })
  interval: string | null;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Number, default: null })
  priceAmount: number | null;

  @Prop({ type: String, default: null })
  priceCurrency: string | null;

  @Prop({ type: Number, default: null })
  seatsUsed: number | null;

  @Prop({ type: Number, default: null })
  seatsLimit: number | null;
}

@Schema({ _id: false })
export class Billing {
  @Prop({ type: () => Plan, default: null })
  plan: Plan | null;

  @Prop({ type: () => PaymentMethod, default: null })
  paymentMethod: PaymentMethod | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  billingEmail: string | null;
}

@Schema({ timestamps: true })
export class Organization {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  size: string;

  @Prop({ type: String, required: true })
  country: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  domainPrefix: string | null;

  @Prop({ type: String, required: true })
  ownerId: string;

  @Prop({ type: [String], enum: Object.values(Product), default: [] })
  products: Product[];

  @Prop({ type: String, default: null })
  topInterest: string | null;

  @Prop({ type: Boolean, default: false })
  marketingOptIn: boolean;

  @Prop({ type: Date, default: null })
  termsAcceptedAt: Date | null;

  @Prop({ type: String, trim: true, default: null })
  registrationNumber: string | null;

  @Prop({ type: String, trim: true, default: null })
  website: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  primaryContactEmail: string | null;

  @Prop({ type: String, trim: true, default: null })
  phoneNumber: string | null;

  @Prop({ type: String, trim: true, default: null })
  timezone: string | null;

  @Prop({ type: String, trim: true, default: null })
  language: string | null;

  @Prop({ type: String, trim: true, default: null })
  fiscalYearStartDate: string | null;

  @Prop({ type: () => BusinessDetails, default: null })
  businessDetails: BusinessDetails | null;

  @Prop({ type: () => [Location], default: [] })
  locations: Location[];

  @Prop({ type: () => Branding, default: null })
  branding: Branding | null;

  @Prop({ type: () => Billing, default: null })
  billing: Billing | null;

  @Prop({ type: () => NotificationPreferences, default: null })
  notifications: NotificationPreferences | null;

  @Prop({ type: () => EmployeeProfileSettings, default: null })
  employeeProfiles: EmployeeProfileSettings | null;

  @Prop({ type: () => EmployeeWorkflowSettings, default: null })
  employeeWorkflow: EmployeeWorkflowSettings | null;

  @Prop({ type: [String], default: [] })
  customResponsibleParties: string[];

  @Prop({ type: () => [PensionFundAdministrator], default: [] })
  pensionFundAdministrators: PensionFundAdministrator[];

  @Prop({ type: () => OnboardingSettings, default: null })
  onboarding: OnboardingSettings | null;

  @Prop({ type: () => [RequestWorkflow], default: [] })
  requestWorkflows: RequestWorkflow[];

  @Prop({ type: () => LeaveManagementSettings, default: null })
  leaveManagement: LeaveManagementSettings | null;

  @Prop({ type: () => LeaveEntitlementSettings, default: null })
  leaveEntitlement: LeaveEntitlementSettings | null;

  @Prop({ type: () => OffboardingSettings, default: null })
  offboarding: OffboardingSettings | null;

  @Prop({ type: () => OffboardingDocumentsSettings, default: null })
  offboardingDocuments: OffboardingDocumentsSettings | null;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index(
  { ownerId: 1 },
  { name: 'organization_owner_idx', unique: true },
);
OrganizationSchema.index(
  { domainPrefix: 1 },
  {
    name: 'organization_domain_prefix_idx',
    unique: true,
    // Only organizations that actually have a prefix take part in the
    // constraint, so the many organizations that have not set one yet (the
    // field is persisted as null) never collide with each other.
    partialFilterExpression: { domainPrefix: { $type: 'string' } },
  },
);
