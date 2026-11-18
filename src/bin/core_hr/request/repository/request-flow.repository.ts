import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RequestActivity,
  RequestActivityDocument,
  RequestCounter,
  RequestCounterDocument,
  RequestDelegation,
  RequestDelegationDocument,
  RequestDocument,
  RequestDocumentDocument,
  RequestSettings,
  RequestSettingsDocument,
  RequestTypeConfig,
  RequestTypeConfigDocument,
  RequestViewLog,
  RequestViewLogDocument,
} from '../entity/request-flow.schema';

@Injectable()
export class RequestActivityRepository {
  constructor(
    @InjectModel(RequestActivity.name)
    private readonly model: Model<RequestActivityDocument>,
  ) {}

  async create(data: Partial<RequestActivity>): Promise<RequestActivityDocument> {
    return this.model.create(data as any) as unknown as Promise<RequestActivityDocument>;
  }

  async findByRequest(
    requestId: string,
    type?: string,
  ): Promise<RequestActivityDocument[]> {
    const filter: Record<string, unknown> = { requestId };
    if (type) filter.type = type;
    return this.model
      .find(filter as any)
      .sort({ createdAt: -1 })
      .exec() as unknown as Promise<RequestActivityDocument[]>;
  }
}

@Injectable()
export class RequestDocumentRepository {
  constructor(
    @InjectModel(RequestDocument.name)
    private readonly model: Model<RequestDocumentDocument>,
  ) {}

  async create(data: Partial<RequestDocument>): Promise<RequestDocumentDocument> {
    return this.model.create(data as any) as unknown as Promise<RequestDocumentDocument>;
  }

  async findByRequest(requestId: string): Promise<RequestDocumentDocument[]> {
    return this.model.find({ requestId } as any).sort({ createdAt: -1 }).exec() as unknown as Promise<RequestDocumentDocument[]>;
  }

  async findById(documentId: string): Promise<RequestDocumentDocument | null> {
    return this.model.findById(documentId).exec() as unknown as Promise<RequestDocumentDocument | null>;
  }

  async updateById(
    documentId: string,
    data: Partial<RequestDocument>,
  ): Promise<RequestDocumentDocument | null> {
    return this.model
      .findByIdAndUpdate(documentId, { $set: data }, { new: true })
      .exec() as unknown as Promise<RequestDocumentDocument | null>;
  }
}

@Injectable()
export class RequestDelegationRepository {
  constructor(
    @InjectModel(RequestDelegation.name)
    private readonly model: Model<RequestDelegationDocument>,
  ) {}

  async create(data: Partial<RequestDelegation>): Promise<RequestDelegationDocument> {
    return this.model.create(data as any) as unknown as Promise<RequestDelegationDocument>;
  }

  async findByOrganization(
    organizationId: string,
  ): Promise<RequestDelegationDocument[]> {
    return this.model.find({ organizationId } as any).sort({ createdAt: -1 }).exec() as unknown as Promise<RequestDelegationDocument[]>;
  }

  async findActiveForUser(
    organizationId: string,
    fromUserId: string,
  ): Promise<RequestDelegationDocument | null> {
    const now = new Date();
    return this.model
      .findOne({
        organizationId,
        fromUserId,
        status: 'active',
        startsAt: { $lte: now },
        endsAt: { $gte: now },
      } as any)
      .sort({ endsAt: -1 })
      .exec() as unknown as Promise<RequestDelegationDocument | null>;
  }

  async findById(
    delegationId: string,
  ): Promise<RequestDelegationDocument | null> {
    return this.model.findById(delegationId).exec() as unknown as Promise<RequestDelegationDocument | null>;
  }

  async updateById(
    delegationId: string,
    data: Partial<RequestDelegation>,
  ): Promise<RequestDelegationDocument | null> {
    return this.model
      .findByIdAndUpdate(delegationId, { $set: data }, { new: true })
      .exec() as unknown as Promise<RequestDelegationDocument | null>;
  }

  async deleteById(delegationId: string): Promise<void> {
    await this.model.findByIdAndDelete(delegationId).exec();
  }
}

@Injectable()
export class RequestViewLogRepository {
  constructor(
    @InjectModel(RequestViewLog.name)
    private readonly model: Model<RequestViewLogDocument>,
  ) {}

  async create(data: Partial<RequestViewLog>): Promise<RequestViewLogDocument> {
    return this.model.create(data as any) as unknown as Promise<RequestViewLogDocument>;
  }

  async findByRequest(
    requestId: string,
  ): Promise<RequestViewLogDocument[]> {
    return this.model
      .find({ requestId } as any)
      .sort({ createdAt: -1 })
      .exec() as unknown as Promise<RequestViewLogDocument[]>;
  }
}

@Injectable()
export class RequestTypeConfigRepository {
  constructor(
    @InjectModel(RequestTypeConfig.name)
    private readonly model: Model<RequestTypeConfigDocument>,
  ) {}

  async findByOrganization(
    organizationId: string,
  ): Promise<RequestTypeConfigDocument[]> {
    return this.model.find({ organizationId } as any).sort({ type: 1 }).exec() as unknown as Promise<RequestTypeConfigDocument[]>;
  }

  async findByType(
    organizationId: string,
    type: string,
  ): Promise<RequestTypeConfigDocument | null> {
    return this.model.findOne({ organizationId, type } as any).exec() as unknown as Promise<RequestTypeConfigDocument | null>;
  }

  async upsert(
    organizationId: string,
    type: string,
    data: Partial<RequestTypeConfig>,
  ): Promise<RequestTypeConfigDocument> {
    return this.model
      .findOneAndUpdate(
        { organizationId, type } as any,
        { $set: data, $setOnInsert: { organizationId, type } },
        { new: true, upsert: true },
      )
      .exec() as unknown as Promise<RequestTypeConfigDocument>;
  }

  async deleteByType(organizationId: string, type: string): Promise<void> {
    await this.model.deleteOne({ organizationId, type } as any).exec();
  }
}

@Injectable()
export class RequestSettingsRepository {
  constructor(
    @InjectModel(RequestSettings.name)
    private readonly model: Model<RequestSettingsDocument>,
  ) {}

  async ensure(organizationId: string): Promise<RequestSettingsDocument> {
    const existing = await this.model.findOne({ organizationId } as any).exec();
    if (existing) return existing as unknown as RequestSettingsDocument;
    return this.model.create({ organizationId }) as unknown as Promise<RequestSettingsDocument>;
  }

  async update(
    organizationId: string,
    data: Record<string, unknown>,
  ): Promise<RequestSettingsDocument> {
    return this.model
      .findOneAndUpdate(
        { organizationId } as any,
        { $set: data },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec() as unknown as Promise<RequestSettingsDocument>;
  }
}

@Injectable()
export class RequestCounterRepository {
  constructor(
    @InjectModel(RequestCounter.name)
    private readonly model: Model<RequestCounterDocument>,
  ) {}

  async next(organizationId: string, prefix = 'RQ'): Promise<string> {
    const counter = (await this.model
      .findOneAndUpdate(
        { organizationId, prefix } as any,
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec()) as RequestCounterDocument | null;

    return `${prefix}-${String(counter?.sequence ?? 1).padStart(3, '0')}`;
  }
}
