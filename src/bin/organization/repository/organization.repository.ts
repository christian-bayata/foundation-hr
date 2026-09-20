import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
} from '../entity/organization.schema';
import { PropDataInput } from '../../../common/util/util.interface';

@Injectable()
export class OrganizationRepository {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
  ) {}

  /**
   * @Responsibility: Repo to create an organization
   *
   * @param data
   * @returns {Promise<OrganizationDocument>}
   */
  async createOrganization(
    data: Partial<Organization>,
  ): Promise<OrganizationDocument> {
    try {
      return await this.organizationModel.create(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve an organization by its owner
   *
   * @param owner - the owning user's ObjectId
   * @returns {Promise<OrganizationDocument | null>}
   */
  async findOrganizationByOwner(
    owner: Types.ObjectId | string,
  ): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel.findOne({ owner });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve an organization by slug
   *
   * @param slug - The organization's URL slug
   * @returns {Promise<OrganizationDocument | null>}
   */
  async findBySlug(slug: string): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel.findOne({ slug });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to retrieve an organization by its id
   *
   * @param organizationId - The organization's id
   * @returns {Promise<OrganizationDocument | null>}
   */
  async findOrg(
    where: PropDataInput,
    attributes: string = '',
  ): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel.findById(where).select(attributes);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to partially update an organization by its id
   *
   * @param organizationId - The organization's id
   * @param data - Fields to update on the organization
   * @returns {Promise<OrganizationDocument | null>}
   */
  async updateById(
    organizationId: string,
    data: Partial<Organization>,
  ): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel.findByIdAndUpdate(
        organizationId,
        { $set: data },
        { new: true },
      );
    } catch (error) {
      throw error;
    }
  }
}
