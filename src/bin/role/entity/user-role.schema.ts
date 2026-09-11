import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserRoleDocument = UserRole & Document;

@Schema({ timestamps: true })
export class UserRole {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  roleId: Types.ObjectId;
}

export const UserRoleSchema = SchemaFactory.createForClass(UserRole);
UserRoleSchema.index(
  { userId: 1, organizationId: 1, roleId: 1 },
  { name: 'user_role_unique_idx', unique: true },
);
UserRoleSchema.index(
  { userId: 1, organizationId: 1 },
  { name: 'user_role_user_org_idx' },
);
UserRoleSchema.index(
  { roleId: 1, organizationId: 1 },
  { name: 'user_role_role_org_idx' },
);
