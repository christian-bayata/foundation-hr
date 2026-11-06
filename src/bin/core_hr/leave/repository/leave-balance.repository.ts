import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Model } from 'mongoose';
import {
  LeaveBalance,
  LeaveBalanceDocument,
} from '../entity/leave-balance.schema';

export interface LeaveBalanceDefault {
  employeeId: string;
  leaveCategoryId: string;
  entitledDays: number;
}

@Injectable()
export class LeaveBalanceRepository {
  constructor(
    @InjectModel(LeaveBalance.name)
    private readonly leaveBalanceModel: Model<LeaveBalanceDocument>,
  ) {}

  async findForEmployeesYear(
    organizationId: string,
    employeeIds: string[],
    year: number,
  ): Promise<LeaveBalanceDocument[]> {
    if (employeeIds.length === 0) {
      return [];
    }

    return this.leaveBalanceModel
      .find({
        organizationId,
        employeeId: { $in: employeeIds },
        year,
      })
      .exec();
  }

  async upsertDefaults(
    organizationId: string,
    year: number,
    rows: LeaveBalanceDefault[],
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    const operations: AnyBulkWriteOperation<LeaveBalanceDocument>[] = rows.map(
      (row) => ({
        updateOne: {
          filter: {
            organizationId,
            employeeId: row.employeeId,
            leaveCategoryId: row.leaveCategoryId,
            year,
          },
          update: {
            $setOnInsert: {
              organizationId,
              employeeId: row.employeeId,
              leaveCategoryId: row.leaveCategoryId,
              year,
              entitledDays: row.entitledDays,
              carriedOverDays: 0,
              adjustmentDays: 0,
            },
          },
          upsert: true,
        },
      }),
    );

    await this.leaveBalanceModel.bulkWrite(operations);
  }
}
