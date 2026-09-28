import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from '../entity/role.schema';
import { PropDataInput } from '../../../../common/util/util.interface';
import { SystemRole } from '../../../auth/enum/role.enum';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  /**
   * @Responsibility: Repo to retrieve all roles (system + custom) for an organization,
   * ordered with system roles first, then alphabetically by name
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<RoleDocument[]>}
   */
  async findByOrganization(organizationId: string): Promise<RoleDocument[]> {
    try {
      return await this.roleModel
        .find({ organizationId })
        .sort({ isSystemRole: -1, name: 1 });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve a single role by its id
   *
   * @param roleId - The role id to look up
   * @returns {Promise<RoleDocument | null>}
   */
  async findById(roleId: string): Promise<RoleDocument | null> {
    try {
      return await this.roleModel.findById(roleId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to find a role by its organization and name
   *
   * @param organizationId - The organization to scope the query to
   * @param name - The role name to look up
   * @returns {Promise<RoleDocument | null>}
   */
  async findByOrganizationAndName(
    where: PropDataInput,
    attributes: string = '',
  ): Promise<RoleDocument | null> {
    try {
      return await this.roleModel.findOne(where).select(attributes);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve only the default system roles for an organization
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<RoleDocument[]>}
   */
  async findSystemRoles(organizationId: string): Promise<RoleDocument[]> {
    try {
      return await this.roleModel.find({
        organizationId,
        isSystemRole: true,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve the roles of an organization whose parent
   * system role matches any of the given system roles
   *
   * @param organizationId - The organization to scope the query to
   * @param systemRoles - The system roles to match against
   * @returns {Promise<RoleDocument[]>}
   */
  async findByOrganizationAndParentSystemRoles(
    organizationId: string,
    systemRoles: SystemRole[],
  ): Promise<RoleDocument[]> {
    try {
      return await this.roleModel.find({
        organizationId,
        parentSystemRole: { $in: systemRoles },
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to persist a new role document
   *
   * @param data - Role fields to save
   * @returns {Promise<RoleDocument>}
   */
  async create(data: Partial<Role>): Promise<RoleDocument> {
    try {
      return await this.roleModel.create(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to bulk insert multiple role documents in a single query
   *
   * @param data - Array of role fields to save
   * @returns {Promise<RoleDocument[]>}
   */
  async createMany(data: Partial<Role>[]): Promise<RoleDocument[]> {
    try {
      const docs = await this.roleModel.insertMany(data);
      return docs as unknown as RoleDocument[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to partially update an existing role
   *
   * @param roleId - The role id to update
   * @param data - Fields to update on the role
   * @returns {Promise<RoleDocument | null>}
   */
  async updateRole(
    where: PropDataInput,
    data: Partial<Role>,
  ): Promise<RoleDocument | null> {
    try {
      return await this.roleModel.findOneAndUpdate(where, data, { new: true });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to permanently delete a role by its id
   *
   * @param roleId - The role id to delete
   * @returns {Promise<void>}
   */
  async delete(roleId: string): Promise<void> {
    try {
      await this.roleModel.findByIdAndDelete(roleId);
    } catch (error) {
      throw error;
    }
  }
}
