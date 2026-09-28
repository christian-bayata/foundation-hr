import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole, UserRoleDocument } from '../entity/user-role.schema';
import { ListCompanyAdminFilters } from '../interface/company-admin.interface';
import { PropDataInput } from '../../../../common/util/util.interface';
import { Role } from '../entity/role.schema';
import { UpdateCompanyAdminRoleDto } from '../dto/company-admin.dto';

@Injectable()
export class UserRoleRepository {
  constructor(
    @InjectModel(UserRole.name)
    private readonly userRoleModel: Model<UserRoleDocument>,
  ) {}

  /**
   * @Responsibility: Repo to retrieve a user's role assignments within an organization,
   * with each assignment's role document populated
   *
   * @param userId - The user to resolve assignments for
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<UserRoleDocument[]>}
   */
  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<UserRoleDocument[]> {
    try {
      return await this.userRoleModel
        .find({ userId, organizationId })
        .populate('roleId');
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve all role assignments for a user across every organization,
   * with each assignment's role document populated
   *
   * @param userId - The user to resolve assignments for
   * @returns {Promise<UserRoleDocument[]>}
   */
  async findByUser(userId: string): Promise<UserRoleDocument[]> {
    try {
      return await this.userRoleModel.find({ userId }).populate('roleId');
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to check whether a user already has a specific role in an organization
   *
   * @param userId - The user to scope the query to
   * @param organizationId - The organization to scope the query to
   * @param roleId - The role to check against
   * @returns {Promise<UserRoleDocument | null>}
   */
  async findByUserAndOrgAndRole(
    userId: string,
    organizationId: string,
    roleId: Types.ObjectId,
  ): Promise<UserRoleDocument | null> {
    try {
      return await this.userRoleModel.findOne({
        userId,
        organizationId,
        roleId,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve all users assigned to a specific role in an organization
   *
   * @param roleId - The role to resolve assignments for
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<UserRoleDocument[]>}
   */
  async findByRoleAndOrganization(
    roleId: Types.ObjectId,
    organizationId: string,
  ): Promise<UserRoleDocument[]> {
    try {
      return await this.userRoleModel.find({ roleId, organizationId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve every role assignment matching a company admin
   * filter, with each assignment's role document populated. Sorting and pagination
   * are applied by the domain service because the admin set is small and the
   * sort keys (name, status) span the User and UserRole collections.
   *
   * @param filters - Scoped filter criteria
   * @returns {Promise<UserRoleDocument[]>}
   */
  async findByFilters(
    filters: ListCompanyAdminFilters,
  ): Promise<UserRoleDocument[]> {
    try {
      return await this.userRoleModel
        .find(this.buildWhereClause(filters))
        .populate('roleId')
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to build the Mongo filter for a company admin listing,
   * combining the role scope with the optional status, addedById, date created
   * range, resolved userId and job title constraints
   */
  private buildWhereClause(
    filters: ListCompanyAdminFilters,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      organizationId: filters.organizationId,
      roleId: { $in: filters.roleIds },
    };

    if (filters.status) where.status = filters.status;
    if (filters.addedById) where.addedById = filters.addedById;
    if (filters.userIds) where.userId = { $in: filters.userIds };
    if (filters.dateCreatedRange) {
      where.createdAt = {
        $gte: filters.dateCreatedRange.from,
        $lt: filters.dateCreatedRange.to,
      };
    }

    if (filters.jobTitleCodes?.length || filters.jobTitleUserIds?.length) {
      const or: Record<string, unknown>[] = [];
      if (filters.jobTitleCodes?.length) {
        or.push({ jobTitleCode: { $in: filters.jobTitleCodes } });
      }
      if (filters.jobTitleUserIds?.length) {
        or.push({ userId: { $in: filters.jobTitleUserIds } });
      }
      where.$or = or;
    }

    return where;
  }

  /**
   * @Responsibility: Repo to retrieve a single role assignment by its id within an
   * organization, across every role tier, with each assignment's role document
   * populated. Scoping by organizationId is what keeps a guessed id from reaching
   * another tenant's assignment.
   *
   * @param id - The role assignment id to look up
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<UserRoleDocument | null>}
   */
  async findByIdAndOrganization(
    id: string,
    organizationId: string,
  ): Promise<UserRoleDocument | null> {
    try {
      return await this.userRoleModel
        .findOne({ _id: id, organizationId })
        .populate('roleId')
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to partially update a role assignment by its id
   *
   * @param id - The role assignment id to update
   * @param data - Fields to update on the assignment
   * @returns {Promise<UserRoleDocument | null>}
   */
  async updateById(
    id: string,
    data: Partial<UserRole>,
  ): Promise<UserRoleDocument | null> {
    try {
      return await this.userRoleModel
        .findByIdAndUpdate(id, { $set: data }, { new: true })
        .populate('roleId')
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to persist a new user-role assignment
   *
   * @param data - User-role assignment fields to save
   * @returns {Promise<UserRoleDocument>}
   */
  async assign(data: Partial<UserRole>): Promise<UserRoleDocument> {
    try {
      return await this.userRoleModel.create(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to delete a single user-role assignment
   *
   * @param userId - The user to scope the deletion to
   * @param roleId - The role to scope the deletion to
   * @param organizationId - The organization to scope the deletion to
   * @returns {Promise<void>}
   */
  async remove(
    userId: string,
    roleId: Types.ObjectId,
    organizationId: string,
  ): Promise<void> {
    try {
      await this.userRoleModel.deleteOne({
        userId,
        roleId,
        organizationId,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to delete every role assignment for a user within an organization
   *
   * @param userId - The user to clear assignments for
   * @param organizationId - The organization to scope the deletion to
   * @returns {Promise<void>}
   */
  async removeAllForUser(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      await this.userRoleModel.deleteMany({ userId, organizationId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to partially update an existing user role
   *
   * @param roleId - The role id to update
   * @param data - Fields to update on the role
   * @returns {Promise<RoleDocument | null>}
   */
  async updateUserRole(
    where: PropDataInput,
    data: Partial<UpdateCompanyAdminRoleDto>,
  ): Promise<void | null> {
    try {
      await this.userRoleModel.findOneAndUpdate(where, data, { new: true });
    } catch (error) {
      throw error;
    }
  }
}
