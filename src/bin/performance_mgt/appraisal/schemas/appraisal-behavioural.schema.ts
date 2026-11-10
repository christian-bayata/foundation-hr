import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppraisalBehaviouralDocument = AppraisalBehavioural & Document;

@Schema({ timestamps: true })
export class AppraisalBehavioural {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  cycleId: string;

  @Prop({ type: String, required: true, index: true })
  appraisalId: string;

  @Prop({ type: String, required: true })
  competencyId: string;

  @Prop({ type: String, trim: true, default: null })
  competencyName: string | null;

  @Prop({ type: String, trim: true, default: null })
  frameworkName: string | null;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  weight: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  selfRating: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  managerRating: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  finalRating: number;

  @Prop({ type: String, default: null })
  selfComment: string | null;

  @Prop({ type: String, default: null })
  managerComment: string | null;

  @Prop({ type: String, default: null })
  finalComment: string | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export const AppraisalBehaviouralSchema =
  SchemaFactory.createForClass(AppraisalBehavioural);
AppraisalBehaviouralSchema.index(
  { organizationId: 1, appraisalId: 1, competencyId: 1 },
  { name: 'appraisal_behavioural_org_appraisal_competency_idx', unique: true },
);
