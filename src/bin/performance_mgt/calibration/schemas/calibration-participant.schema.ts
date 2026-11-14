import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AppraisalRatingTag,
  CalibrationParticipantStatus,
  CalibrationPerformanceLevel,
  CalibrationPotential,
} from '../../appraisal/enums/appraisal.enums';

export type CalibrationParticipantDocument = CalibrationParticipant & Document;

@Schema({ timestamps: true })
export class CalibrationParticipant {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  cycleId: string;

  @Prop({ type: String, required: true, index: true })
  sessionId: string;

  @Prop({ type: String, required: true, index: true })
  appraisalId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, default: null })
  employeeCode: string | null;

  @Prop({ type: String, default: null })
  employeeName: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  employeeEmail: string | null;

  @Prop({ type: String, default: null })
  jobTitleCode: string | null;

  @Prop({ type: String, default: null })
  jobTitleName: string | null;

  @Prop({ type: String, default: null })
  departmentId: string | null;

  @Prop({ type: String, default: null })
  departmentCode: string | null;

  @Prop({ type: String, default: null })
  departmentName: string | null;

  @Prop({ type: String, default: null })
  managerId: string | null;

  @Prop({ type: String, default: null })
  managerName: string | null;

  @Prop({ type: String, default: null })
  managerEmail: string | null;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  baseScore: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  managerRating: number;

  @Prop({
    type: String,
    enum: Object.values(AppraisalRatingTag),
    default: null,
  })
  managerRatingTag: AppraisalRatingTag | null;

  @Prop({ type: String, default: null })
  managerBand: string | null;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  calibratedRating: number;

  @Prop({ type: String, default: null })
  calibratedBand: string | null;

  @Prop({
    type: String,
    enum: Object.values(CalibrationPerformanceLevel),
    default: null,
  })
  performanceLevel: CalibrationPerformanceLevel | null;

  @Prop({
    type: String,
    enum: Object.values(CalibrationPotential),
    default: null,
  })
  potential: CalibrationPotential | null;

  @Prop({ type: String, default: null })
  boxKey: string | null;

  @Prop({ type: String, default: null })
  previousBoxKey: string | null;

  @Prop({ type: Date, default: null })
  timeInBoxSince: Date | null;

  @Prop({ type: Boolean, default: false })
  movedThisSession: boolean;

  @Prop({ type: String, default: null })
  potentialSetBy: string | null;

  @Prop({ type: String, default: null })
  potentialSetByName: string | null;

  @Prop({ type: Date, default: null })
  potentialSetAt: Date | null;

  @Prop({ type: String, default: null })
  justification: string | null;

  @Prop({ type: Boolean, default: false })
  justificationRequired: boolean;

  @Prop({ type: Boolean, default: false })
  isAdjusted: boolean;

  @Prop({
    type: String,
    enum: Object.values(CalibrationParticipantStatus),
    default: CalibrationParticipantStatus.PENDING,
    index: true,
  })
  status: CalibrationParticipantStatus;

  @Prop({ type: Date, default: null })
  finalisedAt: Date | null;

  @Prop({ type: String, default: null })
  finalisedBy: string | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export const CalibrationParticipantSchema =
  SchemaFactory.createForClass(CalibrationParticipant);
CalibrationParticipantSchema.index(
  { organizationId: 1, sessionId: 1, appraisalId: 1 },
  { name: 'calibration_participant_org_session_appraisal_idx', unique: true },
);
CalibrationParticipantSchema.index(
  { organizationId: 1, sessionId: 1, departmentCode: 1 },
  { name: 'calibration_participant_org_session_department_idx' },
);
CalibrationParticipantSchema.index(
  { organizationId: 1, sessionId: 1, calibratedBand: 1 },
  { name: 'calibration_participant_org_session_band_idx' },
);
CalibrationParticipantSchema.index(
  { organizationId: 1, sessionId: 1, boxKey: 1 },
  { name: 'calibration_participant_org_session_box_idx' },
);
CalibrationParticipantSchema.index(
  { organizationId: 1, sessionId: 1, justificationRequired: 1 },
  { name: 'calibration_participant_org_session_justification_idx' },
);
