import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GoalPlan, GoalPlanDocument } from '../entity/goal-plan.schema';

@Injectable()
export class GoalPlanRepository {
  constructor(
    @InjectModel(GoalPlan.name)
    private readonly goalPlanModel: Model<GoalPlanDocument>,
  ) {}

  async create(data: Partial<GoalPlan>): Promise<GoalPlanDocument> {
    try {
      return (await this.goalPlanModel.create(data)) as GoalPlanDocument;
    } catch (error) {
      throw error;
    }
  }

  async findOne(
    where: Record<string, unknown>,
  ): Promise<GoalPlanDocument | null> {
    try {
      return await this.goalPlanModel.findOne(where).exec();
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string): Promise<GoalPlanDocument | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
      return await this.goalPlanModel.findById(id).exec();
    } catch (error) {
      throw error;
    }
  }

  async updateById(
    id: string,
    data: Partial<GoalPlan>,
  ): Promise<GoalPlanDocument | null> {
    try {
      return await this.goalPlanModel
        .findByIdAndUpdate(id, { $set: data }, { new: true })
        .exec();
    } catch (error) {
      throw error;
    }
  }

  async list(
    organizationId: string,
    filters: Record<string, unknown>,
  ): Promise<GoalPlanDocument[]> {
    try {
      return await this.goalPlanModel
        .find({ organizationId, ...filters })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw error;
    }
  }
}
