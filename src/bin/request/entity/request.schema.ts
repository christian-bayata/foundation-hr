import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RequestType } from '../../setting/request-management/enum/request-management.enum';
import {
  EmployeeRequestStatus,
  EmployeeRequestStepStatus,
} from '../enum/request.enum';

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
}

@Schema({ timestamps: true })
export class EmployeeRequest {
  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, enum: Object.values(RequestType), required: true })
  requestType: RequestType;

  @Prop({ type: String, required: true })
  workflowId: string;

  @Prop({ type: String, required: true })
  workflowName: string;

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
