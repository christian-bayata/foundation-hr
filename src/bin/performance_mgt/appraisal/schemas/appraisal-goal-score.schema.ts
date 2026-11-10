import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { KpiType } from '../../goal-setting/enums/goal.enums';
import { AppraisalPerspective } from '../enums/appraisal.enums';

export type AppraisalGoalScoreDocument = AppraisalGoalScore & Document;

@Schema({ timestamps: true })
export class AppraisalGoalScore {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  cycleId: string;

  @Prop({ type: String, required: true, index: true })
  appraisalId: string;

  @Prop({ type: String, required: true })
  goalId: string;

  @Prop({
    type: String,
    enum: Object.values(AppraisalPerspective),
    default: null,
  })
  perspective: AppraisalPerspective | null;

  @Prop({ type: String, trim: true, default: null })
  title: string | null;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  weightage: number;

  @Prop({ type: String, trim: true, default: null })
  target: string | null;

  @Prop({ type: Number, default: 0 })
  targetValue: number;

  @Prop({ type: String, trim: true, default: null })
  targetUnit: string | null;

  @Prop({
    type: String,
    enum: Object.values(KpiType),
    default: null,
  })
  kpiType: KpiType | null;

  @Prop({ type: String, trim: true, default: null })
  label: string | null;

  @Prop({ type: Number, default: null })
  employeeActual: number | null;

  @Prop({ type: Number, default: null })
  reviewerActual: number | null;

  @Prop({ type: Number, default: null })
  managerActual: number | null;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  employeeScore: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  reviewerScore: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  finalScore: number;

  @Prop({ type: Number, default: 0 })
  perspectiveWeightPlanned: number;

  @Prop({ type: Number, default: 0 })
  perspectiveWeightActual: number;

  @Prop({ type: String, default: null })
  employeeComment: string | null;

  @Prop({ type: String, default: null })
  reviewerComment: string | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export const AppraisalGoalScoreSchema =
  SchemaFactory.createForClass(AppraisalGoalScore);
AppraisalGoalScoreSchema.index(
  { organizationId: 1, appraisalId: 1, perspective: 1 },
  { name: 'appraisal_goal_score_org_appraisal_perspective_idx' },
);
AppraisalGoalScoreSchema.index(
  { organizationId: 1, appraisalId: 1, goalId: 1 },
  { name: 'appraisal_goal_score_org_appraisal_goal_idx', unique: true },
);
