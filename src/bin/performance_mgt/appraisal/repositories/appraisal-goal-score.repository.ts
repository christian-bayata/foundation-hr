import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Model } from 'mongoose';
import {
  AppraisalGoalScore,
  AppraisalGoalScoreDocument,
} from '../schemas/appraisal-goal-score.schema';

@Injectable()
export class AppraisalGoalScoreRepository {
  constructor(
    @InjectModel(AppraisalGoalScore.name)
    private readonly goalScoreModel: Model<AppraisalGoalScoreDocument>,
  ) {}

  async createMany(
    data: Partial<AppraisalGoalScore>[],
  ): Promise<AppraisalGoalScoreDocument[]> {
    if (data.length === 0) return [];
    return (await this.goalScoreModel.insertMany(data, {
      ordered: false,
    })) as AppraisalGoalScoreDocument[];
  }

  async upsertMany(
    data: Partial<AppraisalGoalScore>[],
  ): Promise<void> {
    if (data.length === 0) return;
    const operations: AnyBulkWriteOperation<AppraisalGoalScoreDocument>[] =
      data.map((item) => ({
        updateOne: {
          filter: {
            organizationId: item.organizationId,
            appraisalId: item.appraisalId,
            goalId: item.goalId,
          },
          update: { $set: item },
          upsert: true,
        },
      }));
    await this.goalScoreModel.bulkWrite(operations, { ordered: false });
  }

  async findByAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<AppraisalGoalScoreDocument[]> {
    return await this.goalScoreModel
      .find({ organizationId, appraisalId })
      .sort({ perspective: 1, createdAt: 1 })
      .exec();
  }

  async findByAppraisalIds(
    organizationId: string,
    appraisalIds: string[],
  ): Promise<AppraisalGoalScoreDocument[]> {
    if (appraisalIds.length === 0) return [];
    return await this.goalScoreModel
      .find({ organizationId, appraisalId: { $in: appraisalIds } })
      .exec();
  }

  async findOne(
    where: Record<string, unknown>,
  ): Promise<AppraisalGoalScoreDocument | null> {
    return await this.goalScoreModel.findOne(where).exec();
  }

  async updateById(
    id: string,
    data: Partial<AppraisalGoalScore>,
  ): Promise<AppraisalGoalScoreDocument | null> {
    return await this.goalScoreModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async updateMany(
    where: Record<string, unknown>,
    data: Partial<AppraisalGoalScore>,
  ): Promise<number> {
    const result = await this.goalScoreModel
      .updateMany(where, { $set: data })
      .exec();
    return result.modifiedCount;
  }

  async deleteByAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<number> {
    const result = await this.goalScoreModel
      .deleteMany({ organizationId, appraisalId })
      .exec();
    return result.deletedCount;
  }
}
