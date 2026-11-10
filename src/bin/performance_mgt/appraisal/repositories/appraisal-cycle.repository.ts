import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AppraisalCycle,
  AppraisalCycleDocument,
} from '../schemas/appraisal-cycle.schema';
import { AppraisalCycleStatus } from '../enums/appraisal.enums';

export interface ListAppraisalCyclesFilters {
  search?: string;
  status?: AppraisalCycleStatus;
  performanceYear?: number;
  batch?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface AppraisalCycleListResult {
  items: AppraisalCycleDocument[];
  total: number;
}

@Injectable()
export class AppraisalCycleRepository {
  constructor(
    @InjectModel(AppraisalCycle.name)
    private readonly cycleModel: Model<AppraisalCycleDocument>,
  ) {}

  async create(data: Partial<AppraisalCycle>): Promise<AppraisalCycleDocument> {
    return (await this.cycleModel.create(data)) as AppraisalCycleDocument;
  }

  async findOne(where: Record<string, unknown>): Promise<AppraisalCycleDocument | null> {
    return await this.cycleModel.findOne(where).exec();
  }

  async findById(
    id: string,
    organizationId?: string,
  ): Promise<AppraisalCycleDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return await this.cycleModel
      .findOne({ _id: id, ...(organizationId && { organizationId }) })
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<AppraisalCycle>,
  ): Promise<AppraisalCycleDocument | null> {
    return await this.cycleModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.cycleModel.findByIdAndDelete(id).exec();
  }

  async paginatedList(
    filters: ListAppraisalCyclesFilters,
    organizationId: string,
  ): Promise<AppraisalCycleListResult> {
    const { batch = 1, limit = 10 } = filters;
    const skip = (batch - 1) * limit;

    const filter: Record<string, unknown> = {
      organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.performanceYear && {
        performanceYear: filters.performanceYear,
      }),
    };

    if (filters.search) {
      const regex = new RegExp(
        filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [
        { name: regex },
        { code: regex },
        { description: regex },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const [items, total] = await Promise.all([
      this.cycleModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.cycleModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async findActiveByOrganization(
    organizationId: string,
  ): Promise<AppraisalCycleDocument | null> {
    return await this.cycleModel
      .findOne({ organizationId, status: AppraisalCycleStatus.ACTIVE })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByIds(ids: string[]): Promise<AppraisalCycleDocument[]> {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) return [];
    return await this.cycleModel.find({ _id: { $in: objectIds } }).exec();
  }
}
