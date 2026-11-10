import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AppraisalComment,
  AppraisalCommentDocument,
} from '../schemas/appraisal-comment.schema';
import { AppraisalStage } from '../enums/appraisal.enums';

export interface ListAppraisalCommentsFilters {
  appraisalId: string;
  goalId?: string;
  perspective?: string;
  stage?: AppraisalStage;
}

@Injectable()
export class AppraisalCommentRepository {
  constructor(
    @InjectModel(AppraisalComment.name)
    private readonly commentModel: Model<AppraisalCommentDocument>,
  ) {}

  async create(
    data: Partial<AppraisalComment>,
  ): Promise<AppraisalCommentDocument> {
    return (await this.commentModel.create(data)) as AppraisalCommentDocument;
  }

  async findById(
    id: string,
    organizationId?: string,
  ): Promise<AppraisalCommentDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return await this.commentModel
      .findOne({ _id: id, ...(organizationId && { organizationId }) })
      .exec();
  }

  async list(
    organizationId: string,
    filters: ListAppraisalCommentsFilters,
  ): Promise<AppraisalCommentDocument[]> {
    return await this.commentModel
      .find({
        organizationId,
        appraisalId: filters.appraisalId,
        ...(filters.goalId && { goalId: filters.goalId }),
        ...(filters.perspective && { perspective: filters.perspective }),
        ...(filters.stage && { stage: filters.stage }),
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.commentModel.findByIdAndDelete(id).exec();
  }

  async deleteByAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<number> {
    const result = await this.commentModel
      .deleteMany({ organizationId, appraisalId })
      .exec();
    return result.deletedCount;
  }
}
