import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from '../entity/role.schema';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  async findByOrganization(organizationId: string): Promise<RoleDocument[]> {
    try {
      return await this.roleModel.find({ organizationId }).sort({ isSystemRole: -1, name: 1 });
    } catch (error) {
      throw error;
    }
  }

  async findById(roleId: string): Promise<RoleDocument | null> {
    try {
      return await this.roleModel.findById(roleId);
    } catch (error) {
      throw error;
    }
  }

  async findByOrganizationAndName(
    organizationId: string,
    name: string,
  ): Promise<RoleDocument | null> {
    try {
      return await this.roleModel.findOne({ organizationId, name });
    } catch (error) {
      throw error;
    }
  }

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

  async create(data: Partial<Role>): Promise<RoleDocument> {
    try {
      return await this.roleModel.create(data);
    } catch (error) {
      throw error;
    }
  }

  async createMany(data: Partial<Role>[]): Promise<RoleDocument[]> {
    try {
      const docs = await this.roleModel.insertMany(data);
      return docs as unknown as RoleDocument[];
    } catch (error) {
      throw error;
    }
  }

  async update(
    roleId: string,
    data: Partial<Role>,
  ): Promise<RoleDocument | null> {
    try {
      return await this.roleModel.findByIdAndUpdate(
        roleId,
        { $set: data },
        { new: true },
      );
    } catch (error) {
      throw error;
    }
  }

  async delete(roleId: string): Promise<void> {
    try {
      await this.roleModel.findByIdAndDelete(roleId);
    } catch (error) {
      throw error;
    }
  }
}
