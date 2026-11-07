import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GoalProgressDocument = GoalProgress & Document;

@Schema({ timestamps: true })
export class GoalProgress {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  goalId: string;

  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  progress: number;

  @Prop({ type: String, trim: true, default: null })
  note: string | null;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: String, default: null })
  createdBy: string | null;
}

export const GoalProgressSchema = SchemaFactory.createForClass(GoalProgress);
GoalProgressSchema.index(
  { goalId: 1, organizationId: 1, createdAt: -1 },
  { name: 'goal_progress_goal_org_created_idx' },
);
