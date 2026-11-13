import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ParticipantAuditAction } from '../enums/appraisal.enums';

export type ParticipantAuditLogDocument = ParticipantAuditLog & Document;

@Schema({ timestamps: true })
export class ParticipantAuditLog {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  cycleId: string;

  @Prop({ type: String, required: true, index: true })
  appraisalId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({
    type: String,
    enum: Object.values(ParticipantAuditAction),
    required: true,
    index: true,
  })
  action: ParticipantAuditAction;

  @Prop({ type: String, default: null })
  stage: string | null;

  @Prop({ type: String, default: null })
  previousValue: string | null;

  @Prop({ type: String, default: null })
  newValue: string | null;

  @Prop({ type: String, default: null })
  justification: string | null;

  @Prop({ type: String, default: null })
  actorId: string | null;

  @Prop({ type: String, default: null })
  actorName: string | null;

  @Prop({ type: String, default: null })
  metadata: string | null;

  @Prop({ type: Date, default: null })
  createdAt: Date;

  @Prop({ type: String, default: null })
  createdBy: string | null;
}

export const ParticipantAuditLogSchema =
  SchemaFactory.createForClass(ParticipantAuditLog);
ParticipantAuditLogSchema.index(
  { organizationId: 1, appraisalId: 1, createdAt: -1 },
  { name: 'participant_audit_log_org_appraisal_created_idx' },
);
ParticipantAuditLogSchema.index(
  { organizationId: 1, employeeId: 1, createdAt: -1 },
  { name: 'participant_audit_log_org_employee_created_idx' },
);
