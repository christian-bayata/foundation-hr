import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  GoalPlanStatus,
  GoalPlanType,
  TargetPopulation,
} from '../enums/goal.enums';

export type GoalPlanDocument = GoalPlan & Document;

@Schema({ timestamps: true })
export class GoalPlan {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 160 })
  name: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 60 })
  code: string;

  @Prop({
    type: String,
    enum: Object.values(GoalPlanType),
    required: true,
  })
  goalType: GoalPlanType;

  @Prop({ type: Number, required: true })
  performanceYear: number;

  @Prop({ type: String, trim: true, default: null, maxlength: 1000 })
  description: string | null;

  @Prop({
    type: String,
    enum: Object.values(TargetPopulation),
    required: true,
  })
  targetPopulation: TargetPopulation;

  @Prop({ type: [String], default: [] })
  departmentIds: string[];

  @Prop({ type: [String], default: [] })
  framework: string[];

  @Prop({ type: String, trim: true, default: null })
  approvalWorkflow: string | null;

  @Prop({ type: String, default: null, index: true })
  linkedCycleId: string | null;

  @Prop({
    type: String,
    enum: Object.values(GoalPlanStatus),
    default: GoalPlanStatus.DRAFT,
  })
  status: GoalPlanStatus;

  @Prop({ type: Date, default: null })
  startDate: Date | null;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ type: [Object], default: [] })
  timelineStages: {
    key: string;
    label: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }[];

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export const GoalPlanSchema = SchemaFactory.createForClass(GoalPlan);
GoalPlanSchema.index(
  { organizationId: 1, linkedCycleId: 1 },
  { name: 'goal_plan_org_cycle_idx' },
);
GoalPlanSchema.index(
  { organizationId: 1, status: 1 },
  { name: 'goal_plan_org_status_idx' },
);
