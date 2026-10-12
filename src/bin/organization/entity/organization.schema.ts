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
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index(
  { ownerId: 1 },
  { name: 'organization_owner_idx', unique: true },
);
