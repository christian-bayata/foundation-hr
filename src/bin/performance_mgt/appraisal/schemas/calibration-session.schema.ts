import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  CalibrationModel,
  CalibrationPerformanceLevel,
  CalibrationSessionStatus,
} from '../enums/appraisal.enums';

export type CalibrationSessionDocument = CalibrationSession & Document;

@Schema({ _id: false })
export class CalibrationBandTarget {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: Number, required: true })
  minScore: number;

  @Prop({ type: Number, required: true })
  maxScore: number;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  targetPercent: number;

  @Prop({
    type: String,
    enum: Object.values(CalibrationPerformanceLevel),
    required: true,
  })
  performanceLevel: CalibrationPerformanceLevel;
}

export const CalibrationBandTargetSchema =
  SchemaFactory.createForClass(CalibrationBandTarget);

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
    enum: Object.values(CalibrationModel),
    default: CalibrationModel.RATING_DISTRIBUTION,
    index: true,
  })
  calibrationModel: CalibrationModel;

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

  @Prop({ type: [String], default: [] })
  departmentIds: string[];

  @Prop({ type: [String], default: [] })
  departmentCodes: string[];

  @Prop({ type: Boolean, default: true })
  includeAllDepartments: boolean;

  @Prop({ type: [CalibrationBandTargetSchema], default: [] })
  targetDistribution: CalibrationBandTarget[];

  @Prop({ type: Boolean, default: true })
  guidedDistributionEnabled: boolean;

  @Prop({ type: Number, default: 5, min: 0, max: 100 })
  tolerancePercent: number;

  @Prop({ type: Date, default: null })
  startsAt: Date | null;

  @Prop({ type: Date, default: null })
  endsAt: Date | null;

  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @Prop({ type: Number, default: 0, min: 0 })
  participantCount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  finalisedCount: number;

  @Prop({ type: Date, default: null })
  finalisedAt: Date | null;

  @Prop({ type: String, default: null })
  finalisedBy: string | null;

  @Prop({ type: Date, default: null })
  lockedAt: Date | null;

  @Prop({ type: String, default: null })
  lockedBy: string | null;

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
CalibrationSessionSchema.index(
  { organizationId: 1, cycleId: 1, departmentCode: 1 },
  { name: 'calibration_session_org_cycle_department_idx' },
);
