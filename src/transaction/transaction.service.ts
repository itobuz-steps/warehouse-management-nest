import {
  BadRequestException,
  Injectable,
  // BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Transaction } from './schemas/transaction.schema';
// import { StockInDto } from './dto/stock-in.dto';
// import { Quantity } from '../quantity/schemas/quantity.schema';
import { Warehouse } from '../warehouse/schemas/warehouse.schema';
// import { TRANSACTION_TYPES } from './constants/transactionConstants';
import { USER_TYPES } from 'src/auth/userType';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { WarehouseTransactionsQueryDto } from './dto/query/warehouse-transactions.query.dto';
import { GetTransactionsQueryDto } from './dto/query/get-transactions.query.dto';
// import Notification from '../utils/Notification';
import type { QueryFilter } from 'mongoose';
import { PdfService } from './services/pdf.service';
import { PopulatedTransaction } from './types/types';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,

    // @InjectModel(Quantity.name)
    // private readonly quantityModel: Model<Quantity>,

    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<Warehouse>,

    @InjectConnection()
    private readonly connection: Connection,

    // private readonly notification: Notification,

    private readonly pdfService: PdfService,
  ) {}

  async getTransactions(query: GetTransactionsQueryDto, user: UserDocument) {
    const { startDate, endDate, type, status, page = 1, limit = 10 } = query;

    const match: QueryFilter<Transaction> = {};

    if (startDate || endDate) {
      match.createdAt = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && {
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        }),
      };
    }

    if (type && type !== 'ALL') match.type = type;
    if (status && status !== 'ALL') match.shipment = status;

    if (user.role === USER_TYPES.MANAGER) {
      const warehouses = await this.warehouseModel
        .find({ managerIds: user._id })
        .select('_id');

      const ids = warehouses.map((w) => w._id);

      match.$or = [
        { sourceWarehouse: { $in: ids } },
        { destinationWarehouse: { $in: ids } },
      ];
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(match)
        .populate('product performedBy sourceWarehouse destinationWarehouse')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      this.transactionModel.countDocuments(match),
    ]);

    return {
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getWarehouseTransactions(
    warehouseId: string,
    query: WarehouseTransactionsQueryDto,
  ) {
    const { startDate, endDate, type, status, page = 1, limit = 10 } = query;

    const warehouseObjectId = new Types.ObjectId(warehouseId);

    const filter: QueryFilter<Transaction> = {
      $or: [
        { sourceWarehouse: warehouseObjectId },
        { destinationWarehouse: warehouseObjectId },
      ],
    };

    if (startDate || endDate) {
      filter.createdAt = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && {
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        }),
      };
    }

    if (type && type !== 'ALL') filter.type = type;
    if (status && status !== 'ALL') filter.shipment = status;

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .populate('product performedBy sourceWarehouse destinationWarehouse')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      this.transactionModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  // async createStockIn(dto: StockInDto, userId: string) {
  //   const session = await this.connection.startSession();
  //   session.startTransaction();

  //   try {
  //     const transactions = [];

  //     // for (const item of dto.products) {
  //     //   const quantityRecord =
  //     //     (await this.quantityModel.findOne({
  //     //       warehouseId: dto.destinationWarehouse,
  //     //       productId: item.productId,
  //     //     })) ??
  //     //     new this.quantityModel({
  //     //       warehouseId: dto.destinationWarehouse,
  //     //       productId: item.productId,
  //     //       quantity: 0,
  //     //       limit: item.limit,
  //     //     });

  //     //   quantityRecord.quantity += item.quantity;
  //     //   await quantityRecord.save({ session });

  //     //   const tx = await this.transactionModel.create(
  //     //     [
  //     //       {
  //     //         type: TRANSACTION_TYPES.IN,
  //     //         product: item.productId,
  //     //         quantity: item.quantity,
  //     //         supplier: dto.supplier,
  //     //         destinationWarehouse: dto.destinationWarehouse,
  //     //         notes: dto.notes,
  //     //         performedBy: userId,
  //     //       },
  //     //     ],
  //     //     { session },
  //     //   );

  //     //   transactions.push(tx[0]);
  //     // }

  //     await session.commitTransaction();

  //     const promises: Promise<void>[] = [];

  //     // for (const tx of transactions) {
  //     //   const notificationPromise = this.notification.notifyTransaction(
  //     //     tx.product,
  //     //     tx.destinationWarehouse,
  //     //     tx._id.toString(),
  //     //     tx.quantity,
  //     //     'STOCK_IN',
  //     //     userId,
  //     //   );
  //     // promises.push(notificationPromise);
  //     // }

  //     Promise.all(promises).catch(() =>
  //       console.error('Failed to send notification'),
  //     );

  //     return {
  //       success: true,
  //       message: 'Stock-in transactions created successfully',
  //       data: transactions,
  //     };
  //   } catch (e) {
  //     await session.abortTransaction();
  //     throw e;
  //   } finally {
  //     await session.endSession();
  //   }
  // }

  async generateInvoice(id: string) {
    const transaction = await this.transactionModel
      .findById(id)
      .populate<PopulatedTransaction>('product performedBy sourceWarehouse');

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (!transaction.product) {
      throw new BadRequestException('Product not found for transaction');
    }

    const pdf = await this.pdfService.generateTransactionPdf(transaction);

    return {
      file: Buffer.from(pdf),
      contentType: 'application/pdf',
      fileName: `invoice-${transaction._id.toString()}.pdf`,
    };
  }
}
