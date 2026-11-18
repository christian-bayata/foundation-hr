import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SystemRole } from '../../../generic/auth/enum/role.enum';
import { RequestType } from '../../../generic/setting/request-management/enum/request-management.enum';
import {
  RequestActivityType,
  RequestDelegationStatus,
  RequestDocumentStatus,
} from '../enum/request-flow.enum';

export type RequestActivityDocument = RequestActivity & Document;
export type RequestDocumentDocument = RequestDocument & Document;
export type RequestDelegationDocument = RequestDelegation & Document;
export type RequestViewLogDocument = RequestViewLog & Document;
export type RequestTypeConfigDocument = RequestTypeConfig & Document;
export type RequestSettingsDocument = RequestSettings & Document;
export type RequestCounterDocument = RequestCounter & Document;

@Schema({ timestamps: true })
export class RequestActivity {
  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  requestId: string;

  @Prop({
    type: String,
    enum: Object.values(RequestActivityType),
    required: true,
  })
  type: RequestActivityType;

  @Prop({ type: String, default: null })
  actorUserId: string | null;

  @Prop({ type: String, default: null })
  actorName: string | null;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class RequestDocument {
  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  requestId: string;

  @Prop({ type: String, default: null })
  templateId: string | null;

  @Prop({ type: String, default: 'document' })
  type: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, default: null })
  publicId: string | null;

  @Prop({
    type: String,
    enum: Object.values(RequestDocumentStatus),
    default: RequestDocumentStatus.DRAFT,
  })
  status: RequestDocumentStatus;

  @Prop({ type: Boolean, default: false })
  isSigned: boolean;

  @Prop({ type: Boolean, default: false })
  isIssued: boolean;

  @Prop({ type: Date, default: null })
  signedAt: Date | null;

  @Prop({ type: Date, default: null })
  issuedAt: Date | null;

  @Prop({ type: Number, default: 1 })
  version: number;

  @Prop({ type: Object, default: null })
  signature: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  createdByUserId: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class RequestDelegation {
  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, required: true })
  fromUserId: string;

  @Prop({ type: String, required: true })
  toUserId: string;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  @Prop({ type: Date, required: true })
  endsAt: Date;

  @Prop({ type: String, default: null })
  reason: string | null;

  @Prop({
    type: String,
    enum: Object.values(RequestDelegationStatus),
    default: RequestDelegationStatus.ACTIVE,
  })
  status: RequestDelegationStatus;

  @Prop({ type: Boolean, default: false })
  autoOnLeave: boolean;

  @Prop({ type: String, default: null })
  createdByUserId: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class RequestViewLog {
  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  requestId: string;

  @Prop({ type: String, required: true })
  viewerUserId: string;

  @Prop({ type: String, default: null })
  viewerEmail: string | null;

  @Prop({ type: String, default: null })
  reason: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class RequestTypeConfig {
  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, default: 'general' })
  category: string;

  @Prop({ type: Boolean, default: true })
  enabled: boolean;

  @Prop({ type: Boolean, default: false })
  restricted: boolean;

  @Prop({ type: [String], enum: Object.values(SystemRole), default: [] })
  whoMayRaise: SystemRole[];

  @Prop({ type: String, default: null })
  formKey: string | null;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Boolean, default: false })
  attachmentsRequired: boolean;

  @Prop({ type: String, default: null })
  defaultWorkflowId: string | null;

  @Prop({ type: String, default: null })
  documentTemplateId: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

@Schema({ _id: false })
export class RequestReminderSettings {
  @Prop({ type: Number, default: 3 })
  slaWorkingDays: number;

  @Prop({ type: [Number], default: [1, 2] })
  remindersAfterDays: number[];

  @Prop({ type: Boolean, default: true })
  escalateToNextApprover: boolean;

  @Prop({ type: Boolean, default: true })
  notifyRequester: boolean;

  @Prop({ type: String, default: 'monday 08:00' })
  weeklyHrDigest: string;
}

@Schema({ _id: false })
export class RequestDelegationSettings {
  @Prop({ type: Boolean, default: true })
  allowDelegation: boolean;

  @Prop({ type: [String], enum: Object.values(SystemRole), default: [] })
  whoCanDelegate: SystemRole[];

  @Prop({ type: Number, default: 30 })
  maxDays: number;

  @Prop({ type: Boolean, default: false })
  autoDelegateOnLeave: boolean;

  @Prop({ type: Boolean, default: true })
  recordOnRequest: boolean;
}

@Schema({ _id: false })
export class RequestVisibilitySettings {
  @Prop({ type: String, default: 'raisers_approvers_hr' })
  restrictedVisibility: string;

  @Prop({ type: Boolean, default: true })
  hideFromDirectory: boolean;

  @Prop({ type: Boolean, default: true })
  logEveryView: boolean;

  @Prop({ type: Number, default: 7 })
  completedRetentionYears: number;

  @Prop({ type: Number, default: 12 })
  withdrawnRetentionMonths: number;

  @Prop({ type: Boolean, default: true })
  hrAdminOnlyExport: boolean;
}

@Schema({ _id: false })
export class RequestTemplateSettings {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, enum: Object.values(RequestType), required: true })
  requestType: RequestType;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  url: string | null;

  @Prop({ type: Boolean, default: false })
  signatureRequired: boolean;

  @Prop({ type: Boolean, default: true })
  storeIssuedDocs: boolean;
}

@Schema({ timestamps: true })
export class RequestSettings {
  @Prop({ type: String, required: true, unique: true })
  organizationId: string;

  @Prop({ type: RequestReminderSettings, default: {} })
  reminder: RequestReminderSettings;

  @Prop({ type: RequestDelegationSettings, default: {} })
  delegation: RequestDelegationSettings;

  @Prop({ type: RequestVisibilitySettings, default: {} })
  visibility: RequestVisibilitySettings;

  @Prop({ type: [RequestTemplateSettings], default: [] })
  templates: RequestTemplateSettings[];

  createdAt?: Date;
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class RequestCounter {
  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, default: 'RQ' })
  prefix: string;

  @Prop({ type: Number, default: 0 })
  sequence: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RequestActivitySchema =
  SchemaFactory.createForClass(RequestActivity);
RequestActivitySchema.index(
  { requestId: 1, createdAt: -1 },
  { name: 'request_activity_request_created_idx' },
);
RequestActivitySchema.index(
  { organizationId: 1, type: 1 },
  { name: 'request_activity_org_type_idx' },
);

export const RequestDocumentSchema =
  SchemaFactory.createForClass(RequestDocument);
RequestDocumentSchema.index(
  { requestId: 1, type: 1 },
  { name: 'request_document_request_type_idx' },
);

export const RequestDelegationSchema =
  SchemaFactory.createForClass(RequestDelegation);
RequestDelegationSchema.index(
  { organizationId: 1, fromUserId: 1, toUserId: 1, status: 1 },
  { name: 'request_delegation_lookup_idx' },
);

export const RequestViewLogSchema = SchemaFactory.createForClass(RequestViewLog);
RequestViewLogSchema.index(
  { organizationId: 1, requestId: 1, createdAt: -1 },
  { name: 'request_view_log_lookup_idx' },
);

export const RequestTypeConfigSchema =
  SchemaFactory.createForClass(RequestTypeConfig);
RequestTypeConfigSchema.index(
  { organizationId: 1, type: 1 },
  { name: 'request_type_config_org_type_idx', unique: true },
);

export const RequestSettingsSchema =
  SchemaFactory.createForClass(RequestSettings);

export const RequestCounterSchema = SchemaFactory.createForClass(RequestCounter);
RequestCounterSchema.index(
  { organizationId: 1, prefix: 1 },
  { name: 'request_counter_org_prefix_idx', unique: true },
);
