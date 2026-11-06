import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobTitleDocument = JobTitle & Document;

@Schema({ timestamps: true })
export class JobTitle {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 50 })
  code: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 120 })
  name: string;
}

export const JobTitleSchema = SchemaFactory.createForClass(JobTitle);
JobTitleSchema.index(
  { organizationId: 1, code: 1 },
  { name: 'job_title_org_code_idx', unique: true },
);
