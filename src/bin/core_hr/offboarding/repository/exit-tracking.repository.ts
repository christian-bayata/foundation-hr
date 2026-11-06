import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ExitTracking,
  ExitTrackingDocument,
} from '../entity/exit-tracking.schema';

@Injectable()
export class ExitTrackingRepository {
  constructor(
    @InjectModel(ExitTracking.name)
    private readonly exitTrackingModel: Model<ExitTrackingDocument>,
  ) {}

  async create(
    data: Partial<ExitTracking>,
  ): Promise<ExitTrackingDocument> {
    return this.exitTrackingModel.create(data);
  }

  async findByRequestId(
    organizationId: string,
    requestId: string,
  ): Promise<ExitTrackingDocument | null> {
    return this.exitTrackingModel.findOne({ organizationId, requestId });
  }

  async findByRequestIds(
    organizationId: string,
    requestIds: string[],
  ): Promise<ExitTrackingDocument[]> {
    if (requestIds.length === 0) {
      return [];
    }

    return this.exitTrackingModel
      .find({ organizationId, requestId: { $in: requestIds } })
      .exec();
  }

  async findCompletedRequestIds(
    organizationId: string,
  ): Promise<string[]> {
    const records = await this.exitTrackingModel
      .find({ organizationId, completedAt: { $ne: null } })
      .select('requestId')
      .lean()
      .exec();

    return records.map((record) => record.requestId);
  }

  async upsertByRequestId(
    organizationId: string,
    requestId: string,
    data: Partial<ExitTracking> | Record<string, unknown>,
  ): Promise<ExitTrackingDocument> {
    return this.exitTrackingModel.findOneAndUpdate(
      { organizationId, requestId },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  async deleteByRequestId(
    organizationId: string,
    requestId: string,
  ): Promise<void> {
    await this.exitTrackingModel.deleteOne({ organizationId, requestId });
  }
}
