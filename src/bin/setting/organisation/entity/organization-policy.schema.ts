import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrganizationPolicyDocument = OrganizationPolicy & Document;

@Schema({ timestamps: true })
export class OrganizationPolicy {
  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, trim: true, required: true })
  code: string;

  @Prop({ type: String, trim: true, required: true })
  name: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, default: null })
  publicId: string | null;

  @Prop({ type: String, trim: true, default: null })
  uploadedByUserId: string | null;

  @Prop({ type: String, trim: true, default: null })
  uploadedByEmail: string | null;
}

export const OrganizationPolicySchema =
  SchemaFactory.createForClass(OrganizationPolicy);
OrganizationPolicySchema.index(
  { organizationId: 1, createdAt: -1 },
  { name: 'organization_policy_org_created_at_idx' },
);