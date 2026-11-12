import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackDocument } from '../schemas/360-feedback.schema';
import { FeedbackStatus } from '../enums/360-feedback.enums';

export interface ListFeedbackFilters {
  cycleId?: string;
  subjectEmployeeId?: string;
  respondentId?: string;
  search?: string;
  status?: FeedbackStatus;
  batch?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface FeedbackListResult {
  items: FeedbackDocument[];
  total: number;
}

@Injectable()
export class FeedbackRepository {
  constructor(
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
  ) {}

  async create(data: Partial<Feedback>): Promise<FeedbackDocument> {
    return (await this.feedbackModel.create(data)) as FeedbackDocument;
  }

  async createMany(data: Partial<Feedback>[]): Promise<FeedbackDocument[]> {
    if (data.length === 0) return [];
    return (await this.feedbackModel.insertMany(data)) as FeedbackDocument[];
  }

  async findOne(
    where: Record<string, unknown>,
  ): Promise<FeedbackDocument | null> {
    return await this.feedbackModel.findOne(where).exec();
  }

  async findById(
    id: string,
    organizationId?: string,
  ): Promise<FeedbackDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return await this.feedbackModel
      .findOne({ _id: id, ...(organizationId && { organizationId }) })
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<Feedback>,
  ): Promise<FeedbackDocument | null> {
    return await this.feedbackModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.feedbackModel.findByIdAndDelete(id).exec();
  }

  async paginatedList(
    filters: ListFeedbackFilters,
    organizationId: string,
  ): Promise<FeedbackListResult> {
    const { batch = 1, limit = 10 } = filters;
    const skip = (batch - 1) * limit;

    const filter: Record<string, unknown> = {
      organizationId,
      ...(filters.cycleId && { cycleId: filters.cycleId }),
      ...(filters.subjectEmployeeId && {
        subjectEmployeeId: filters.subjectEmployeeId,
      }),
      ...(filters.respondentId && { respondentId: filters.respondentId }),
      ...(filters.status && { status: filters.status }),
    };

    if (filters.search) {
      const regex = new RegExp(
        filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [
        { subjectEmployeeId: regex },
        { respondentId: regex },
        { stage: regex },
        { respondentType: regex },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const [items, total] = await Promise.all([
      this.feedbackModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.feedbackModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async findByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<FeedbackDocument[]> {
    return await this.feedbackModel
      .find({ organizationId, cycleId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async countByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<number> {
    return await this.feedbackModel
      .countDocuments({ organizationId, cycleId })
      .exec();
  }

  async statusCounts(
    organizationId: string,
    cycleId: string,
  ): Promise<Record<string, number>> {
    const rows = await this.feedbackModel
      .aggregate([
        { $match: { organizationId, cycleId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row._id] = row.count;
    }
    return counts;
  }

  async averageScore(
    organizationId: string,
    cycleId: string,
  ): Promise<{ averageScore: number; highestScore: number; lowestScore: number }> {
    const rows = await this.feedbackModel
      .aggregate([
        { $match: { organizationId, cycleId } },
        {
          $group: {
            _id: null,
            averageScore: { $avg: '$averageScore' },
            highestScore: { $max: '$averageScore' },
            lowestScore: { $min: '$averageScore' },
          },
        },
      ])
      .exec();

    if (rows.length === 0) {
      return { averageScore: 0, highestScore: 0, lowestScore: 0 };
    }

    return {
      averageScore: Math.round((rows[0].averageScore ?? 0) * 100) / 100,
      highestScore: Math.round((rows[0].highestScore ?? 0) * 100) / 100,
      lowestScore: Math.round((rows[0].lowestScore ?? 0) * 100) / 100,
    };
  }

  async updateManyStatuses(
    organizationId: string,
    cycleId: string,
    statuses: FeedbackStatus[],
    newStatus: FeedbackStatus,
  ): Promise<void> {
    await this.feedbackModel
      .updateMany(
        { organizationId, cycleId, status: { $in: statuses } },
        { $set: { status: newStatus } },
      )
      .exec();
  }

  async deleteByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<void> {
    await this.feedbackModel.deleteMany({ organizationId, cycleId }).exec();
  }
}
