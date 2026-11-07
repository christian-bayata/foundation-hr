import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoalProgress, GoalProgressDocument } from '../entity/goal-progress.schema';

@Injectable()
export class GoalProgressRepository {
  constructor(
    @InjectModel(GoalProgress.name)
    private readonly goalProgressModel: Model<GoalProgressDocument>,
  ) {}

  async create(data: Partial<GoalProgress>): Promise<GoalProgressDocument> {
    try {
      return (await this.goalProgressModel.create(data)) as GoalProgressDocument;
    } catch (error) {
      throw error;
    }
  }

  async findByGoal(
    goalId: string,
    organizationId: string,
  ): Promise<GoalProgressDocument[]> {
    try {
      return await this.goalProgressModel
        .find({ goalId, organizationId })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw error;
    }
  }

  async upsertProgress(
    goalId: string,
    organizationId: string,
    data: Partial<GoalProgress>,
  ): Promise<GoalProgressDocument> {
    try {
      const existing = await this.goalProgressModel
        .findOne({ goalId, organizationId })
        .sort({ createdAt: -1 })
        .exec();

      if (existing) {
        return (await this.goalProgressModel
          .findByIdAndUpdate(existing._id, { $set: data }, { new: true })
          .exec()) as GoalProgressDocument;
      }

      return this.create({
        goalId,
        organizationId,
        progress: data.progress,
        note: data.note ?? null,
        attachments: data.attachments ?? [],
        createdBy: data.createdBy ?? null,
      });
    } catch (error) {
      throw error;
    }
  }
}
