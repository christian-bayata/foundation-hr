import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ParticipantAuditLog, ParticipantAuditLogDocument } from '../schemas/participant-audit-log.schema';
import { ParticipantAuditAction } from '../enums/appraisal.enums';

export interface ListParticipantAuditLogFilters {
  appraisalId?: string;
  employeeId?: string;
  action?: ParticipantAuditAction;
  search?: string;
  batch?: number;
  limit?: number;
}

interface ParticipantAuditLogListResult {
  items: ParticipantAuditLogDocument[];
  total: number;
}

@Injectable()
export class ParticipantAuditLogRepository {
  constructor(
    @InjectModel(ParticipantAuditLog.name)
    private readonly auditLogModel: Model<ParticipantAuditLogDocument>,
  ) {}

  async create(data: Partial<ParticipantAuditLog>): Promise<ParticipantAuditLogDocument> {
    return (await this.auditLogModel.create(data)) as ParticipantAuditLogDocument;
  }

  async createMany(
    data: Partial<ParticipantAuditLog>[],
  ): Promise<ParticipantAuditLogDocument[]> {
    if (data.length === 0) return [];
    return (await this.auditLogModel.insertMany(data, { ordered: false })) as ParticipantAuditLogDocument[];
  }

  async findOne(
    where: Record<string, unknown>,
  ): Promise<ParticipantAuditLogDocument | null> {
    return await this.auditLogModel.findOne(where).exec();
  }

  async findById(
    id: string,
    organizationId?: string,
  ): Promise<ParticipantAuditLogDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return await this.auditLogModel
      .findOne({ _id: id, ...(organizationId && { organizationId }) })
      .exec();
  }

  async paginatedList(
    filters: ListParticipantAuditLogFilters,
    organizationId: string,
  ): Promise<ParticipantAuditLogListResult> {
    const { batch = 1, limit = 10 } = filters;
    const skip = (batch - 1) * limit;

    const filter: Record<string, unknown> = {
      organizationId,
      ...(filters.appraisalId && { appraisalId: filters.appraisalId }),
      ...(filters.employeeId && { employeeId: filters.employeeId }),
      ...(filters.action && { action: filters.action }),
    };

    if (filters.search) {
      const regex = new RegExp(
        filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [
        { actorName: regex },
        { justification: regex },
        { previousValue: regex },
        { newValue: regex },
      ];
    }

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async findByAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<ParticipantAuditLogDocument[]> {
    return await this.auditLogModel
      .find({ organizationId, appraisalId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async countByAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<number> {
    return await this.auditLogModel
      .countDocuments({ organizationId, appraisalId })
      .exec();
  }

  async deleteByAppraisal(
    organizationId: string,
    appraisalId: string,
  ): Promise<void> {
    await this.auditLogModel.deleteMany({ organizationId, appraisalId }).exec();
  }

  async deleteByCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<void> {
    await this.auditLogModel.deleteMany({ organizationId, cycleId }).exec();
  }
}
