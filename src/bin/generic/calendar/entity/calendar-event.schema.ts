import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CalendarEventCategory } from '../enum/calendar.enum';

export type CalendarEventDocument = CalendarEvent & Document;

@Schema({ timestamps: true })
export class CalendarEvent {
  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true, default: null })
  description: string | null;

  @Prop({ type: Date, required: true, index: true })
  startDateTime: Date;

  @Prop({ type: Date, required: true, index: true })
  endDateTime: Date;

  @Prop({ type: Boolean, default: false })
  allDay: boolean;

  @Prop({ type: String, trim: true, default: null })
  location: string | null;

  @Prop({
    type: String,
    enum: Object.values(CalendarEventCategory),
    default: CalendarEventCategory.OTHER,
  })
  category: CalendarEventCategory;

  @Prop({ type: String, trim: true, default: null })
  color: string | null;

  @Prop({
    type: [
      {
        isHost: { type: Boolean, required: true },
        inviteeId: { type: String, required: true },
      },
    ],
    default: [],
  })
  invitees: { isHost: boolean; inviteeId: string }[];

  @Prop({ type: String, required: true })
  createdByUserId: string;

  @Prop({ type: String, required: true })
  createdByEmail: string;

  @Prop({ type: String, default: null })
  createdByName: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CalendarEventSchema =
  SchemaFactory.createForClass(CalendarEvent);

CalendarEventSchema.index(
  { organizationId: 1, startDateTime: 1, endDateTime: 1 },
  { name: 'calendar_event_org_start_end_idx' },
);
CalendarEventSchema.index(
  { organizationId: 1, category: 1 },
  { name: 'calendar_event_org_category_idx' },
);
