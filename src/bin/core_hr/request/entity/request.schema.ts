import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RequestType } from '../../../generic/setting/request-management/enum/request-management.enum';
import {
  EmployeeRequestStatus,
  EmployeeRequestStepStatus,
} from '../enum/request.enum';
import {
  RequestDirection,
  RequestStepActionKind,
} from '../enum/request-flow.enum';

export type EmployeeRequestDocument = EmployeeRequest & Document;

@Schema({ _id: false })
export class RequestEmployeeSnapshot {
  @Prop({ type: String, required: true })
  employeeId: string;

  @Prop({ type: String, default: null })
  employeeUniqueId: string | null;

  @Prop({ type: String, required: true })
  employeeName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  @Prop({ type: String, default: null })
  jobTitle: string | null;

  @Prop({ type: String, default: null })
  departmentCode: string | null;

  @Prop({ type: String, default: null })
  department: string | null;

  @Prop({ type: String, default: null })
  lineManagerId: string | null;

  @Prop({ type: String, default: null })
  lineManager: string | null;

  @Prop({ type: Date, default: null })
  employmentDate: Date | null;
}

@Schema({ _id: false })
export class RequestCreatorSnapshot {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, default: null })
  employeeId: string | null;

  @Prop({ type: String, default: null })
  name: string | null;
}

@Schema({ _id: false })
export class RequestPartySnapshot {
  @Prop({ type: String, default: null })
  userId: string | null;

  @Prop({ type: String, default: null })
  employeeId: string | null;

  @Prop({ type: String, default: null })
  name: string | null;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  role: string | null;
}

@Schema({ _id: false })
export class RequestAttachmentSnapshot {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, default: null })
  publicId: string | null;

  @Prop({ type: String, default: null })
  name: string | null;

  @Prop({ type: String, default: null })
  mimeType: string | null;

  @Prop({ type: Number, default: 0 })
  size: number;

  @Prop({ type: String, default: 'general' })
  category: string;

  @Prop({ type: Boolean, default: false })
  required: boolean;

  @Prop({ type: String, default: null })
  uploadedByUserId: string | null;

  @Prop({ type: Date, default: null })
  uploadedAt: Date | null;
}

@Schema({ _id: false })
export class RequestWaitingOnSnapshot {
  @Prop({ type: String, default: null })
  userId: string | null;

  @Prop({ type: String, default: null })
  employeeId: string | null;

  @Prop({ type: String, default: null })
  name: string | null;

  @Prop({ type: String, default: null })
  role: string | null;

  @Prop({ type: String, default: null })
  stepId: string | null;

  @Prop({ type: Number, default: null })
  stepOrder: number | null;

  @Prop({ type: String, default: null })
  delegatedFromUserId: string | null;
}

@Schema({ _id: false })
export class RequestVisibilitySnapshot {
  @Prop({ type: Boolean, default: false })
  restricted: boolean;

  @Prop({ type: Boolean, default: false })
  hiddenFromDirectory: boolean;

  @Prop({ type: Boolean, default: false })
  logViews: boolean;

  @Prop({ type: Date, default: null })
  retentionUntil: Date | null;
}

@Schema({ _id: false })
export class RequestPipPlanSnapshot {
  @Prop({ type: String, default: 'active' })
  status: string;

  @Prop({ type: String, default: null })
  outcome: string | null;

  @Prop({ type: Date, default: null })
  reviewDate: Date | null;

  @Prop({ type: Date, default: null })
  closedAt: Date | null;

  @Prop({ type: Object, default: {} })
  objectives: Record<string, unknown>;
}

@Schema({ _id: false })
export class RequestStepSnapshot {
  @Prop({ type: String, required: true })
  stepId: string;

  @Prop({ type: Number, default: 1 })
  order: number;

  @Prop({ type: String, default: null })
  responsibleParty: string | null;

  @Prop({
    type: String,
    enum: Object.values(EmployeeRequestStepStatus),
    default: EmployeeRequestStepStatus.PENDING,
  })
  status: EmployeeRequestStepStatus;

  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: String, default: null })
  actedByUserId: string | null;

  @Prop({ type: String, default: null })
  actedByName: string | null;

  @Prop({ type: String, default: null })
  comment: string | null;

  @Prop({
    type: String,
    enum: Object.values(RequestStepActionKind),
    default: RequestStepActionKind.APPROVE,
  })
  action: RequestStepActionKind;

  @Prop({ type: String, default: null })
  assigneeUserId: string | null;

  @Prop({ type: String, default: null })
  assigneeRole: string | null;

  @Prop({ type: String, default: null })
  assigneeEmployeeId: string | null;

  @Prop({ type: String, default: null })
  delegatedFromUserId: string | null;

  @Prop({ type: Date, default: null })
  dueAt: Date | null;

  @Prop({ type: String, default: null })
  decisionReasonCode: string | null;

  @Prop({ type: String, default: null })
  decisionMessage: string | null;

  @Prop({ type: Date, default: null })
  queriedAt: Date | null;

  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ type: Date, default: null })
  verifiedAt: Date | null;

  @Prop({ type: Date, default: null })
  signedAt: Date | null;

  @Prop({ type: Date, default: null })
  escalatedAt: Date | null;
}

@Schema({ timestamps: true })
export class EmployeeRequest {
  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, enum: Object.values(RequestType), required: true })
  requestType: RequestType;

  @Prop({ type: String, default: null })
  workflowId: string | null;

  @Prop({ type: String, default: null })
  workflowName: string | null;

  @Prop({ type: String, required: true })
  employeeId: string;

  @Prop({ type: RequestEmployeeSnapshot })
  employee: RequestEmployeeSnapshot;

  @Prop({ type: RequestCreatorSnapshot })
  createdBy: RequestCreatorSnapshot;

  @Prop({ type: String, default: null })
  reason: string | null;

  @Prop({ type: Date, default: null })
  effectiveDate: Date | null;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ type: Object, default: {} })
  details: Record<string, unknown>;

  @Prop({ type: [String], default: [] })
  attachmentUrls: string[];

  @Prop({
    type: String,
    enum: Object.values(EmployeeRequestStatus),
    default: EmployeeRequestStatus.PENDING,
  })
  status: EmployeeRequestStatus;

  @Prop({ type: Number, default: 1 })
  currentStepOrder: number;

  @Prop({ type: [RequestStepSnapshot], default: [] })
  steps: RequestStepSnapshot[];

  @Prop({ type: Date, default: null })
  submittedAt: Date | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  @Prop({ type: String, default: null })
  cancellationReason: string | null;

  @Prop({ type: String, default: null })
  requestNumber: string | null;

  @Prop({
    type: String,
    enum: Object.values(RequestDirection),
    default: null,
  })
  direction: RequestDirection | null;

  @Prop({ type: Boolean, default: false })
  isDraft: boolean;

  @Prop({ type: Date, default: null })
  draftSavedAt: Date | null;

  @Prop({ type: Date, default: null })
  sentAt: Date | null;

  @Prop({ type: Date, default: null })
  raisedAt: Date | null;

  @Prop({ type: Date, default: null })
  dueAt: Date | null;

  @Prop({ type: Date, default: null })
  closedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastActivityAt: Date | null;

  @Prop({ type: Date, default: null })
  lastNudgedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastReminderAt: Date | null;

  @Prop({ type: Date, default: null })
  lastEscalatedAt: Date | null;

  @Prop({ type: Number, default: 0 })
  reminderCount: number;

  @Prop({ type: Number, default: 0 })
  escalationCount: number;

  @Prop({ type: Number, default: 0 })
  resendCount: number;

  @Prop({ type: RequestWaitingOnSnapshot, default: null })
  waitingOn: RequestWaitingOnSnapshot | null;

  @Prop({ type: RequestPartySnapshot, default: null })
  raisedBy: RequestPartySnapshot | null;

  @Prop({ type: RequestPartySnapshot, default: null })
  sentTo: RequestPartySnapshot | null;

  @Prop({ type: [RequestAttachmentSnapshot], default: [] })
  attachments: RequestAttachmentSnapshot[];

  @Prop({ type: [String], default: [] })
  documentIds: string[];

  @Prop({ type: RequestPipPlanSnapshot, default: null })
  pipPlan: RequestPipPlanSnapshot | null;

  @Prop({ type: RequestVisibilitySnapshot, default: null })
  visibility: RequestVisibilitySnapshot | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EmployeeRequestSchema =
  SchemaFactory.createForClass(EmployeeRequest);

EmployeeRequestSchema.index(
  { organizationId: 1, createdAt: -1 },
  { name: 'request_org_created_idx' },
);
EmployeeRequestSchema.index(
  { organizationId: 1, status: 1 },
  { name: 'request_org_status_idx' },
);
EmployeeRequestSchema.index(
  { organizationId: 1, employeeId: 1 },
  { name: 'request_org_employee_idx' },
);
EmployeeRequestSchema.index(
  { organizationId: 1, requestType: 1 },
  { name: 'request_org_type_idx' },
);
EmployeeRequestSchema.index(
  { organizationId: 1, requestNumber: 1 },
  {
    name: 'request_org_number_idx',
    unique: true,
    sparse: true,
    partialFilterExpression: { requestNumber: { $type: 'string' } },
  },
);
EmployeeRequestSchema.index(
  { organizationId: 1, direction: 1, status: 1 },
  { name: 'request_org_direction_status_idx' },
);
EmployeeRequestSchema.index(
  { organizationId: 1, 'waitingOn.userId': 1, status: 1 },
  { name: 'request_org_waiting_user_idx' },
);
EmployeeRequestSchema.index(
  { organizationId: 1, 'createdBy.userId': 1, status: 1 },
  { name: 'request_org_creator_status_idx' },
);
EmployeeRequestSchema.index(
  { organizationId: 1, sentAt: -1 },
  { name: 'request_org_sent_idx' },
);
EmployeeRequestSchema.index(
  { organizationId: 1, dueAt: 1 },
  { name: 'request_org_due_idx' },
);
EmployeeRequestSchema.index(
  { organizationId: 1, 'steps.assigneeUserId': 1, status: 1 },
  { name: 'request_org_step_assignee_idx' },
);
