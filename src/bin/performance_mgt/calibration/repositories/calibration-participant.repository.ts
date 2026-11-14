import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CalibrationParticipant,
  CalibrationParticipantDocument,
} from '../schemas/calibration-participant.schema';
import {
  CalibrationPerformanceLevel,
  CalibrationPotential,
} from '../../appraisal/enums/appraisal.enums';

export type CalibrationParticipantTab =
  | 'all'
  | 'needs_justification'
  | 'adjusted'
  | 'moved';

export interface ListCalibrationParticipantFilters {
  sessionId: string;
  tab?: CalibrationParticipantTab;
  search?: string;
  departmentCode?: string;
  managerId?: string;
  calibratedBand?: string;
  performanceLevel?: CalibrationPerformanceLevel;
  potential?: CalibrationPotential;
  boxKey?: string;
  timeInBoxSinceBefore?: Date;
  timeInBoxSinceAfter?: Date;
  batch?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface CalibrationParticipantListResult {
  items: CalibrationParticipantDocument[];
  total: number;
}

export interface CalibrationBandBucket {
  band: string | null;
  count: number;
  averageScore: number;
}

export interface CalibrationDepartmentBucket {
  departmentCode: string | null;
  departmentName: string | null;
  band: string | null;
  count: number;
}

export interface CalibrationBoxBucket {
  performanceLevel: CalibrationPerformanceLevel | null;
  potential: CalibrationPotential | null;
  boxKey: string | null;
  count: number;
}

@Injectable()
export class CalibrationParticipantRepository {
  constructor(
    @InjectModel(CalibrationParticipant.name)
    private readonly participantModel: Model<CalibrationParticipantDocument>,
  ) {}

  async create(
    data: Partial<CalibrationParticipant>,
  ): Promise<CalibrationParticipantDocument> {
    return (await this.participantModel.create(
      data,
    )) as CalibrationParticipantDocument;
  }

  async createMany(
    data: Partial<CalibrationParticipant>[],
  ): Promise<CalibrationParticipantDocument[]> {
    if (data.length === 0) return [];
    return (await this.participantModel.insertMany(data, {
      ordered: false,
    })) as CalibrationParticipantDocument[];
  }

  async findOne(
    where: Record<string, unknown>,
  ): Promise<CalibrationParticipantDocument | null> {
    return await this.participantModel.findOne(where).exec();
  }

  async findById(
    id: string,
    organizationId?: string,
  ): Promise<CalibrationParticipantDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return await this.participantModel
      .findOne({ _id: id, ...(organizationId && { organizationId }) })
      .exec();
  }

  async findBySessionAndAppraisal(
    organizationId: string,
    sessionId: string,
    appraisalId: string,
  ): Promise<CalibrationParticipantDocument | null> {
    return await this.participantModel
      .findOne({ organizationId, sessionId, appraisalId })
      .exec();
  }

  async findBySession(
    organizationId: string,
    sessionId: string,
  ): Promise<CalibrationParticipantDocument[]> {
    return await this.participantModel
      .find({ organizationId, sessionId })
      .sort({ employeeName: 1 })
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<CalibrationParticipant>,
  ): Promise<CalibrationParticipantDocument | null> {
    return await this.participantModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async updateMany(
    where: Record<string, unknown>,
    data: Partial<CalibrationParticipant>,
  ): Promise<number> {
    const result = await this.participantModel
      .updateMany(where, { $set: data })
      .exec();
    return result.modifiedCount;
  }

  async deleteBySession(
    organizationId: string,
    sessionId: string,
  ): Promise<number> {
    const result = await this.participantModel
      .deleteMany({ organizationId, sessionId })
      .exec();
    return result.deletedCount;
  }

  async deleteByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<number> {
    const result = await this.participantModel
      .deleteMany({ organizationId, cycleId })
      .exec();
    return result.deletedCount;
  }

  async paginatedList(
    filters: ListCalibrationParticipantFilters,
    organizationId: string,
  ): Promise<CalibrationParticipantListResult> {
    const { batch = 1, limit = 10 } = filters;
    const skip = (batch - 1) * limit;
    const filter = this.buildFilter(filters, organizationId);

    const [items, total] = await Promise.all([
      this.participantModel
        .find(filter)
        .sort(this.buildSort(filters))
        .skip(skip)
        .limit(limit)
        .exec(),
      this.participantModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async findAll(
    sessionId: string,
    organizationId: string,
  ): Promise<CalibrationParticipantDocument[]> {
    return await this.participantModel
      .find({ organizationId, sessionId })
      .exec();
  }

  async countBySession(
    organizationId: string,
    sessionId: string,
  ): Promise<number> {
    return await this.participantModel
      .countDocuments({ organizationId, sessionId })
      .exec();
  }

  async countAdjusted(
    organizationId: string,
    sessionId: string,
  ): Promise<number> {
    return await this.participantModel
      .countDocuments({ organizationId, sessionId, isAdjusted: true })
      .exec();
  }

  async countAwaitingJustification(
    organizationId: string,
    sessionId: string,
  ): Promise<number> {
    return await this.participantModel
      .countDocuments({
        organizationId,
        sessionId,
        justificationRequired: true,
        $or: [{ justification: null }, { justification: '' }],
      })
      .exec();
  }

  async countMoved(
    organizationId: string,
    sessionId: string,
  ): Promise<number> {
    return await this.participantModel
      .countDocuments({
        organizationId,
        sessionId,
        movedThisSession: true,
      })
      .exec();
  }

  async averageScore(
    organizationId: string,
    sessionId: string,
  ): Promise<number> {
    const rows = await this.participantModel
      .aggregate<{ average: number }>([
        { $match: { organizationId, sessionId } },
        {
          $group: {
            _id: null,
            average: { $avg: '$calibratedRating' },
          },
        },
        { $project: { _id: 0, average: { $round: ['$average', 2] } } },
      ])
      .exec();

    return rows[0]?.average ?? 0;
  }

  async bandDistribution(
    organizationId: string,
    sessionId: string,
  ): Promise<CalibrationBandBucket[]> {
    const rows = await this.participantModel
      .aggregate<{ _id: string | null; count: number; average: number }>([
        { $match: { organizationId, sessionId } },
        {
          $group: {
            _id: '$calibratedBand',
            count: { $sum: 1 },
            average: { $avg: '$calibratedRating' },
          },
        },
        { $project: { _id: 1, count: 1, average: { $round: ['$average', 2] } } },
      ])
      .exec();

    return rows.map((row) => ({
      band: row._id ?? null,
      count: row.count,
      averageScore: row.average ?? 0,
    }));
  }

  async departmentDistribution(
    organizationId: string,
    sessionId: string,
  ): Promise<CalibrationDepartmentBucket[]> {
    const rows = await this.participantModel
      .aggregate<{
        _id: { departmentCode: string | null; band: string | null };
        departmentName: string | null;
        count: number;
      }>([
        { $match: { organizationId, sessionId } },
        {
          $group: {
            _id: {
              departmentCode: '$departmentCode',
              band: '$calibratedBand',
            },
            departmentName: { $first: '$departmentName' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    return rows.map((row) => ({
      departmentCode: row._id.departmentCode ?? null,
      departmentName: row.departmentName ?? null,
      band: row._id.band ?? null,
      count: row.count,
    }));
  }

  async boxDistribution(
    organizationId: string,
    sessionId: string,
  ): Promise<CalibrationBoxBucket[]> {
    const rows = await this.participantModel
      .aggregate<{
        _id: {
          performanceLevel: CalibrationPerformanceLevel | null;
          potential: CalibrationPotential | null;
          boxKey: string | null;
        };
        count: number;
      }>([
        { $match: { organizationId, sessionId } },
        {
          $group: {
            _id: {
              performanceLevel: '$performanceLevel',
              potential: '$potential',
              boxKey: '$boxKey',
            },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    return rows.map((row) => ({
      performanceLevel: row._id.performanceLevel ?? null,
      potential: row._id.potential ?? null,
      boxKey: row._id.boxKey ?? null,
      count: row.count,
    }));
  }

  async distinctValues(
    organizationId: string,
    sessionId: string,
    field: 'departmentCode' | 'managerId',
  ): Promise<string[]> {
    return await this.participantModel
      .distinct(field, { organizationId, sessionId })
      .exec();
  }

  private buildFilter(
    filters: ListCalibrationParticipantFilters,
    organizationId: string,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      organizationId,
      sessionId: filters.sessionId,
      ...(filters.departmentCode && {
        departmentCode: filters.departmentCode,
      }),
      ...(filters.managerId && { managerId: filters.managerId }),
      ...(filters.calibratedBand && {
        calibratedBand: filters.calibratedBand,
      }),
      ...(filters.performanceLevel && {
        performanceLevel: filters.performanceLevel,
      }),
      ...(filters.potential && { potential: filters.potential }),
      ...(filters.boxKey && { boxKey: filters.boxKey }),
    };

    if (filters.tab === 'needs_justification') {
      filter.justificationRequired = true;
      filter.$or = [{ justification: null }, { justification: '' }];
    } else if (filters.tab === 'adjusted') {
      filter.isAdjusted = true;
    } else if (filters.tab === 'moved') {
      filter.movedThisSession = true;
    }

    if (filters.timeInBoxSinceBefore || filters.timeInBoxSinceAfter) {
      filter.timeInBoxSince = {
        ...(filters.timeInBoxSinceBefore && {
          $lte: filters.timeInBoxSinceBefore,
        }),
        ...(filters.timeInBoxSinceAfter && {
          $gte: filters.timeInBoxSinceAfter,
        }),
      };
    }

    if (filters.search) {
      const regex = new RegExp(
        filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      const searchOr = [
        { employeeName: regex },
        { employeeCode: regex },
        { employeeEmail: regex },
      ];
      filter.$and = [...((filter.$and as unknown[]) ?? []), { $or: searchOr }];
    }

    return filter;
  }

  private buildSort(
    filters: ListCalibrationParticipantFilterSort,
  ): Record<string, 1 | -1> {
    const sort: Record<string, 1 | -1> = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.employeeName = 1;
    }
    return sort;
  }
}

type ListCalibrationParticipantFilterSort = Pick<
  ListCalibrationParticipantFilters,
  'sortBy' | 'sortOrder'
>;
