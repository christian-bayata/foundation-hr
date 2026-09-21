import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from '../../auth/enum/product.enum';
import { BusinessType } from '../../setting/organisation/enum/organisation.enum';

export type OrganizationDocument = Organization & Document;

// @Schema({ _id: false })
// export class TaxDetails {
//   @Prop({ type: String, trim: true, default: null })
//   taxIdentificationNumber: string | null;

//   @Prop({ type: String, trim: true, default: null })
//   vatNumber: string | null;
// }

@Schema({ _id: true })
export class Location {
  @Prop({ type: String, trim: true, required: true })
  name: string;

  @Prop({ type: String, trim: true, required: true })
  address: string;

  @Prop({ type: String, trim: true, default: null })
  phoneNumber: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email: string | null;
}

@Schema({ _id: false })
export class BusinessDetails {
  // @Prop({ type: String, trim: true, default: null })
  // legalName: string | null;

  @Prop({
    type: String,
    enum: Object.values(BusinessType),
    default: null,
  })
  businessType: BusinessType | null;

  @Prop({ type: String, trim: true, default: null })
  industry: string | null;

  @Prop({ type: String, trim: true, default: null })
  incorporationDate: string | null;

  @Prop({ type: String, trim: true, default: null })
  currency: string | null;

  @Prop({ type: String, trim: true, default: null })
  companySize: string | null;

  @Prop({ type: String, default: null })
  tin: string | null;
}

@Schema({ _id: false })
export class Branding {
  @Prop({ type: String, default: null })
  logoUrl: string | null;

  @Prop({ type: String, default: null })
  navigationBackgroundColor: string | null;

  @Prop({ type: String, default: null })
  buttonColor: string | null;

  @Prop({ type: [String], default: [] })
  customDomains: string[];

  @Prop({ type: [String], default: [] })
  loginPageImages: string[];
}

@Schema({ timestamps: true })
export class Organization {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  size: string;

  @Prop({ type: String, required: true })
  country: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ type: [String], enum: Object.values(Product), default: [] })
  products: Product[];

  @Prop({ type: String, default: null })
  topInterest: string | null;

  @Prop({ type: Boolean, default: false })
  marketingOptIn: boolean;

  @Prop({ type: Date, default: null })
  termsAcceptedAt: Date | null;

  @Prop({ type: String, trim: true, default: null })
  registrationNumber: string | null;

  @Prop({ type: String, trim: true, default: null })
  website: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  primaryContactEmail: string | null;

  @Prop({ type: String, trim: true, default: null })
  phoneNumber: string | null;

  @Prop({ type: String, trim: true, default: null })
  timezone: string | null;

  @Prop({ type: String, trim: true, default: null })
  language: string | null;

  @Prop({ type: String, trim: true, default: null })
  fiscalYearStartDate: string | null;

  @Prop({ type: () => BusinessDetails, default: null })
  businessDetails: BusinessDetails | null;

  @Prop({ type: () => [Location], default: [] })
  locations: Location[];

  @Prop({ type: () => Branding, default: null })
  branding: Branding | null;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index(
  { owner: 1 },
  { name: 'organization_owner_idx', unique: true },
);
