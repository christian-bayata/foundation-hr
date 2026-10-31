import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeaveBalanceDocument = LeaveBalance & Document;

@Schema({ timestamps: true })
export class LeaveBalance {
  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true })
  employeeId: string;

  @Prop({ type: String, required: true })
  leaveCategoryId: string;

  @Prop({ type: Number, required: true })
  year: number;

  @Prop({ type: Number, default: 0, min: 0 })
  entitledDays: number;

  @Prop({ type: Number, default: 0 })
  carriedOverDays: number;

  @Prop({ type: Number, default: 0 })
  adjustmentDays: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LeaveBalanceSchema =
  SchemaFactory.createForClass(LeaveBalance);

LeaveBalanceSchema.index(
  {
    organizationId: 1,
    employeeId: 1,
    leaveCategoryId: 1,
    year: 1,
  },
  { name: 'leave_balance_org_employee_category_year_idx', unique: true },
);
