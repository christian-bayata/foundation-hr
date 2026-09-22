import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  ContactType,
  ContractDuration,
  Department,
  EducationLevel,
  EmployeeStatus,
  EmployeeType,
  JobType,
  MaritalStatus,
  OnboardingStep,
  Religion,
  Sex,
  VoluntaryContribution,
  WorkMode,
} from '../enum/employee.enum';

export type EmployeeDocument = Employee & Document;

@Schema({ _id: false })
export class PersonalDetails {
  @Prop({ type: String, trim: true, default: null })
  phone: string | null;

  @Prop({ type: Date, default: null })
  dateOfBirth: Date | null;

  @Prop({ type: String, enum: Object.values(Sex), default: null })
  sex: Sex | null;

  @Prop({ type: String, trim: true, default: null })
  nationality: string | null;

  @Prop({ type: String, trim: true, default: null })
  stateOfOrigin: string | null;

  @Prop({ type: String, trim: true, default: null })
  lga: string | null;

  @Prop({ type: String, enum: Object.values(MaritalStatus), default: null })
  maritalStatus: MaritalStatus | null;

  @Prop({ type: String, enum: Object.values(Religion), default: null })
  religion: Religion | null;
}

export const PersonalDetailsSchema =
  SchemaFactory.createForClass(PersonalDetails);

@Schema({ _id: false })
export class HomeAddress {
  @Prop({ type: String, trim: true, default: null })
  address: string | null;

  @Prop({ type: String, trim: true, default: null })
  country: string | null;

  @Prop({ type: String, trim: true, default: null })
  state: string | null;
}

export const HomeAddressSchema = SchemaFactory.createForClass(HomeAddress);

@Schema({ _id: false })
export class AcademicInfo {
  @Prop({ type: String, enum: Object.values(EducationLevel), default: null })
  educationLevel: EducationLevel | null;

  @Prop({ type: String, trim: true, default: null })
  institution: string | null;

  @Prop({ type: String, trim: true, default: null })
  qualification: string | null;
}

export const AcademicInfoSchema = SchemaFactory.createForClass(AcademicInfo);

@Schema({ _id: false })
export class EmployeeContact {
  @Prop({
    type: String,
    enum: Object.values(ContactType),
    required: true,
  })
  type: ContactType;

  @Prop({ type: String, trim: true, default: null })
  fullName: string | null;

  @Prop({ type: String, trim: true, default: null })
  relationship: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone: string | null;

  @Prop({ type: String, trim: true, default: null })
  email: string | null;

  @Prop({ type: String, trim: true, default: null })
  address: string | null;
}

export const EmployeeContactSchema =
  SchemaFactory.createForClass(EmployeeContact);

@Schema({ _id: false })
export class BankDetails {
  @Prop({ type: String, trim: true, default: null })
  bank: string | null;

  @Prop({ type: String, trim: true, default: null })
  accountHolderName: string | null;

  @Prop({ type: String, trim: true, default: null })
  accountNumber: string | null;

  @Prop({ type: String, trim: true, default: null })
  bvn: string | null;
}

export const BankDetailsSchema = SchemaFactory.createForClass(BankDetails);

@Schema({ _id: false })
export class PensionDetails {
  @Prop({ type: String, trim: true, default: null })
  pensionProvider: string | null;

  @Prop({ type: String, trim: true, default: null })
  rsa: string | null;

  @Prop({
    type: String,
    enum: Object.values(VoluntaryContribution),
    default: null,
  })
  voluntaryContribution: VoluntaryContribution | null;

  @Prop({ type: Number, default: null })
  voluntaryContributionAmount: number | null;
}

export const PensionDetailsSchema =
  SchemaFactory.createForClass(PensionDetails);

@Schema({ _id: false })
export class TaxDetails {
  @Prop({ type: String, trim: true, default: null })
  tin: string | null;

  @Prop({ type: String, trim: true, default: null })
  stateOfResidence: string | null;
}

export const TaxDetailsSchema = SchemaFactory.createForClass(TaxDetails);

@Schema({ _id: false })
export class FinanceInformation {
  @Prop({ type: BankDetailsSchema, default: null })
  bankDetails: BankDetails | null;

  @Prop({ type: PensionDetailsSchema, default: null })
  pensionDetails: PensionDetails | null;

  @Prop({ type: TaxDetailsSchema, default: null })
  taxDetails: TaxDetails | null;
}

export const FinanceInformationSchema =
  SchemaFactory.createForClass(FinanceInformation);

@Schema({ _id: false })
export class OnboardingProgress {
  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @Prop({
    type: [String],
    enum: Object.values(OnboardingStep),
    default: [],
  })
  completedSteps: OnboardingStep[];

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

export const OnboardingProgressSchema =
  SchemaFactory.createForClass(OnboardingProgress);

@Schema({ timestamps: true })
export class Employee {
  @Prop({
    type: String,
    enum: Object.values(EmployeeType),
    default: null,
  })
  employeeType: EmployeeType | null;

  @Prop({ type: String, trim: true, default: null })
  firstName: string | null;

  @Prop({ type: String, trim: true, default: null })
  lastName: string | null;

  @Prop({ type: String, trim: true, default: null })
  middleName: string | null;

  @Prop({ type: String, trim: true, default: null })
  employeeUniqueId: string | null;

  @Prop({ type: String, required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ type: Date, default: null })
  employmentDate: Date | null;

  @Prop({
    type: String,
    enum: Object.values(ContractDuration),
    default: null,
  })
  contractDuration: ContractDuration | null;

  @Prop({ type: String, enum: Object.values(JobType), default: null })
  jobType: JobType | null;

  @Prop({ type: String, enum: Object.values(WorkMode), default: null })
  workMode: WorkMode | null;

  @Prop({ type: String, default: null })
  probationPeriod: string | null;

  @Prop({ type: String, default: null })
  departmentCode: string | null;

  @Prop({ type: String, default: null })
  jobTitleCode: string | null;

  @Prop({ type: String, default: null })
  supervisor: string | null;

  @Prop({ type: String, default: null })
  location: string | null;

  @Prop({ type: Number, default: null })
  salary: number | null;

  @Prop({ type: String, trim: true, default: 'NGN' })
  salaryCurrency: string;

  @Prop({
    type: String,
    enum: Object.values(EmployeeStatus),
    default: EmployeeStatus.DRAFT,
  })
  status: EmployeeStatus;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  @Prop({ type: String, default: null })
  organizationId: string | null;

  @Prop({ type: Date, default: null })
  inviteExpiresAt: Date | null;

  @Prop({ type: Boolean, default: false })
  hasJoinedOrg: boolean;

  @Prop({ type: String, default: null, select: false })
  password: string | null;

  @Prop({
    type: {
      tokenHash: { type: String },
      expiresAt: { type: Date },
    },
    default: null,
  })
  resetToken?: { tokenHash: string; expiresAt: Date } | null;

  @Prop({
    type: [
      {
        tokenHash: { type: String },
        expiresAt: { type: Date },
        createdAt: { type: Date },
      },
    ],
    default: [],
  })
  refreshTokens: { tokenHash: string; expiresAt: Date; createdAt: Date }[];

  @Prop({ type: PersonalDetailsSchema, default: null })
  personalDetails: PersonalDetails | null;

  @Prop({ type: HomeAddressSchema, default: null })
  homeAddress: HomeAddress | null;

  @Prop({ type: AcademicInfoSchema, default: null })
  academicInfo: AcademicInfo | null;

  @Prop({ type: [EmployeeContactSchema], default: [] })
  contacts: EmployeeContact[];

  @Prop({ type: FinanceInformationSchema, default: null })
  financeInformation: FinanceInformation | null;

  @Prop({ type: OnboardingProgressSchema, default: null })
  onboarding: OnboardingProgress | null;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.index(
  { email: 1 },
  { name: 'employee_email_idx', unique: true },
);
EmployeeSchema.index(
  { employeeId: 1 },
  {
    name: 'employee_employee_id_idx',
    unique: true,
    partialFilterExpression: { employeeId: { $type: 'string' } },
  },
);
EmployeeSchema.index(
  { organizationId: 1 },
  { name: 'employee_organization_idx' },
);
