import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { InvoiceStatus } from '../enum/organisation.enum';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ type: String, required: true })
  organizationId: string;

  @Prop({ type: String, trim: true, required: true })
  invoiceNumber: string;

  @Prop({ type: String, trim: true, default: null })
  billingDate: string | null;

  @Prop({
    type: String,
    enum: Object.values(InvoiceStatus),
    default: InvoiceStatus.PAID,
  })
  status: InvoiceStatus;

  @Prop({ type: Number, default: 0 })
  amount: number;

  @Prop({ type: String, trim: true, default: 'USD' })
  currency: string;

  @Prop({ type: String, trim: true, default: null })
  planName: string | null;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index(
  { organizationId: 1, billingDate: -1 },
  { name: 'invoice_org_billing_date_idx' },
);