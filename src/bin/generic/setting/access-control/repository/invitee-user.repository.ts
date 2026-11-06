import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../auth/entity/user.schema';

@Injectable()
export class InviteeUserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * @Responsibility: Repo to resolve users by their emails for role-creation invites
   *
   * @param emails - The invitee email addresses to look up
   * @returns {Promise<UserDocument[]>}
   */
  async findByEmails(emails: string[]): Promise<UserDocument[]> {
    try {
      return await this.userModel
        .find({ email: { $in: emails } })
        .select('firstName lastName email _id');
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to resolve users by their ids for a single email
   * , firstName and lastName projection, used to enrich company admin listings
   *
   * @param userIds - The user ids to look up
   * @returns {Promise<UserDocument[]>}
   */
  async findByIds(userIds: string[]): Promise<UserDocument[]> {
    try {
      if (userIds.length === 0) {
        return [];
      }
      return await this.userModel
        .find({ _id: { $in: userIds } })
        .select('firstName lastName email _id');
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to resolve the ids of users whose first name, last name or
   * email matches a free-text term. The User collection carries no organizationId,
   * so the result is a candidate set that callers intersect with their own
   * organization scope.
   *
   * @param term - The search term
   * @returns {Promise<string[]>}
   */
  async findIdsBySearchTerm(term: string): Promise<string[]> {
    try {
      const regex = new RegExp(
        term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      const users = await this.userModel
        .find({
          $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
        })
        .select('_id')
        .lean()
        .exec();

      return users.map((user) => String(user._id));
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo to persist a placeholder auth account for an invited
   * company admin. The password is an unusable random token hash; the account is
   * only usable once the invitee completes the frontend invite flow.
   *
   * @param data - The user fields to save
   * @returns {Promise<UserDocument>}
   */
  async create(data: Partial<User>): Promise<UserDocument> {
    try {
      return await this.userModel.create(data);
    } catch (error) {
      throw error;
    }
  }
}
