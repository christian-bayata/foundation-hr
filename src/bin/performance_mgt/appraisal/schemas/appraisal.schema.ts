import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AppraisalRatingTag,
  AppraisalStage,
  AppraisalStageStatus,
  AppraisalStatus,
} from '../enums/appraisal.enums';

export type AppraisalDocument = Appraisal & Document;

@Schema({ _id: false })
export class AppraisalSkipInfo {
  @Prop({ type: String, default: null })
  reason: string | null;

  @Prop({ type: String, default: null })
  skippedBy: string | null;

  @Prop({ type: Date, default: null })
  skippedAt: Date | null;
}

export const AppraisalSkipInfoSchema =
  SchemaFactory.createForClass(AppraisalSkipInfo);

@Schema({ _id: false })
export class AppraisalRerouteInfo {
  @Prop({ type: String, default: null })
  fromManagerId: string | null;

  @Prop({ type: String, default: null })
  toManagerId: string | null;

  @Prop({ type: String, default: null })
  reason: string | null;

  @Prop({ type: String, default: null })
  reroutedBy: string | null;

  @Prop({ type: Date, default: null })
  reroutedAt: Date | null;
}

export const AppraisalRerouteInfoSchema =
  SchemaFactory.createForClass(AppraisalRerouteInfo);

@Schema({ _id: false })
export class AppraisalResetEntry {
  @Prop({ type: [String], enum: Object.values(AppraisalStage), default: [] })
  stages: AppraisalStage[];

  @Prop({ type: String, default: null })
  reason: string | null;

  @Prop({ type: String, default: null })
  resetBy: string | null;

  @Prop({ type: Date, default: null })
  resetAt: Date | null;
}

export const AppraisalResetEntrySchema =
  SchemaFactory.createForClass(AppraisalResetEntry);

@Schema({ timestamps: true })
export class Appraisal {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  cycleId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, default: null })
  employeeCode: string | null;

  @Prop({ type: String, trim: true, default: null })
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

  @Prop({
    type: String,
    enum: Object.values(AppraisalStatus),
    default: AppraisalStatus.NOT_STARTED,
    index: true,
  })
  status: AppraisalStatus;

  @Prop({
    type: String,
    enum: Object.values(AppraisalStageStatus),
    default: AppraisalStageStatus.PENDING,
  })
  selfAssessmentStatus: AppraisalStageStatus;

  @Prop({
    type: String,
    enum: Object.values(AppraisalStageStatus),
    default: AppraisalStageStatus.PENDING,
  })
  managerReviewStatus: AppraisalStageStatus;

  @Prop({
    type: String,
    enum: Object.values(AppraisalStageStatus),
    default: AppraisalStageStatus.PENDING,
  })
  finalReviewStatus: AppraisalStageStatus;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  performanceScore: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  selfScore: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  managerScore: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  finalScore: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  totalWeightage: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  managerRating: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  calibratedRating: number;

  @Prop({
    type: String,
    enum: Object.values(AppraisalRatingTag),
    default: null,
  })
  ratingTag: AppraisalRatingTag | null;

  @Prop({ type: AppraisalSkipInfoSchema, default: null })
  skip: AppraisalSkipInfo | null;

  @Prop({ type: AppraisalRerouteInfoSchema, default: null })
  reroute: AppraisalRerouteInfo | null;

  @Prop({ type: [AppraisalResetEntrySchema], default: [] })
  resetHistory: AppraisalResetEntry[];

  @Prop({ type: String, default: null })
  selfAssessmentComment: string | null;

  @Prop({ type: String, default: null })
  managerReviewComment: string | null;

  @Prop({ type: String, default: null })
  finalReviewComment: string | null;

  @Prop({ type: Date, default: null })
  selfAssessmentSubmittedAt: Date | null;

  @Prop({ type: Date, default: null })
  managerReviewSubmittedAt: Date | null;

  @Prop({ type: Date, default: null })
  finalReviewSubmittedAt: Date | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export const AppraisalSchema = SchemaFactory.createForClass(Appraisal);
AppraisalSchema.index(
  { organizationId: 1, cycleId: 1, employeeId: 1 },
  { name: 'appraisal_org_cycle_employee_idx', unique: true },
);
AppraisalSchema.index(
  { organizationId: 1, cycleId: 1, status: 1 },
  { name: 'appraisal_org_cycle_status_idx' },
);
AppraisalSchema.index(
  { organizationId: 1, cycleId: 1, departmentCode: 1 },
  { name: 'appraisal_org_cycle_department_idx' },
);
AppraisalSchema.index(
  { organizationId: 1, employeeId: 1, createdAt: -1 },
  { name: 'appraisal_org_employee_created_idx' },
);
