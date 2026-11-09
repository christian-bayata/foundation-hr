import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Goal, GoalDocument } from '../schemas/goal.schema';
import { ListGoalsQueryDto } from '../dto/list-goals-query.dto';
import { GoalLevel } from '../enums/goal.enums';
import { PropDataInput } from '../../../../common/util/util.interface';

interface GoalListResult {
  items: GoalDocument[];
  total: number;
}

@Injectable()
export class GoalRepository {
  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,
  ) {}

  async create(data: Partial<Goal>): Promise<GoalDocument> {
    try {
      return (await this.goalModel.create(data)) as GoalDocument;
    } catch (error) {
      throw error;
    }
  }

  async findOne(where: Record<string, unknown>): Promise<GoalDocument | null> {
    try {
      return await this.goalModel.findOne(where).exec();
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string): Promise<GoalDocument | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
      return await this.goalModel.findById(id).exec();
    } catch (error) {
      throw error;
    }
  }

  async updateById(
    id: string,
    data: Partial<Goal>,
  ): Promise<GoalDocument | null> {
    try {
      return await this.goalModel
        .findByIdAndUpdate(id, { $set: data }, { new: true })
        .exec();
    } catch (error) {
      throw error;
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.goalModel.findByIdAndDelete(id).exec();
    } catch (error) {
      throw error;
    }
  }

  async countAlignedGoals(
    organizationId: string,
    goalId: string,
  ): Promise<number> {
    try {
      return await this.goalModel
        .countDocuments({
          organizationId,
          $or: [
            { alignedOrganisationGoalId: goalId },
            { alignedDepartmentGoalId: goalId },
          ],
        })
        .exec();
    } catch (error) {
      throw error;
    }
  }

  async paginatedList(
    dto: ListGoalsQueryDto,
    organizationId: string,
    level?: GoalLevel,
    departmentId?: string,
    employeeId?: string,
  ): Promise<GoalListResult> {
    try {
      const { batch = 1, limit = 10 } = dto;
      const skip = (batch - 1) * limit;

      const filter: Record<string, unknown> = {
        organizationId,
        ...(level && { level }),
        ...(departmentId && { departmentId }),
        ...(employeeId && { employeeId }),
        ...(dto.perspective && { perspective: dto.perspective }),
        ...(dto.kpiType && { kpiType: dto.kpiType }),
        ...(dto.kpiMetric && { kpiMetric: dto.kpiMetric }),
        ...(dto.frequency && { frequency: dto.frequency }),
        ...(dto.status && { status: dto.status }),
      };

      if (dto.search) {
        const regex = new RegExp(dto.search, 'i');
        filter.$or = [
          { title: regex },
          { description: regex },
          { keyMeasures: regex },
          { kpiMetric: regex },
          { target: regex },
        ];
      }

      const sort: Record<string, 1 | -1> = {};
      if (dto.sortBy) {
        sort[dto.sortBy] = dto.sortOrder === 'asc' ? 1 : -1;
      } else {
        sort.createdAt = -1;
      }

      const [items, total] = await Promise.all([
        this.goalModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
        this.goalModel.countDocuments(filter).exec(),
      ]);

      return { items, total };
    } catch (error) {
      throw error;
    }
  }

  async findByIds(ids: string[]): Promise<GoalDocument[]> {
    try {
      const objectIds = ids
        .map((id) =>
          Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null,
        )
        .filter((id) => id !== null) as Types.ObjectId[];
      if (objectIds.length === 0) return [];
      return await this.goalModel.find({ _id: { $in: objectIds } }).exec();
    } catch (error) {
      throw error;
    }
  }

  async deleteOrgDepartment(where: PropDataInput): Promise<void> {
    try {
      await this.goalModel.deleteMany(where).exec();
    } catch (error) {
      throw error;
    }
  }
}
