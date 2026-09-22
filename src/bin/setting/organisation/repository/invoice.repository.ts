import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from '../entity/invoice.schema';

@Injectable()
export class InvoiceRepository {
  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  /**
   * @Responsibility: Repo to retrieve an organization's invoices, optionally
   * filtered by a search term against the invoice number, plan name and
   * billing date. Invoices are returned most recent billing date first.
   *
   * @param organizationId - Organization id to scope the query to
   * @param search - Optional search term
   * @returns {Promise<InvoiceDocument[]>}
   */
  async findByOrganization(
    organizationId: string,
    search: string = '',
  ): Promise<InvoiceDocument[]> {
    try {
      const query = {
        organizationId,
        ...(search && {
          $or: [
            { invoiceNumber: new RegExp(search, 'i') },
            { planName: new RegExp(search, 'i') },
            { billingDate: new RegExp(search, 'i') },
          ],
        }),
      };
      return await this.invoiceModel
        .find(query)
        .sort({ billingDate: -1 })
        .lean()
        .exec();
    } catch (error) {
      throw error;
    }
  }
}