import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  FeedbackCycleStatus,
  FeedbackStage,
  FeedbackStatus,
  RespondentType,
} from '../enums/360-feedback.enums';

export type FeedbackCycleDocument = FeedbackCycle & Document;

@Schema({ _id: false })
export class FeedbackRatingScaleEntry {
  @Prop({ type: String, required: true })
  tag: string;

  @Prop({ type: Number, required: true })
  minScore: number;

  @Prop({ type: Number, required: true })
  maxScore: number;
}

export const FeedbackRatingScaleEntrySchema =
  SchemaFactory.createForClass(FeedbackRatingScaleEntry);

@Schema({ timestamps: true })
export class FeedbackCycle {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 160 })
  name: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 60 })
  code: string;

  @Prop({ type: String, trim: true, default: null })
  description: string | null;

  @Prop({ type: String, trim: true, default: null })
  businessUnit: string | null;

  @Prop({ type: String, trim: true, default: null })
  sessionOwner: string | null;

  @Prop({
    type: String,
    enum: Object.values(FeedbackCycleStatus),
    default: FeedbackCycleStatus.DRAFT,
    index: true,
  })
  status: FeedbackCycleStatus;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: Date, required: true })
  nominationDueDate: Date;

  @Prop({ type: Date, required: true })
  feedbackDueDate: Date;

  @Prop({ type: Date, required: true })
  resultsPublicationDate: Date;

  @Prop({
    type: String,
    enum: Object.values(RespondentType),
    default: RespondentType.SELF,
  })
  primaryRespondentType: RespondentType;

  @Prop({ type: [String], enum: Object.values(RespondentType), default: [RespondentType.SELF] })
  respondentTypes: RespondentType[];

  @Prop({ type: Number, default: 20, min: 0, max: 20 })
  maxNominations: number;

  @Prop({ type: [FeedbackRatingScaleEntrySchema], default: [] })
  ratingScale: FeedbackRatingScaleEntry[];

  @Prop({ type: [String], default: [] })
  departmentIds: string[];

  @Prop({ type: [String], default: [] })
  departmentCodes: string[];

  @Prop({ type: [String], default: [] })
  jobTitleCodes: string[];

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

export const FeedbackCycleSchema =
  SchemaFactory.createForClass(FeedbackCycle);
FeedbackCycleSchema.index(
  { organizationId: 1, code: 1 },
  { name: 'feedback_cycle_org_code_idx', unique: true },
);
FeedbackCycleSchema.index(
  { organizationId: 1, status: 1 },
  { name: 'feedback_cycle_org_status_idx' },
);

export type FeedbackDocument = Feedback & Document;

@Schema({ _id: false })
export class CompetencyRating {
  @Prop({ type: String, required: true })
  competencyId: string;

  @Prop({ type: String, required: true })
  competencyName: string;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  score: number;

  @Prop({ type: String, default: null })
  comment: string | null;
}

export const CompetencyRatingSchema =
  SchemaFactory.createForClass(CompetencyRating);

@Schema({ timestamps: true })
export class Feedback {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  cycleId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, required: true })
  subjectEmployeeId: string;

  @Prop({
    type: String,
    enum: Object.values(FeedbackStage),
    required: true,
  })
  stage: FeedbackStage;

  @Prop({
    type: String,
    enum: Object.values(RespondentType),
    required: true,
  })
  respondentType: RespondentType;

  @Prop({ type: String, required: true })
  respondentId: string;

  @Prop({
    type: String,
    enum: Object.values(FeedbackStatus),
    default: FeedbackStatus.NOT_STARTED,
    index: true,
  })
  status: FeedbackStatus;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  averageScore: number;

  @Prop({ type: [CompetencyRatingSchema], default: [] })
  competencyRatings: CompetencyRating[];

  @Prop({ type: [String], default: [] })
  commentIds: string[];

  @Prop({ type: Date, default: null })
  submittedAt: Date | null;

  @Prop({ type: Date, default: null })
  dueAt: Date | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
FeedbackSchema.index(
  { organizationId: 1, cycleId: 1, subjectEmployeeId: 1 },
  { name: 'feedback_org_cycle_subject_idx' },
);
FeedbackSchema.index(
  { organizationId: 1, cycleId: 1, respondentId: 1 },
  { name: 'feedback_org_cycle_respondent_idx' },
);

export type FeedbackCommentDocument = FeedbackComment & Document;

@Schema({ timestamps: true })
export class FeedbackComment {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  cycleId: string;

  @Prop({ type: String, required: true, index: true })
  subjectEmployeeId: string;

  @Prop({ type: String, required: true, index: true })
  feedbackId: string;

  @Prop({ type: String, required: true })
  authorId: string;

  @Prop({ type: String, required: true })
  authorName: string;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: Date, default: null })
  createdAt: Date;

  @Prop({ type: String, default: null })
  createdBy: string | null;
}

export const FeedbackCommentSchema =
  SchemaFactory.createForClass(FeedbackComment);
FeedbackCommentSchema.index(
  { organizationId: 1, feedbackId: 1 },
  { name: 'feedback_comment_org_feedback_idx' },
);
