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
    owner: string,
  ): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel.findOne({ ownerId: owner });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to check whether a user owns an organization. Used to
   * recognize the owner even when they hold no role assignment.
   *
   * @param organizationId - The organization's id
   * @param userId - The user's ObjectId
   * @returns {Promise<boolean>}
   */
  async isOwner(organizationId: string, userId: string): Promise<boolean> {
    try {
      const exists = await this.organizationModel.exists({
        _id: organizationId,
        ownerId: userId,
      });
      return Boolean(exists);
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
   * @Responsibility: Repo to check whether a domain prefix is already claimed by
   * another organization. The prefix is the organization's public subdomain, so
   * it has to stay unique across every organization.
   *
   * @param domainPrefix - The normalized domain prefix to look for
   * @param excludeOrganizationId - Optional organization that is ignored, used
   * when an organization re-saves its own prefix
   * @returns {Promise<boolean>}
   */
  async isDomainPrefixTaken(
    domainPrefix: string,
    excludeOrganizationId?: string,
  ): Promise<boolean> {
    try {
      const exists = await this.organizationModel.exists({
        domainPrefix,
        ...(excludeOrganizationId
          ? { _id: { $ne: excludeOrganizationId } }
          : {}),
      });
      return Boolean(exists);
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
      return await this.organizationModel.findOne(where).select(attributes);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to update an organization
   *
   * @param where
   * @param data
   * @returns {Promise<void>}
   */
  async updateOrg(
    where: PropDataInput,
    data: Partial<Organization> | Record<string, any>,
  ): Promise<void> {
    try {
      await this.organizationModel.findOneAndUpdate(where, data, {
        new: true,
      });
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
