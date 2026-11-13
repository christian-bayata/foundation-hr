import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CalibrationSession, CalibrationSessionDocument } from '../schemas/calibration-session.schema';
import { CalibrationSessionStatus } from '../enums/appraisal.enums';

export interface ListCalibrationSessionFilters {
  search?: string;
  status?: CalibrationSessionStatus;
  batch?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface CalibrationSessionListResult {
  items: CalibrationSessionDocument[];
  total: number;
}

@Injectable()
export class CalibrationSessionRepository {
  constructor(
    @InjectModel(CalibrationSession.name)
    private readonly sessionModel: Model<CalibrationSessionDocument>,
  ) {}

  async create(data: Partial<CalibrationSession>): Promise<CalibrationSessionDocument> {
    return (await this.sessionModel.create(data)) as CalibrationSessionDocument;
  }

  async findOne(
    where: Record<string, unknown>,
  ): Promise<CalibrationSessionDocument | null> {
    return await this.sessionModel.findOne(where).exec();
  }

  async findById(
    id: string,
    organizationId?: string,
  ): Promise<CalibrationSessionDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return await this.sessionModel
      .findOne({ _id: id, ...(organizationId && { organizationId }) })
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<CalibrationSession>,
  ): Promise<CalibrationSessionDocument | null> {
    return await this.sessionModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.sessionModel.findByIdAndDelete(id).exec();
  }

  async paginatedList(
    filters: ListCalibrationSessionFilters,
    organizationId: string,
  ): Promise<CalibrationSessionListResult> {
    const { batch = 1, limit = 10 } = filters;
    const skip = (batch - 1) * limit;

    const filter: Record<string, unknown> = {
      organizationId,
      ...(filters.status && { status: filters.status }),
    };

    if (filters.search) {
      const regex = new RegExp(
        filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [{ name: regex }, { description: regex }];
    }

    const sort: Record<string, 1 | -1> = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const [items, total] = await Promise.all([
      this.sessionModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.sessionModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async findByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<CalibrationSessionDocument[]> {
    return await this.sessionModel
      .find({ organizationId, cycleId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async countByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<number> {
    return await this.sessionModel
      .countDocuments({ organizationId, cycleId })
      .exec();
  }

  async deleteByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<void> {
    await this.sessionModel.deleteMany({ organizationId, cycleId }).exec();
  }
}
