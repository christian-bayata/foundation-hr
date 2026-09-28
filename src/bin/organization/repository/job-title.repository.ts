import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobTitle, JobTitleDocument } from '../entity/job-title.schema';

/**
 * Escapes user-supplied input before it is embedded in a RegExp so a job title
 * containing regex metacharacters cannot alter the match.
 */
const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class JobTitleRepository {
  constructor(
    @InjectModel(JobTitle.name)
    private readonly jobTitleModel: Model<JobTitleDocument>,
  ) {}

  /**
   * @Responsibility: Repo to retrieve all job titles belonging to an organization
   *
   * @param organizationId - Organization id to scope the query to
   * @param attributes - Optional projection string
   * @param search - Optional name search term
   * @returns {Promise<JobTitleDocument[]>}
   */
  async findByOrganization(
    organizationId: string,
    attributes: string = '',
    search: string = '',
  ): Promise<JobTitleDocument[]> {
    try {
      const query = {
        organizationId,
        ...(search && {
          $or: [{ name: new RegExp(search, 'i') }],
        }),
      };
      return await this.jobTitleModel
        .find(query)
        .select(attributes)
        .lean()
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve a single job title by its unique code within an
   * organization.
   *
   * @param organizationId - Organization id to scope the query to
   * @param code - The unique job title code to match
   * @returns {Promise<JobTitleDocument | null>}
   */
  async findByCode(
    organizationId: string,
    code: string,
  ): Promise<JobTitleDocument | null> {
    try {
      return await this.jobTitleModel
        .findOne({ organizationId, code })
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve a single job title matched by either its unique code
   * or its name (case-insensitive) within an organization.
   *
   * @param organizationId - Organization id to scope the query to
   * @param value - The job title code or name to match
   * @returns {Promise<JobTitleDocument | null>}
   */
  async findByCodeOrName(
    organizationId: string,
    value: string,
  ): Promise<JobTitleDocument | null> {
    try {
      return await this.jobTitleModel
        .findOne({
          organizationId,
          $or: [{ code: value }, { name: new RegExp(`^${escapeRegex(value)}$`, 'i') }],
        })
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve every job title of an organization that holds any of
   * the given codes, used to resolve stored codes back to display names.
   *
   * @param organizationId - Organization id to scope the query to
   * @param codes - The job title codes to match
   * @returns {Promise<JobTitleDocument[]>}
   */
  async findByCodes(
    organizationId: string,
    codes: string[],
  ): Promise<JobTitleDocument[]> {
    try {
      if (codes.length === 0) {
        return [];
      }
      return await this.jobTitleModel
        .find({ organizationId, code: { $in: codes } })
        .lean()
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Create a new job title document for an organization
   *
   * @param jobTitle - The job title document to persist
   * @returns {Promise<JobTitleDocument>}
   */
  async create(jobTitle: JobTitle): Promise<JobTitleDocument> {
    try {
      const created = await this.jobTitleModel.create(jobTitle);
      return created as JobTitleDocument;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Update a single job title matched by its unique code
   * within an organization. Only the fields present in the update are applied.
   *
   * @param organizationId - Organization id to scope the update to
   * @param code - The unique job title code to match
   * @param update - The partial update to apply
   * @returns {Promise<JobTitleDocument | null>}
   */
  async updateByCode(
    organizationId: string,
    code: string,
    update: Partial<JobTitle>,
  ): Promise<JobTitleDocument | null> {
    try {
      return await this.jobTitleModel
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
   * @Responsibility: Delete a single job title matched by the given filter
   *
   * @param where - Query filter, always scoped by organizationId by callers
   * @returns {Promise<void>}
   */
  async deleteWhere(where: {
    organizationId: string;
    code: string;
  }): Promise<void> {
    try {
      await this.jobTitleModel.findOneAndDelete(where);
    } catch (error) {
      throw error;
    }
  }
}
