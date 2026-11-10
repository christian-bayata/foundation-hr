import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AppraisalReview,
  AppraisalReviewDocument,
} from '../schemas/appraisal-review.schema';
import {
  AppraisalStage,
  AppraisalStageStatus,
} from '../enums/appraisal.enums';

@Injectable()
export class AppraisalReviewRepository {
  constructor(
    @InjectModel(AppraisalReview.name)
    private readonly reviewModel: Model<AppraisalReviewDocument>,
  ) {}

  async upsert(data: Partial<AppraisalReview>): Promise<AppraisalReviewDocument> {
    return (await this.reviewModel.findOneAndUpdate(
      {
        organizationId: data.organizationId,
        appraisalId: data.appraisalId,
        stage: data.stage,
      },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )) as AppraisalReviewDocument;
  }

  async upsertMany(data: Partial<AppraisalReview>[]): Promise<void> {
    await Promise.all(data.map((item) => this.upsert(item)));
  }

  async findByAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<AppraisalReviewDocument[]> {
    return await this.reviewModel
      .find({ organizationId, appraisalId })
      .exec();
  }

  async findByAppraisalStage(
    organizationId: string,
    appraisalId: string,
    stage: AppraisalStage,
  ): Promise<AppraisalReviewDocument | null> {
    return await this.reviewModel
      .findOne({ organizationId, appraisalId, stage })
      .exec();
  }

  async findByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<AppraisalReviewDocument[]> {
    return await this.reviewModel.find({ organizationId, cycleId }).exec();
  }

  async updateById(
    id: string,
    data: Partial<AppraisalReview>,
  ): Promise<AppraisalReviewDocument | null> {
    return await this.reviewModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async updateMany(
    where: Record<string, unknown>,
    data: Partial<AppraisalReview>,
  ): Promise<number> {
    const result = await this.reviewModel
      .updateMany(where, { $set: data })
      .exec();
    return result.modifiedCount;
  }

  async deleteByAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<number> {
    const result = await this.reviewModel
      .deleteMany({ organizationId, appraisalId })
      .exec();
    return result.deletedCount;
  }

  async countByCycleStageStatus(
    organizationId: string,
    cycleId: string,
    stage: AppraisalStage,
    status: AppraisalStageStatus,
  ): Promise<number> {
    return await this.reviewModel
      .countDocuments({ organizationId, cycleId, stage, status })
      .exec();
  }
}
