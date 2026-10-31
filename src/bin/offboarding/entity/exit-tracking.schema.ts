import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ExitTrackingDocument = ExitTracking & Document;

@Schema({ _id: false })
export class ExitTypeSnapshot {
  @Prop({ type: String, default: null })
  id: string | null;

  @Prop({ type: String, required: true })
  label: string;
}

@Schema({ _id: false })
export class ExitChecklistProgress {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Boolean, default: false })
  completed: boolean;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: String, default: null })
  completedByUserId: string | null;

  @Prop({ type: String, default: null })
  completedByName: string | null;
}

@Schema({ _id: false })
export class ExitDocumentProgress {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  url: string | null;

  @Prop({ type: String, default: null })
  fileType: string | null;

  @Prop({ type: Boolean, default: false })
  requiresSignature: boolean;

  @Prop({ type: Boolean, default: false })
  completed: boolean;

  @Prop({ type: String, default: null })
  attachmentUrl: string | null;

  @Prop({ type: Boolean, default: false })
  signed: boolean;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

@Schema({ timestamps: true })
export class ExitTracking {
  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true })
  requestId: string;

  @Prop({ type: String, required: true })
  employeeId: string;

  @Prop({ type: ExitTypeSnapshot, default: null })
  exitType: ExitTypeSnapshot | null;

  @Prop({ type: ExitTypeSnapshot, default: null })
  exitReason: ExitTypeSnapshot | null;

  @Prop({ type: [ExitChecklistProgress], default: [] })
  exitChecklist: ExitChecklistProgress[];

  @Prop({ type: [ExitChecklistProgress], default: [] })
  complianceChecklist: ExitChecklistProgress[];

  @Prop({ type: [ExitDocumentProgress], default: [] })
  employerDocuments: ExitDocumentProgress[];

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: String, default: null })
  completedByUserId: string | null;

  @Prop({ type: String, default: null })
  completedByName: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ExitTrackingSchema =
  SchemaFactory.createForClass(ExitTracking);

ExitTrackingSchema.index(
  { organizationId: 1, requestId: 1 },
  { name: 'exit_tracking_org_request_idx', unique: true },
);
ExitTrackingSchema.index(
  { organizationId: 1, employeeId: 1 },
  { name: 'exit_tracking_org_employee_idx' },
);
ExitTrackingSchema.index(
  { organizationId: 1, completedAt: 1 },
  { name: 'exit_tracking_org_completed_idx' },
);
