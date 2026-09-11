import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { Employee, EmployeeDocument } from '../entity/employee.schema';
import { ListEmployeeFilters } from '../interface/employee.interface';

const SEARCHABLE_FIELDS = ['firstName', 'lastName', 'email', 'employeeId'];

@Injectable()
export class EmployeeRepository {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  /**
   * @Responsibility: Repo to create a new employee document
   *
   * @param data - Employee fields to persist
   * @returns {Promise<EmployeeDocument>}
   */
  async create(data: Partial<Employee>): Promise<EmployeeDocument> {
    try {
      return await this.employeeModel.create(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve a single employee by where clause
   *
   * @param where - Filter query
   * @returns {Promise<EmployeeDocument | null>}
   */
  async findOne(
    where: QueryFilter<EmployeeDocument>,
  ): Promise<EmployeeDocument | null> {
    try {
      return await this.employeeModel.findOne(where);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve an employee by user-entered employee ID
   *
   * @param employeeId - Employee identity string (e.g. 'FHR0001')
   * @returns {Promise<EmployeeDocument | null>}
   */
  async findByEmployeeId(
    employeeId: string,
  ): Promise<EmployeeDocument | null> {
    try {
      return await this.employeeModel.findOne({ employeeId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to update an existing employee by employee ID
   *
   * @param employeeId - Employee identity string
   * @param data - Fields to update
   * @returns {Promise<EmployeeDocument | null>}
   */
  async updateByEmployeeId(
    employeeId: string,
    data: Partial<Employee>,
  ): Promise<EmployeeDocument | null> {
    try {
      return await this.employeeModel.findOneAndUpdate(
        { employeeId },
        { $set: data },
        { new: true },
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve employees in batches with search,
   * filters, sorting and pagination
   *
   * @param filters - Search and filter criteria
   * @param sort - Mongo sort specifier
   * @param page - 1-indexed page number
   * @param pageSize - Items per page
   * @returns {Promise<{ items: EmployeeDocument[]; total: number }>}
   */
  async paginatedQuery(
    filters: ListEmployeeFilters,
    sort: Record<string, 1 | -1>,
    page: number,
    pageSize: number,
  ): Promise<{ items: EmployeeDocument[]; total: number }> {
    try {
      const where = this.buildWhereClause(filters);
      const skip = (page - 1) * pageSize;

      const [items, total] = await Promise.all([
        this.employeeModel
          .find(where)
          .sort(sort)
          .skip(skip)
          .limit(pageSize)
          .exec(),
        this.employeeModel.countDocuments(where).exec(),
      ]);

      return { items, total };
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Build a Mongo filter query from list filters, combining
   * free-text search across name/email/employeeId with exact-match filters
   */
  private buildWhereClause(
    filters: ListEmployeeFilters,
  ): QueryFilter<EmployeeDocument> {
    const where: QueryFilter<EmployeeDocument> = {};

    if (filters.q) {
      const regex = new RegExp(
        filters.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      where.$or = SEARCHABLE_FIELDS.map((field) => ({ [field]: regex }));
    }

    if (filters.employeeType) where.employeeType = filters.employeeType;
    if (filters.department) where.department = filters.department;
    if (filters.jobTitle) where.jobTitle = filters.jobTitle;
    if (filters.jobType) where.jobType = filters.jobType;
    if (filters.status) where.status = filters.status;
    if (filters.location) where.location = filters.location;

    return where;
  }
}
