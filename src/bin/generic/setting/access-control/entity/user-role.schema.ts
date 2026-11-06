import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AdminStatus } from '../enum/admin-status.enum';

export type UserRoleDocument = UserRole & Document;

@Schema({ timestamps: true })
export class UserRole {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  roleId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(AdminStatus),
    default: AdminStatus.CREATED,
  })
  status: AdminStatus;

  @Prop({ type: String, default: null })
  addedById: string | null;

  @Prop({ type: String, default: null })
  jobTitleCode: string | null;

  @Prop({ type: Boolean, default: false })
  isBillingContact: boolean;

  @Prop({ type: Boolean, default: false })
  isAuthorizedRepresentative: boolean;

  /**
   * Gates the whole organization settings area for this admin. Defaults to true so
   * assignments created before this field existed keep the access they always had;
   * an absent value is read as true rather than locked out.
   */
  @Prop({ type: Boolean, default: true })
  systemSettings: boolean;

  @Prop({ type: Date, default: null })
  activatedAt: Date | null;
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
UserRoleSchema.index(
  { organizationId: 1, status: 1 },
  { name: 'user_role_org_status_idx' },
);
UserRoleSchema.index(
  { organizationId: 1, addedById: 1 },
  { name: 'user_role_org_added_by_idx' },
);
UserRoleSchema.index(
  { organizationId: 1, jobTitleCode: 1 },
  { name: 'user_role_org_job_title_idx' },
);
