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
}