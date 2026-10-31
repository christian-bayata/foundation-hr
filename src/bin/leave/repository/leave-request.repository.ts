import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import {
  LeaveRequest,
  LeaveRequestDocument,
} from '../entity/leave-request.schema';
import { LeaveRequestStatus } from '../enum/leave.enum';

@Injectable()
export class LeaveRequestRepository {
  constructor(
    @InjectModel(LeaveRequest.name)
    private readonly leaveRequestModel: Model<LeaveRequestDocument>,
  ) {}

  async create(
    data: Partial<LeaveRequest>,
  ): Promise<LeaveRequestDocument> {
    return this.leaveRequestModel.create(data);
  }

  async findById(
    organizationId: string,
    leaveRequestId: string,
  ): Promise<LeaveRequestDocument | null> {
    if (!Types.ObjectId.isValid(leaveRequestId)) {
      return null;
    }

    return this.leaveRequestModel.findOne({
      _id: leaveRequestId,
      organizationId,
    });
  }

  async updateById(
    leaveRequestId: string,
    data: Partial<LeaveRequest> | Record<string, unknown>,
  ): Promise<LeaveRequestDocument | null> {
    return this.leaveRequestModel.findByIdAndUpdate(
      leaveRequestId,
      { $set: data },
      { new: true },
    );
  }

  async paginatedQuery(
    where: QueryFilter<LeaveRequestDocument>,
    sort: Record<string, 1 | -1>,
    page: number,
    pageSize: number,
  ): Promise<{ items: LeaveRequestDocument[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.leaveRequestModel
        .find(where)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.leaveRequestModel.countDocuments(where).exec(),
    ]);

    return { items, total };
  }

  async findAll(
    where: QueryFilter<LeaveRequestDocument>,
    sort: Record<string, 1 | -1>,
    limit = 10000,
  ): Promise<LeaveRequestDocument[]> {
    return this.leaveRequestModel.find(where).sort(sort).limit(limit).exec();
  }

  async findForSummary(
    organizationId: string,
    employeeIds: string[],
    yearStart: Date,
    yearEnd: Date,
  ): Promise<LeaveRequestDocument[]> {
    if (employeeIds.length === 0) {
      return [];
    }

    return this.leaveRequestModel
      .find({
        organizationId,
        employeeId: { $in: employeeIds },
        status: {
          $in: [
            LeaveRequestStatus.PENDING,
            LeaveRequestStatus.APPROVED,
            LeaveRequestStatus.REJECTED,
          ],
        },
        startDate: { $lte: yearEnd },
        endDate: { $gte: yearStart },
      })
      .exec();
  }
}
