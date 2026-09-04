import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../entity/user.schema';
import { PropDataInput } from '../../../common/util/util.interface';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * @Responsibility: Repo to retrieve user detail
   *
   * @param where
   * @returns {Promise<UserDocument>}
   */

  async findUser(
    where: PropDataInput,
    attributes: string = '',
  ): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOne(where).select(attributes);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: dedicated data access for creating a user
   *
   * @param data
   * @returns {Promise<UserDocument>}
   */
  async createUser(data: Partial<User>): Promise<UserDocument> {
    try {
      return this.userModel.create(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: Repo for updating a user
   *
   * @param where
   * @param data
   * @returns {Promise<UserDocument>}
   */

  async updateUser(
    where: PropDataInput,
    data: any,
  ): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOneAndUpdate(
        where,
        { $set: data },
        { new: true },
      );
    } catch (error) {
      throw error;
    }
  }
}
