import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Model } from 'mongoose';
import {
  OrganizationDepartment,
  OrganizationDepartmentDocument,
} from '../entity/organization-department.schema';

@Injectable()
export class OrganizationDepartmentRepository {
  constructor(
    @InjectModel(OrganizationDepartment.name)
    private readonly organizationDepartmentModel: Model<OrganizationDepartmentDocument>,
  ) {}

  /**
   * @Responsibility: Repo to retrieve all departments belonging to an organization
   *
   * @param organizationId - Organization id to scope the query to
   * @param attributes - Optional projection string
   * @returns {Promise<OrganizationDepartmentDocument[]>}
   */
  async findByOrganization(
    organizationId: string,
    attributes: string = '',
  ): Promise<OrganizationDepartmentDocument[]> {
    try {
      return await this.organizationDepartmentModel
        .find({ organizationId })
        .select(attributes)
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Reconcile an organization's departments to match the full
   * submitted list. Departments that share an id with an existing record keep
   * their document id so external references stay stable; records whose id is
   * absent from the list are removed.
   *
   * @param organizationId - Organization id to scope the sync to
   * @param departments - The reconciled department documents to persist
   * @returns {Promise<void>}
   */
  async synchronizeDepartments(
    organizationId: string,
    departments: OrganizationDepartment[],
  ): Promise<void> {
    try {
      const incomingCodes = departments.map((department) => department.code);
      const operations: AnyBulkWriteOperation<OrganizationDepartmentDocument>[] =
        departments.map((department) => ({
          updateOne: {
            filter: { _id: department._id, organizationId },
            update: {
              $set: {
                code: department.code,
                name: department.name,
                headOfDepartmentId: department.headOfDepartmentId ?? null,
                parentDepartmentId: department.parentDepartmentId ?? null,
              },
              $setOnInsert: {
                organizationId,
              },
            },
            upsert: true,
          },
        }));

      operations.push({
        deleteMany: {
          filter: { organizationId, code: { $nin: incomingCodes } },
        },
      });

      await this.organizationDepartmentModel.bulkWrite(operations);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Alias for synchronizeDepartments — replaces the full
   * departments list for an organization. Kept for backwards compatibility
   * with callers that use the `replaceDepartments` naming.
   */
  async replaceDepartments(
    organizationId: string,
    departments: OrganizationDepartment[],
  ): Promise<void> {
    return this.synchronizeDepartments(organizationId, departments);
  }

  /**
   * @Responsibility: Create one or more new department documents additively
   * without reconciling/deleting existing departments. Used by the Add
   * Department feature.
   *
   * @param departments - The department documents to insert
   * @returns {Promise<OrganizationDepartmentDocument[]>}
   */
  async createMany(
    departments: OrganizationDepartment[],
  ): Promise<OrganizationDepartmentDocument[]> {
    try {
      if (departments.length === 0) return [];
      return (await this.organizationDepartmentModel.insertMany(
        departments,
        { ordered: true },
      )) as OrganizationDepartmentDocument[];
    } catch (error) {
      throw error;
    }
  }

  async create(
    department: OrganizationDepartment,
  ): Promise<OrganizationDepartmentDocument> {
    try {
      const created = await this.organizationDepartmentModel.create(department);
      return created as OrganizationDepartmentDocument;
    } catch (error) {
      throw error;
    }
  }
}
