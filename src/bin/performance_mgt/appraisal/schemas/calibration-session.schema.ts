import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CalibrationSessionStatus } from '../enums/appraisal.enums';

export type CalibrationSessionDocument = CalibrationSession & Document;

@Schema({ timestamps: true })
export class CalibrationSession {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  cycleId: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 160 })
  name: string;

  @Prop({ type: String, trim: true, default: null })
  description: string | null;

  @Prop({
    type: String,
    enum: Object.values(CalibrationSessionStatus),
    default: CalibrationSessionStatus.DRAFT,
    index: true,
  })
  status: CalibrationSessionStatus;

  @Prop({ type: String, default: null })
  sessionOwnerId: string | null;

  @Prop({ type: String, default: null })
  sessionOwnerName: string | null;

  @Prop({ type: String, default: null })
  departmentCode: string | null;

  @Prop({ type: Date, default: null })
  startsAt: Date | null;

  @Prop({ type: Date, default: null })
  endsAt: Date | null;

  @Prop({ type: Number, default: 0, min: 0 })
  participantCount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  finalisedCount: number;

  @Prop({ type: Date, default: null })
  finalisedAt: Date | null;

  @Prop({ type: String, default: null })
  finalisedBy: string | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export const CalibrationSessionSchema =
  SchemaFactory.createForClass(CalibrationSession);
CalibrationSessionSchema.index(
  { organizationId: 1, cycleId: 1 },
  { name: 'calibration_session_org_cycle_idx' },
);
CalibrationSessionSchema.index(
  { organizationId: 1, status: 1 },
  { name: 'calibration_session_org_status_idx' },
);
