import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { LeaveRequestStatus } from '../enum/leave.enum';

export type LeaveRequestDocument = LeaveRequest & Document;

@Schema({ _id: false })
export class LeaveEmployeeSnapshot {
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
}

@Schema({ _id: false })
export class LeaveCategorySnapshot {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true })
  label: string;
}

@Schema({ _id: false })
export class LeaveReviewerSnapshot {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, default: null })
  name: string | null;
}

@Schema({ timestamps: true })
export class LeaveRequest {
  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true })
  employeeId: string;

  @Prop({ type: LeaveEmployeeSnapshot })
  employee: LeaveEmployeeSnapshot;

  @Prop({ type: String, required: true })
  leaveCategoryId: string;

  @Prop({ type: LeaveCategorySnapshot })
  leaveCategory: LeaveCategorySnapshot;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: Number, required: true, min: 0.5 })
  durationDays: number;

  @Prop({ type: String, default: null })
  reliefStaff: string | null;

  @Prop({ type: String, default: null })
  note: string | null;

  @Prop({ type: [String], default: [] })
  attachmentUrls: string[];

  @Prop({
    type: String,
    enum: Object.values(LeaveRequestStatus),
    default: LeaveRequestStatus.PENDING,
  })
  status: LeaveRequestStatus;

  @Prop({ type: Date, default: null })
  requestedAt: Date | null;

  @Prop({ type: LeaveReviewerSnapshot, default: null })
  reviewedBy: LeaveReviewerSnapshot | null;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;

  @Prop({ type: String, default: null })
  reviewComment: string | null;

  @Prop({ type: String, default: null })
  rejectionReason: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LeaveRequestSchema =
  SchemaFactory.createForClass(LeaveRequest);

LeaveRequestSchema.index(
  { organizationId: 1, createdAt: -1 },
  { name: 'leave_request_org_created_idx' },
);
LeaveRequestSchema.index(
  { organizationId: 1, status: 1 },
  { name: 'leave_request_org_status_idx' },
);
LeaveRequestSchema.index(
  { organizationId: 1, employeeId: 1 },
  { name: 'leave_request_org_employee_idx' },
);
LeaveRequestSchema.index(
  { organizationId: 1, leaveCategoryId: 1 },
  { name: 'leave_request_org_category_idx' },
);
LeaveRequestSchema.index(
  { organizationId: 1, startDate: 1, endDate: 1 },
  { name: 'leave_request_org_dates_idx' },
);
