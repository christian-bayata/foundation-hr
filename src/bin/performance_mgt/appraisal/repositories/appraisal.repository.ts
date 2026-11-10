import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appraisal, AppraisalDocument } from '../schemas/appraisal.schema';
import {
  AppraisalRatingTag,
  AppraisalStatus,
} from '../enums/appraisal.enums';

export interface ListAppraisalsFilters {
  search?: string;
  role?: string;
  departmentCode?: string;
  departmentId?: string;
  status?: AppraisalStatus;
  ratingTag?: AppraisalRatingTag;
  batch?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface AppraisalListResult {
  items: AppraisalDocument[];
  total: number;
}

export interface DepartmentPerformanceRow {
  departmentCode: string | null;
  departmentName: string | null;
  employees: number;
  completed: number;
  completion: number;
  averageScore: number;
}

export interface AppraisalScoreStats {
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

@Injectable()
export class AppraisalRepository {
  constructor(
    @InjectModel(Appraisal.name)
    private readonly appraisalModel: Model<AppraisalDocument>,
  ) {}

  async create(data: Partial<Appraisal>): Promise<AppraisalDocument> {
    return (await this.appraisalModel.create(data)) as AppraisalDocument;
  }

  async createMany(
    data: Partial<Appraisal>[],
  ): Promise<AppraisalDocument[]> {
    if (data.length === 0) return [];
    return (await this.appraisalModel.insertMany(data, {
      ordered: false,
    })) as AppraisalDocument[];
  }

  async findOne(
    where: Record<string, unknown>,
  ): Promise<AppraisalDocument | null> {
    return await this.appraisalModel.findOne(where).exec();
  }

  async findById(
    id: string,
    organizationId?: string,
  ): Promise<AppraisalDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return await this.appraisalModel
      .findOne({ _id: id, ...(organizationId && { organizationId }) })
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<Appraisal>,
  ): Promise<AppraisalDocument | null> {
    return await this.appraisalModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async updateMany(
    where: Record<string, unknown>,
    data: Partial<Appraisal>,
  ): Promise<number> {
    const result = await this.appraisalModel
      .updateMany(where, { $set: data })
      .exec();
    return result.modifiedCount;
  }

  async deleteById(id: string): Promise<void> {
    await this.appraisalModel.findByIdAndDelete(id).exec();
  }

  async deleteByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<number> {
    const result = await this.appraisalModel
      .deleteMany({ organizationId, cycleId })
      .exec();
    return result.deletedCount;
  }

  async findByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<AppraisalDocument[]> {
    return await this.appraisalModel
      .find({ organizationId, cycleId })
      .exec();
  }

  async findByEmployee(
    organizationId: string,
    employeeId: string,
  ): Promise<AppraisalDocument[]> {
    return await this.appraisalModel
      .find({ organizationId, employeeId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByCycleAndEmployee(
    organizationId: string,
    cycleId: string,
    employeeId: string,
  ): Promise<AppraisalDocument | null> {
    return await this.appraisalModel
      .findOne({ organizationId, cycleId, employeeId })
      .exec();
  }

  async countByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<number> {
    return await this.appraisalModel
      .countDocuments({ organizationId, cycleId })
      .exec();
  }

  async paginatedList(
    filters: ListAppraisalsFilters,
    organizationId: string,
    cycleId: string,
  ): Promise<AppraisalListResult> {
    const { batch = 1, limit = 10 } = filters;
    const skip = (batch - 1) * limit;

    const filter: Record<string, unknown> = {
      organizationId,
      cycleId,
      ...(filters.role && { jobTitleCode: filters.role }),
      ...(filters.departmentCode && {
        departmentCode: filters.departmentCode,
      }),
      ...(filters.departmentId && { departmentId: filters.departmentId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.ratingTag && { ratingTag: filters.ratingTag }),
    };

    if (filters.search) {
      const regex = new RegExp(
        filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [
        { employeeName: regex },
        { employeeEmail: regex },
        { employeeCode: regex },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.employeeName = 1;
    }

    const [items, total] = await Promise.all([
      this.appraisalModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.appraisalModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async statusCounts(
    organizationId: string,
    cycleId: string,
  ): Promise<Record<string, number>> {
    const rows = await this.appraisalModel
      .aggregate<{ _id: string; count: number }>([
        { $match: { organizationId, cycleId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});
  }

  async scoreStats(
    organizationId: string,
    cycleId: string,
  ): Promise<AppraisalScoreStats> {
    const rows = await this.appraisalModel
      .aggregate<{
        averageScore: number;
        highestScore: number;
        lowestScore: number;
      }>([
        { $match: { organizationId, cycleId } },
        {
          $group: {
            _id: null,
            averageScore: { $avg: '$performanceScore' },
            highestScore: { $max: '$performanceScore' },
            lowestScore: { $min: '$performanceScore' },
          },
        },
        {
          $project: {
            _id: 0,
            averageScore: { $round: ['$averageScore', 2] },
            highestScore: 1,
            lowestScore: 1,
          },
        },
      ])
      .exec();

    return (
      rows[0] ?? { averageScore: 0, highestScore: 0, lowestScore: 0 }
    );
  }

  async departmentPerformance(
    organizationId: string,
    cycleId: string,
  ): Promise<DepartmentPerformanceRow[]> {
    const rows = await this.appraisalModel
      .aggregate<{
        departmentCode: string | null;
        departmentName: string | null;
        employees: number;
        completed: number;
        completion: number;
        averageScore: number;
      }>([
        { $match: { organizationId, cycleId } },
        {
          $group: {
            _id: '$departmentCode',
            departmentName: { $first: '$departmentName' },
            employees: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', AppraisalStatus.COMPLETED] }, 1, 0],
              },
            },
            averageScore: { $avg: '$performanceScore' },
          },
        },
        {
          $project: {
            _id: 0,
            departmentCode: '$_id',
            departmentName: 1,
            employees: 1,
            completed: 1,
            completion: {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$completed', '$employees'] },
                    100,
                  ],
                },
                2,
              ],
            },
            averageScore: { $round: ['$averageScore', 2] },
          },
        },
        { $sort: { departmentName: 1 } },
      ])
      .exec();

    return rows.map((row) => ({
      departmentCode: row.departmentCode ?? null,
      departmentName: row.departmentName ?? null,
      employees: row.employees,
      completed: row.completed,
      completion: row.completion ?? 0,
      averageScore: row.averageScore ?? 0,
    }));
  }
}
