import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OrganizationPolicy,
  OrganizationPolicyDocument,
} from '../entity/organization-policy.schema';

/**
 * Escapes user-supplied input before it is embedded in a RegExp so a policy
 * name containing regex metacharacters cannot alter the match.
 */
const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class OrganizationPolicyRepository {
  constructor(
    @InjectModel(OrganizationPolicy.name)
    private readonly organizationPolicyModel: Model<OrganizationPolicyDocument>,
  ) {}

  /**
   * @Responsibility: Retrieve an organization's policy documents, optionally
   * filtered by a search term against the document name. Documents are
   * returned most recently uploaded first.
   *
   * @param organizationId - Organization id to scope the query to
   * @param search - Optional document name search term
   * @returns {Promise<OrganizationPolicyDocument[]>}
   */
  async findByOrganization(
    organizationId: string,
    search: string = '',
  ): Promise<OrganizationPolicyDocument[]> {
    try {
      const query: Record<string, unknown> = {
        organizationId,
        ...(search && {
          $or: [{ name: new RegExp(escapeRegex(search), 'i') }],
        }),
      };

      return await this.organizationPolicyModel
        .find(query)
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve a single policy document by its unique code
   * within an organization.
   *
   * @param organizationId - Organization id to scope the query to
   * @param code - The unique policy document code to match
   * @returns {Promise<OrganizationPolicyDocument | null>}
   */
  async findByCode(
    organizationId: string,
    code: string,
  ): Promise<OrganizationPolicyDocument | null> {
    try {
      return await this.organizationPolicyModel
        .findOne({ organizationId, code })
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Create a new policy document for an organization
   *
   * @param policy - The policy document to persist
   * @returns {Promise<OrganizationPolicyDocument>}
   */
  async create(
    policy: OrganizationPolicy,
  ): Promise<OrganizationPolicyDocument> {
    try {
      const created = await this.organizationPolicyModel.create(policy);
      return created as OrganizationPolicyDocument;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Update a single policy document matched by its unique
   * code within an organization. Only the fields present are applied.
   *
   * @param organizationId - Organization id to scope the update to
   * @param code - The unique policy document code to match
   * @param update - The partial update to apply
   * @returns {Promise<OrganizationPolicyDocument | null>}
   */
  async updateByCode(
    organizationId: string,
    code: string,
    update: Partial<OrganizationPolicy>,
  ): Promise<OrganizationPolicyDocument | null> {
    try {
      return await this.organizationPolicyModel
        .findOneAndUpdate(
          { organizationId, code },
          { $set: update },
          { new: true },
        )
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Delete a single policy document matched by the given
   * filter, always scoped by organizationId by callers.
   *
   * @param where - Query filter
   * @returns {Promise<OrganizationPolicyDocument | null>} the deleted document
   */
  async deleteWhere(where: {
    organizationId: string;
    code: string;
  }): Promise<OrganizationPolicyDocument | null> {
    try {
      return await this.organizationPolicyModel
        .findOneAndDelete(where)
        .exec();
    } catch (error) {
      throw error;
    }
  }
}