import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Model } from 'mongoose';
import {
  AppraisalBehavioural,
  AppraisalBehaviouralDocument,
} from '../schemas/appraisal-behavioural.schema';

@Injectable()
export class AppraisalBehaviouralRepository {
  constructor(
    @InjectModel(AppraisalBehavioural.name)
    private readonly behaviouralModel: Model<AppraisalBehaviouralDocument>,
  ) {}

  async upsertMany(
    data: Partial<AppraisalBehavioural>[],
  ): Promise<void> {
    if (data.length === 0) return;
    const operations: AnyBulkWriteOperation<AppraisalBehaviouralDocument>[] =
      data.map((item) => ({
        updateOne: {
          filter: {
            organizationId: item.organizationId,
            appraisalId: item.appraisalId,
            competencyId: item.competencyId,
          },
          update: { $set: item },
          upsert: true,
        },
      }));
    await this.behaviouralModel.bulkWrite(operations, { ordered: false });
  }

  async upsert(
    data: Partial<AppraisalBehavioural>,
  ): Promise<AppraisalBehaviouralDocument> {
    return (await this.behaviouralModel.findOneAndUpdate(
      {
        organizationId: data.organizationId,
        appraisalId: data.appraisalId,
        competencyId: data.competencyId,
      },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )) as AppraisalBehaviouralDocument;
  }

  async findByAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<AppraisalBehaviouralDocument[]> {
    return await this.behaviouralModel
      .find({ organizationId, appraisalId })
      .sort({ createdAt: 1 })
      .exec();
  }

  async deleteByAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<number> {
    const result = await this.behaviouralModel
      .deleteMany({ organizationId, appraisalId })
      .exec();
    return result.deletedCount;
  }
}
