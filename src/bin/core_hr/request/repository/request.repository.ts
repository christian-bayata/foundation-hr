import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import {
  EmployeeRequest,
  EmployeeRequestDocument,
} from '../entity/request.schema';

@Injectable()
export class RequestRepository {
  constructor(
    @InjectModel(EmployeeRequest.name)
    private readonly requestModel: Model<EmployeeRequestDocument>,
  ) {}

  async create(
    data: Partial<EmployeeRequest>,
  ): Promise<EmployeeRequestDocument> {
    return this.requestModel.create(data);
  }

  async findById(requestId: string): Promise<EmployeeRequestDocument | null> {
    return this.requestModel.findById(requestId);
  }

  async updateById(
    requestId: string,
    data: Partial<EmployeeRequest> | Record<string, unknown>,
  ): Promise<EmployeeRequestDocument | null> {
    return this.requestModel.findByIdAndUpdate(
      requestId,
      { $set: data },
      { new: true },
    );
  }

  async deleteById(requestId: string): Promise<EmployeeRequestDocument | null> {
    return this.requestModel.findByIdAndDelete(requestId);
  }

  async paginatedQuery(
    where: QueryFilter<EmployeeRequestDocument>,
    sort: Record<string, 1 | -1>,
    page: number,
    pageSize: number,
  ): Promise<{ items: EmployeeRequestDocument[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.requestModel
        .find(where)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.requestModel.countDocuments(where).exec(),
    ]);

    return { items, total };
  }

  async findAll(
    where: QueryFilter<EmployeeRequestDocument>,
    sort: Record<string, 1 | -1>,
    limit = 10000,
  ): Promise<EmployeeRequestDocument[]> {
    return this.requestModel.find(where).sort(sort).limit(limit).exec();
  }

  async count(where: QueryFilter<EmployeeRequestDocument>): Promise<number> {
    return this.requestModel.countDocuments(where).exec();
  }
}
