import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AppraisalCycleStatus,
  AppraisalReviewType,
  AppraisalTargetPopulation,
} from '../enums/appraisal.enums';

export type AppraisalCycleDocument = AppraisalCycle & Document;

@Schema({ _id: false })
export class AppraisalRatingScaleEntry {
  @Prop({ type: String, required: true })
  tag: string;

  @Prop({ type: Number, required: true })
  minScore: number;

  @Prop({ type: Number, required: true })
  maxScore: number;
}

export const AppraisalRatingScaleEntrySchema = SchemaFactory.createForClass(
  AppraisalRatingScaleEntry,
);

@Schema({ timestamps: true })
export class AppraisalCycle {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 160 })
  name: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 60 })
  code: string;

  @Prop({ type: String, trim: true, default: null })
  description: string | null;

  @Prop({
    type: String,
    enum: Object.values(AppraisalReviewType),
    required: true,
  })
  reviewType: AppraisalReviewType;

  @Prop({ type: Number, required: true })
  performanceYear: number;

  @Prop({
    type: String,
    enum: Object.values(AppraisalCycleStatus),
    default: AppraisalCycleStatus.DRAFT,
    index: true,
  })
  status: AppraisalCycleStatus;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: Date, required: true })
  selfAssessmentDueDate: Date;

  @Prop({ type: Date, required: true })
  managerReviewDueDate: Date;

  @Prop({ type: Date, required: true })
  finalReviewDueDate: Date;

  @Prop({ type: Date, required: true })
  resultsPublicationDate: Date;

  @Prop({
    type: String,
    enum: Object.values(AppraisalTargetPopulation),
    default: AppraisalTargetPopulation.DEPARTMENTS,
  })
  targetPopulation: AppraisalTargetPopulation;

  @Prop({ type: Boolean, default: false })
  includeAllDepartments: boolean;

  @Prop({ type: [String], default: [] })
  departmentIds: string[];

  @Prop({ type: [String], default: [] })
  departmentCodes: string[];

  @Prop({ type: [String], default: [] })
  jobTitleCodes: string[];

  @Prop({ type: [String], default: [] })
  competencyFrameworkIds: string[];

  @Prop({ type: [String], default: [] })
  competencyFrameworkNames: string[];

  @Prop({ type: String, default: null })
  workflowTemplateId: string | null;

  @Prop({ type: String, default: null })
  workflowTemplateName: string | null;

  @Prop({ type: [AppraisalRatingScaleEntrySchema], default: [] })
  ratingScale: AppraisalRatingScaleEntry[];

  @Prop({ type: Number, default: 0, min: 0 })
  participantCount: number;

  @Prop({ type: Date, default: null })
  resultsPublishedAt: Date | null;

  @Prop({ type: Date, default: null })
  endedAt: Date | null;

  @Prop({ type: String, default: null })
  endedBy: string | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export const AppraisalCycleSchema =
  SchemaFactory.createForClass(AppraisalCycle);
AppraisalCycleSchema.index(
  { organizationId: 1, code: 1 },
  { name: 'appraisal_cycle_org_code_idx', unique: true },
);
AppraisalCycleSchema.index(
  { organizationId: 1, status: 1 },
  { name: 'appraisal_cycle_org_status_idx' },
);
AppraisalCycleSchema.index(
  { organizationId: 1, performanceYear: 1 },
  { name: 'appraisal_cycle_org_year_idx' },
);
