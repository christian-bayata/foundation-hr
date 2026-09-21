import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationDepartmentDocument = OrganizationDepartment & Document;

@Schema({ timestamps: true })
export class OrganizationDepartment {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 50 })
  code: string;

  @Prop({ type: String, trim: true, required: true, maxlength: 120 })
  name: string;

  @Prop({ type: String, default: null })
  headOfDepartmentId: string | null;

  @Prop({
    type: String,
    default: null,
  })
  parentDepartmentId: string | null;
}

export const OrganizationDepartmentSchema = SchemaFactory.createForClass(
  OrganizationDepartment,
);
OrganizationDepartmentSchema.index(
  { organizationId: 1, code: 1 },
  { name: 'organization_department_org_code_idx', unique: true },
);
