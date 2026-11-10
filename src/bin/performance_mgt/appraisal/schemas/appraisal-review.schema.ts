import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AppraisalStage,
  AppraisalStageStatus,
} from '../enums/appraisal.enums';

export type AppraisalReviewDocument = AppraisalReview & Document;

@Schema({ timestamps: true })
export class AppraisalReview {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  cycleId: string;

  @Prop({ type: String, required: true, index: true })
  appraisalId: string;

  @Prop({
    type: String,
    enum: Object.values(AppraisalStage),
    required: true,
  })
  stage: AppraisalStage;

  @Prop({
    type: String,
    enum: Object.values(AppraisalStageStatus),
    default: AppraisalStageStatus.PENDING,
  })
  status: AppraisalStageStatus;

  @Prop({ type: String, default: null })
  reviewerId: string | null;

  @Prop({ type: String, default: null })
  reviewerName: string | null;

  @Prop({ type: String, default: null })
  reviewerEmail: string | null;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  score: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  rating: number;

  @Prop({ type: String, default: null })
  comment: string | null;

  @Prop({ type: Date, default: null })
  dueAt: Date | null;

  @Prop({ type: Date, default: null })
  submittedAt: Date | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export const AppraisalReviewSchema =
  SchemaFactory.createForClass(AppraisalReview);
AppraisalReviewSchema.index(
  { organizationId: 1, appraisalId: 1, stage: 1 },
  { name: 'appraisal_review_org_appraisal_stage_idx', unique: true },
);
