import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { CalendarEvent, CalendarEventDocument } from '../entity/calendar-event.schema';

@Injectable()
export class CalendarEventRepository {
  constructor(
    @InjectModel(CalendarEvent.name)
    private readonly calendarEventModel: Model<CalendarEventDocument>,
  ) {}

  async create(data: Partial<CalendarEvent>): Promise<CalendarEventDocument> {
    return this.calendarEventModel.create(data);
  }

  async findById(
    organizationId: string,
    eventId: string,
  ): Promise<CalendarEventDocument | null> {
    if (!Types.ObjectId.isValid(eventId)) {
      return null;
    }

    return this.calendarEventModel.findOne({
      _id: eventId,
      organizationId,
    });
  }

  async updateById(
    eventId: string,
    data: Partial<CalendarEvent> | Record<string, unknown>,
  ): Promise<CalendarEventDocument | null> {
    return this.calendarEventModel.findByIdAndUpdate(
      eventId,
      { $set: data },
      { new: true },
    );
  }

  async deleteById(eventId: string): Promise<CalendarEventDocument | null> {
    return this.calendarEventModel.findByIdAndDelete(eventId).exec();
  }

  async paginatedQuery(
    where: QueryFilter<CalendarEventDocument>,
    sort: Record<string, 1 | -1>,
    page: number,
    pageSize: number,
  ): Promise<{ items: CalendarEventDocument[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.calendarEventModel
        .find(where)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.calendarEventModel.countDocuments(where).exec(),
    ]);

    return { items, total };
  }

  async findAll(
    where: QueryFilter<CalendarEventDocument>,
    sort: Record<string, 1 | -1>,
  ): Promise<CalendarEventDocument[]> {
    return this.calendarEventModel.find(where).sort(sort).exec();
  }
}
