import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, FlattenMaps } from 'mongoose';
import { UserType } from '../enum/user.enum';
import {
  RefreshTokenEntry,
  ResetTokenData,
  VerificationTokenData,
} from '../interface/auth.interface';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: Boolean, default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, enum: Object.values(UserType), default: UserType.COMPANY })
  userType: UserType;

  @Prop({
    type: {
      tokenHash: { type: String },
      expiresAt: { type: Date },
    },
    default: null,
  })
  emailVerificationToken?: VerificationTokenData | null;

  @Prop({
    type: {
      tokenHash: { type: String },
      expiresAt: { type: Date },
    },
    default: null,
  })
  resetToken?: ResetTokenData | null;

  @Prop({
    type: [
      {
        tokenHash: { type: String },
        expiresAt: { type: Date },
        createdAt: { type: Date },
      },
    ],
    default: [],
  })
  refreshTokens: RefreshTokenEntry[];
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { name: 'user_email_idx', unique: true });
