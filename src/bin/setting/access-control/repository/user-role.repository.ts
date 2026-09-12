import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole, UserRoleDocument } from '../entity/user-role.schema';

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
}