import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { InfoAccess } from '../../auth/enum/info-access.enum';
import { SystemRole } from '../../auth/enum/role.enum';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null, trim: true })
  description: string | null;

  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: Boolean, default: false })
  isSystemRole: boolean;

  @Prop({ type: String, enum: Object.values(SystemRole), default: null })
  parentSystemRole: SystemRole | null;

  @Prop({
    type: String,
    enum: Object.values(InfoAccess),
    default: InfoAccess.EVERYONE,
  })
  infoAccess: InfoAccess;

  @Prop({
    type: Map,
    of: {
      type: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
      },
    },
    default: {},
  })
  modulePermissions: Map<string, { view: boolean; edit: boolean }>;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
RoleSchema.index(
  { organizationId: 1, name: 1 },
  { name: 'role_org_name_idx', unique: true },
);
RoleSchema.index(
  { organizationId: 1, isSystemRole: 1 },
  { name: 'role_org_system_idx' },
);
