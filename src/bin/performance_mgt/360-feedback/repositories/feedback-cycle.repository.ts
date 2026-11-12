import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeedbackCycle, FeedbackCycleDocument } from '../schemas/360-feedback.schema';
import { FeedbackCycleStatus } from '../enums/360-feedback.enums';

export interface ListFeedbackCycleFilters {
  search?: string;
  status?: FeedbackCycleStatus;
  batch?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface FeedbackCycleListResult {
  items: FeedbackCycleDocument[];
  total: number;
}

@Injectable()
export class FeedbackCycleRepository {
  constructor(
    @InjectModel(FeedbackCycle.name)
    private readonly cycleModel: Model<FeedbackCycleDocument>,
  ) {}

  async create(data: Partial<FeedbackCycle>): Promise<FeedbackCycleDocument> {
    return (await this.cycleModel.create(data)) as FeedbackCycleDocument;
  }

  async findOne(
    where: Record<string, unknown>,
  ): Promise<FeedbackCycleDocument | null> {
    return await this.cycleModel.findOne(where).exec();
  }

  async findById(
    id: string,
    organizationId?: string,
  ): Promise<FeedbackCycleDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return await this.cycleModel
      .findOne({ _id: id, ...(organizationId && { organizationId }) })
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<FeedbackCycle>,
  ): Promise<FeedbackCycleDocument | null> {
    return await this.cycleModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.cycleModel.findByIdAndDelete(id).exec();
  }

  async paginatedList(
    filters: ListFeedbackCycleFilters,
    organizationId: string,
  ): Promise<FeedbackCycleListResult> {
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
      filter.$or = [
        { name: regex },
        { code: regex },
        { description: regex },
        { businessUnit: regex },
        { sessionOwner: regex },
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
  ): Promise<FeedbackCycleDocument | null> {
    return await this.cycleModel
      .findOne({ organizationId, status: FeedbackCycleStatus.ACTIVE })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByIds(ids: string[]): Promise<FeedbackCycleDocument[]> {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) return [];
    return await this.cycleModel.find({ _id: { $in: objectIds } }).exec();
  }
}
