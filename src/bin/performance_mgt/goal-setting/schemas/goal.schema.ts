import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  GoalFrequency,
  GoalLevel,
  GoalPerspective,
  GoalStatus,
  KpiType,
} from '../enums/goal.enums';

export type GoalDocument = Goal & Document;

@Schema({ timestamps: true })
export class Goal {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, default: null, index: true })
  level: GoalLevel | null;

  @Prop({ type: String, default: null, index: true })
  departmentId: string | null;

  @Prop({ type: String, default: null, index: true })
  employeeId: string | null;

  @Prop({
    type: String,
    enum: Object.values(GoalPerspective),
    default: null,
  })
  perspective: GoalPerspective | null;

  @Prop({ type: String, trim: true, required: true, maxlength: 160 })
  title: string;

  @Prop({ type: String, trim: true, default: null })
  description: string | null;

  @Prop({ type: String, trim: true, default: null })
  keyMeasures: string | null;

  @Prop({ type: String, default: null })
  kpiMetricId: string | null;

  @Prop({ type: String, trim: true, default: null })
  kpiMetric: string | null;

  @Prop({
    type: String,
    enum: Object.values(KpiType),
    default: null,
  })
  kpiType: KpiType | null;

  @Prop({ type: String, trim: true, required: true })
  target: string;

  @Prop({ type: String, trim: true, default: null })
  targetUnit: string | null;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  weightage: number;

  @Prop({
    type: String,
    enum: Object.values(GoalFrequency),
    required: true,
  })
  frequency: GoalFrequency;

  @Prop({ type: String, default: null, index: true })
  alignedOrganisationGoalId: string | null;

  @Prop({ type: String, default: null, index: true })
  alignedDepartmentGoalId: string | null;

  @Prop({
    type: String,
    enum: Object.values(GoalStatus),
    default: GoalStatus.ACTIVE,
  })
  status: GoalStatus;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: Date, default: null })
  progressUpdatedAt: Date | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export const GoalSchema = SchemaFactory.createForClass(Goal);
GoalSchema.index(
  { organizationId: 1, level: 1 },
  { name: 'goal_org_level_idx' },
);
GoalSchema.index(
  { organizationId: 1, level: 1, departmentId: 1 },
  { name: 'goal_org_level_dept_idx' },
);
GoalSchema.index(
  { organizationId: 1, level: 1, employeeId: 1 },
  { name: 'goal_org_level_employee_idx' },
);
