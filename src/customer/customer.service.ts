import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer, CustomerDocument } from './entities/customer.entity';
import { Model, QueryFilter } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';
import { Transaction } from 'src/transaction/schemas/transaction.schema';
import { TRANSACTION_TYPES } from 'src/transaction/constants/transactionConstants';
// import { SHIPMENT_TYPES } from 'src/transaction/constants/shipmentConstants';

@Injectable()
export class CustomerService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<Transaction>,
    private readonly logsService: TransactionLogsService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, user: UserDocument) {
    const customer = await this.customerModel.create(createCustomerDto);

    await this.logsService.createLog({
      action: LOG_ACTION.CUSTOMER_CREATED,
      entityType: LOG_ENTITY_TYPE.CUSTOMER,
      entityId: customer._id.toHexString(),
      performedBy: user,
      metadata: {
        name: customer.name as string,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        address: customer.address,
      },
    });

    return customer;
  }

  async findAll(query?: string) {
    const filter: QueryFilter<CustomerDocument> = {};

    if (query) {
      const searchConditions: QueryFilter<CustomerDocument>[] = [
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { address: { $regex: query, $options: 'i' } },
      ];

      const lowerQuery = query.toLowerCase();

      if (lowerQuery === 'active') {
        searchConditions.push({ isActive: true });
      } else if (lowerQuery === 'inactive') {
        searchConditions.push({ isActive: false });
      }

      filter.$or = searchConditions;
    }

    return await this.customerModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    return await this.customerModel.findOne({ _id: id, isActive: true }).exec();
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    user: UserDocument,
  ) {
    const existingCustomer = await this.customerModel.findOne({
      _id: id,
    });

    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    const oldValue = {
      name: existingCustomer.name,
      email: existingCustomer.email,
      phoneNumber: existingCustomer.phoneNumber,
    };

    const updatedCustomer = await this.customerModel.findByIdAndUpdate(
      id,
      updateCustomerDto,
      { new: true },
    );

    if (!updatedCustomer) {
      throw new NotFoundException('Customer not found');
    }

    const newValue = {
      name: updatedCustomer.name,
      email: updatedCustomer.email,
      phoneNumber: updatedCustomer.phoneNumber,
    };

    await this.logsService.createLog({
      action: LOG_ACTION.CUSTOMER_UPDATED,
      entityType: LOG_ENTITY_TYPE.CUSTOMER,
      entityId: updatedCustomer._id.toHexString(),
      performedBy: user,
      metadata: {
        oldValue,
        newValue,
      },
    });
    return updatedCustomer;
  }

  async remove(id: string, user: UserDocument) {
    const deletedCustomer = await this.customerModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!deletedCustomer) {
      throw new NotFoundException('Customer not found');
    }

    await this.logsService.createLog({
      action: LOG_ACTION.CUSTOMER_DELETED,
      entityType: LOG_ENTITY_TYPE.CUSTOMER,
      entityId: deletedCustomer._id.toHexString(),
      performedBy: user,
      metadata: {
        name: deletedCustomer.name as string,
        email: deletedCustomer.email,
      },
    });

    return deletedCustomer;
  }

  async getAnalytics() {
    const [statusCounts, topCustomers, growth, avgOrderValue] =
      await Promise.all([
        this.getStatusCounts(),
        this.getTopCustomersByOrderValue(),
        this.getNewCustomerGrowth(),
        this.getAvgOrderValuePerCustomer(),
      ]);

    return {
      success: true,
      message: 'Customer analytics retrieved successfully',
      data: {
        statusCounts,
        topCustomers,
        growth,
        avgOrderValue,
      },
    };
  }

  async getStatusCounts() {
    const [total, active] = await Promise.all([
      this.customerModel.countDocuments(),
      this.customerModel.countDocuments({ isActive: true }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
    };
  }

  private async getTopCustomersByOrderValue(limit = 5) {
    return this.transactionModel.aggregate<{
      _id: string;
      totalOrderValue: number;
      totalOrders: number;
      name: string;
      email: string;
    }>([
      {
        $match: {
          type: TRANSACTION_TYPES.OUT,
          customer: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$customer',
          totalOrderValue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalOrderValue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo',
        },
      },
      { $unwind: '$customerInfo' },
      {
        $project: {
          _id: 1,
          totalOrderValue: 1,
          totalOrders: 1,
          name: '$customerInfo.name',
          email: '$customerInfo.email',
        },
      },
    ]);
  }

  private async getNewCustomerGrowth(months = 6) {
    const from = new Date();
    from.setMonth(from.getMonth() - months + 1);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);

    const results = await this.customerModel.aggregate<{
      year: number;
      month: number;
      count: number;
    }>([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
        },
      },
    ]);

    // Fill any missing months with 0 so the chart has a continuous axis
    const filled: { year: number; month: number; count: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = results.find((r) => r.year === year && r.month === month);
      filled.push({ year, month, count: found?.count ?? 0 });
    }

    return filled;
  }

  private async getAvgOrderValuePerCustomer(limit = 4) {
    return this.transactionModel.aggregate<{
      _id: string;
      avgOrderValue: number;
      totalOrders: number;
      name: string;
      email: string;
    }>([
      {
        $match: {
          type: TRANSACTION_TYPES.OUT,
          customer: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$customer',
          avgOrderValue: { $avg: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
      {
        // Coalesce null (empty group) to 0 and round to nearest integer
        $addFields: {
          avgOrderValue: {
            $round: [{ $ifNull: ['$avgOrderValue', 0] }, 0],
          },
        },
      },
      { $sort: { avgOrderValue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo',
        },
      },
      { $unwind: '$customerInfo' },
      {
        $project: {
          _id: 1,
          avgOrderValue: 1,
          totalOrders: 1,
          name: '$customerInfo.name',
          email: '$customerInfo.email',
        },
      },
    ]);
  }
}
