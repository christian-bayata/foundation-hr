import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  ContractDuration,
  Department,
  EmployeeStatus,
  EmployeeType,
  JobType,
  WorkMode,
} from '../enum/employee.enum';

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true })
export class Employee {
  @Prop({
    type: String,
    enum: Object.values(EmployeeType),
    required: true,
  })
  employeeType: EmployeeType;

  @Prop({ type: String, required: true, trim: true })
  firstName: string;

  @Prop({ type: String, required: true, trim: true })
  lastName: string;

  @Prop({ type: String, trim: true, default: null })
  middleName: string | null;

  @Prop({ type: String, required: true, trim: true })
  employeeId: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ type: Date, required: true })
  employmentDate: Date;

  @Prop({
    type: String,
    enum: Object.values(ContractDuration),
    default: null,
  })
  contractDuration: ContractDuration | null;

  @Prop({ type: String, enum: Object.values(JobType), default: null })
  jobType: JobType | null;

  @Prop({ type: String, enum: Object.values(WorkMode), default: null })
  workMode: WorkMode | null;

  @Prop({ type: String, default: null })
  probationPeriod: string | null;

  @Prop({ type: String, enum: Object.values(Department), default: null })
  department: Department | null;

  @Prop({ type: String, default: null })
  jobTitle: string | null;

  @Prop({ type: String, default: null })
  supervisor: string | null;

  @Prop({ type: String, default: null })
  location: string | null;

  @Prop({ type: Number, default: null })
  salary: number | null;

  @Prop({ type: String, trim: true, default: 'NGN' })
  salaryCurrency: string;

  @Prop({
    type: String,
    enum: Object.values(EmployeeStatus),
    default: EmployeeStatus.DRAFT,
  })
  status: EmployeeStatus;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  @Prop({ type: String, default: null })
  organizationId: string | null;

  @Prop({ type: String, default: null })
  userId: string | null;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.index({ email: 1 }, { name: 'employee_email_idx', unique: true });
EmployeeSchema.index(
  { employeeId: 1 },
  { name: 'employee_employee_id_idx', unique: true },
);
EmployeeSchema.index(
  { organizationId: 1 },
  { name: 'employee_organization_idx' },
);
EmployeeSchema.index(
  { userId: 1 },
  { name: 'employee_user_idx' },
);
