import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CalibrationSession,
  CalibrationSessionDocument,
} from '../schemas/calibration-session.schema';
import {
  CalibrationModel,
  CalibrationSessionStatus,
} from '../enums/appraisal.enums';

export interface ListCalibrationSessionFilters {
  search?: string;
  cycleId?: string;
  status?: CalibrationSessionStatus;
  model?: CalibrationModel;
  departmentCode?: string;
  ownerId?: string;
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

  async create(
    data: Partial<CalibrationSession>,
  ): Promise<CalibrationSessionDocument> {
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

    const filter = this.buildFilter(filters, organizationId);
    const sort = this.buildSort(filters);

    const [items, total] = await Promise.all([
      this.sessionModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.sessionModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async findAll(
    filters: ListCalibrationSessionFilters,
    organizationId: string,
  ): Promise<CalibrationSessionDocument[]> {
    return await this.sessionModel
      .find(this.buildFilter(filters, organizationId))
      .sort(this.buildSort(filters))
      .exec();
  }

  async countByStatus(
    organizationId: string,
    cycleId?: string,
  ): Promise<Record<string, number>> {
    const rows = await this.sessionModel
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            organizationId,
            ...(cycleId && { cycleId }),
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});
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

  private buildFilter(
    filters: ListCalibrationSessionFilters,
    organizationId: string,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      organizationId,
      ...(filters.cycleId && { cycleId: filters.cycleId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.model && { calibrationModel: filters.model }),
      ...(filters.ownerId && { sessionOwnerId: filters.ownerId }),
    };

    if (filters.departmentCode) {
      filter.$and = [
        {
          $or: [
            { includeAllDepartments: true },
            { departmentCodes: filters.departmentCode },
            { departmentCode: filters.departmentCode },
          ],
        },
      ];
    }

    if (filters.search) {
      const regex = new RegExp(
        filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [{ name: regex }, { description: regex }];
    }

    return filter;
  }

  private buildSort(
    filters: ListCalibrationSessionFilters,
  ): Record<string, 1 | -1> {
    const sort: Record<string, 1 | -1> = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    return sort;
  }
}
