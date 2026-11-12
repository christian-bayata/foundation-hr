import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeedbackComment, FeedbackCommentDocument } from '../schemas/360-feedback.schema';

export interface ListFeedbackCommentFilters {
  cycleId?: string;
  subjectEmployeeId?: string;
  feedbackId?: string;
  search?: string;
  batch?: number;
  limit?: number;
}

interface FeedbackCommentListResult {
  items: FeedbackCommentDocument[];
  total: number;
}

@Injectable()
export class FeedbackCommentRepository {
  constructor(
    @InjectModel(FeedbackComment.name)
    private readonly commentModel: Model<FeedbackCommentDocument>,
  ) {}

  async create(data: Partial<FeedbackComment>): Promise<FeedbackCommentDocument> {
    return (await this.commentModel.create(data)) as FeedbackCommentDocument;
  }

  async findOne(
    where: Record<string, unknown>,
  ): Promise<FeedbackCommentDocument | null> {
    return await this.commentModel.findOne(where).exec();
  }

  async findById(
    id: string,
    organizationId?: string,
  ): Promise<FeedbackCommentDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return await this.commentModel
      .findOne({ _id: id, ...(organizationId && { organizationId }) })
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<FeedbackComment>,
  ): Promise<FeedbackCommentDocument | null> {
    return await this.commentModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.commentModel.findByIdAndDelete(id).exec();
  }

  async paginatedList(
    filters: ListFeedbackCommentFilters,
    organizationId: string,
  ): Promise<FeedbackCommentListResult> {
    const { batch = 1, limit = 10 } = filters;
    const skip = (batch - 1) * limit;

    const filter: Record<string, unknown> = {
      organizationId,
      ...(filters.cycleId && { cycleId: filters.cycleId }),
      ...(filters.subjectEmployeeId && {
        subjectEmployeeId: filters.subjectEmployeeId,
      }),
      ...(filters.feedbackId && { feedbackId: filters.feedbackId }),
    };

    if (filters.search) {
      const regex = new RegExp(
        filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [
        { authorName: regex },
        { body: regex },
      ];
    }

    const [items, total] = await Promise.all([
      this.commentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.commentModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async findByFeedback(
    organizationId: string,
    feedbackId: string,
  ): Promise<FeedbackCommentDocument[]> {
    return await this.commentModel
      .find({ organizationId, feedbackId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async countByFeedback(
    organizationId: string,
    feedbackId: string,
  ): Promise<number> {
    return await this.commentModel
      .countDocuments({ organizationId, feedbackId })
      .exec();
  }

  async deleteByFeedback(
    organizationId: string,
    feedbackId: string,
  ): Promise<void> {
    await this.commentModel.deleteMany({ organizationId, feedbackId }).exec();
  }

  async deleteByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<void> {
    await this.commentModel.deleteMany({ organizationId, cycleId }).exec();
  }
}
