import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppraisalStage } from '../enums/appraisal.enums';

export type AppraisalCommentDocument = AppraisalComment & Document;

@Schema({ timestamps: true })
export class AppraisalComment {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  cycleId: string;

  @Prop({ type: String, required: true, index: true })
  appraisalId: string;

  @Prop({ type: String, default: null, index: true })
  goalId: string | null;

  @Prop({ type: String, default: null })
  perspective: string | null;

  @Prop({
    type: String,
    enum: Object.values(AppraisalStage),
    default: null,
  })
  stage: AppraisalStage | null;

  @Prop({ type: String, required: true })
  authorId: string;

  @Prop({ type: String, trim: true, default: null })
  authorName: string | null;

  @Prop({ type: String, trim: true, default: null })
  authorEmail: string | null;

  @Prop({ type: String, trim: true, required: true, maxlength: 2000 })
  body: string;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;

  @Prop({ type: Date, default: null })
  createdAt: Date;

  @Prop({ type: Date, default: null })
  updatedAt: Date;
}

export const AppraisalCommentSchema =
  SchemaFactory.createForClass(AppraisalComment);
AppraisalCommentSchema.index(
  { organizationId: 1, appraisalId: 1, createdAt: -1 },
  { name: 'appraisal_comment_org_appraisal_created_idx' },
);
AppraisalCommentSchema.index(
  { organizationId: 1, appraisalId: 1, goalId: 1 },
  { name: 'appraisal_comment_org_appraisal_goal_idx' },
);
