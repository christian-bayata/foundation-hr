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

  async findByUser(userId: string): Promise<UserRoleDocument[]> {
    try {
      return await this.userRoleModel.find({ userId }).populate('roleId');
    } catch (error) {
      throw error;
    }
  }

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

  async assign(data: Partial<UserRole>): Promise<UserRoleDocument> {
    try {
      return await this.userRoleModel.create(data);
    } catch (error) {
      throw error;
    }
  }

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
