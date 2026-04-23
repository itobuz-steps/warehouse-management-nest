import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Supplier } from './entities/supplier.entity';
import { SupplierDocument } from './entities/supplier.entity';
import { Model, QueryFilter, Types } from 'mongoose';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';
import { Transaction } from 'src/transaction/schemas/transaction.schema';
import { TRANSACTION_TYPES } from 'src/transaction/constants/transactionConstants';

@Injectable()
export class SupplierService {
  constructor(
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,

    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,

    private readonly logsService: TransactionLogsService,
  ) {}

  async create(supplierData: CreateSupplierDto, user: UserDocument) {
    const data = { ...supplierData };

    const existingSupplier = await this.supplierModel.findOne({
      email: data.email,
    });

    if (existingSupplier) {
      throw new ConflictException('Supplier Already Exists');
    }

    const newSupplier = await this.supplierModel.create(data);

    await this.logsService.createLog({
      action: LOG_ACTION.SUPPLIER_CREATED,
      entityType: LOG_ENTITY_TYPE.SUPPLIER,
      entityId: newSupplier._id.toHexString(),
      performedBy: user,
      metadata: {
        name: newSupplier.name,
        email: newSupplier.email,
        phoneNumber: newSupplier.phoneNumber,
        address: newSupplier.address,
        suppliedProduct: newSupplier.suppliedProduct,
        status: newSupplier.isActive ? 'Active' : 'Inactive',
      },
    });

    return newSupplier;
  }

  async update(id: string, updatedData: UpdateSupplierDto, user: UserDocument) {
    const existingSupplier = await this.supplierModel.findById(id);

    if (!existingSupplier) {
      throw new NotFoundException('Supplier Not Found');
    }

    const oldValue = {
      name: existingSupplier.name,
      email: existingSupplier.email,
      phoneNumber: existingSupplier.phoneNumber,
      address: existingSupplier.address,
      suppliedProduct: existingSupplier.suppliedProduct,
      status: existingSupplier.isActive ? 'Active' : 'Inactive',
    };

    const updatedSupplier = await this.supplierModel.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true },
    );

    if (!updatedSupplier) {
      throw new NotFoundException('Supplier Not Found After Update');
    }

    await this.logsService.createLog({
      action: LOG_ACTION.SUPPLIER_UPDATED,
      entityType: LOG_ENTITY_TYPE.SUPPLIER,
      entityId: updatedSupplier._id.toHexString(),
      performedBy: user,
      metadata: {
        oldValue,
        newValue: {
          name: updatedSupplier.name,
          email: updatedSupplier.email,
          phoneNumber: updatedSupplier.phoneNumber,
          address: updatedSupplier.address,
          suppliedProduct: updatedSupplier.suppliedProduct,
          status: updatedSupplier.isActive ? 'Active' : 'Inactive',
        },
      },
    });

    return updatedSupplier;
  }

  async delete(id: string, user: UserDocument) {
    const existingSupplier = await this.supplierModel.findById(id);

    if (!existingSupplier) {
      throw new NotFoundException('Supplier Not Found');
    }

    const deletedSupplier = await this.supplierModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!deletedSupplier) {
      throw new NotFoundException('Supplier Not Found After Deletion');
    }

    await this.logsService.createLog({
      action: LOG_ACTION.SUPPLIER_DELETED,
      entityType: LOG_ENTITY_TYPE.SUPPLIER,
      entityId: deletedSupplier._id.toHexString(),
      performedBy: user,
      metadata: {
        name: deletedSupplier.name,
        email: deletedSupplier.email,
      },
    });

    return deletedSupplier;
  }

  async getAll(search?: string) {
    const filter: QueryFilter<SupplierDocument> = {};

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        {
          suppliedProduct: {
            $elemMatch: { $regex: search, $options: 'i' },
          },
        },
      ];
    }

    return this.supplierModel.find(filter, { __v: 0 }).sort({ isActive: -1 });
  }

  async getAllPaginated(
    search?: string,
    page = 1,
    limit = 10,
    isActive?: string,
  ) {
    const filter: QueryFilter<SupplierDocument> = {};

    if (isActive) {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        {
          suppliedProduct: {
            $elemMatch: { $regex: search, $options: 'i' },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const total = await this.supplierModel.countDocuments(filter);

    const data = await this.supplierModel
      .find(filter, { __v: 0 })
      .sort({ isActive: -1 })
      .skip(skip)
      .limit(limit);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSpecificSupplier(id: string): Promise<Supplier> {
    const res = await this.supplierModel.findOne(new Types.ObjectId(id));
    if (!res) {
      throw new NotFoundException('Supplier not Found');
    }
    return res;
  }

  async getAnalytics() {
    const [statusCounts, topByStock, categoryBreakdown, productVariety] =
      await Promise.all([
        this.getStatusCounts(),
        this.getTopSuppliersByStockSupplied(),
        this.getSupplyByCategory(),
        this.getTopSuppliersByProductVariety(),
      ]);

    return {
      success: true,
      message: 'Supplier analytics retrieved successfully',
      data: { statusCounts, topByStock, categoryBreakdown, productVariety },
    };
  }

  async getStatusCounts() {
    const [total, active] = await Promise.all([
      this.supplierModel.countDocuments(),
      this.supplierModel.countDocuments({ isActive: true }),
    ]);

    return { total, active, inactive: total - active };
  }

  async getTopSuppliersByStockSupplied(limit = 5) {
    return this.transactionModel.aggregate<{
      _id: string;
      totalUnits: number;
      totalTransactions: number;
      name: string;
    }>([
      {
        $match: {
          type: TRANSACTION_TYPES.IN,
          supplier: { $exists: true, $ne: null },
        },
      },
      {
        $addFields: {
          totalQty: {
            $sum: {
              $map: {
                input: '$products',
                as: 'p',
                in: {
                  $sum: {
                    $map: {
                      input: '$$p.variants',
                      as: 'v',
                      in: { $abs: '$$v.quantity' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$supplier',
          totalUnits: { $sum: '$totalQty' },
          totalTransactions: { $sum: 1 },
        },
      },
      { $sort: { totalUnits: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo',
        },
      },
      { $unwind: '$supplierInfo' },
      {
        $project: {
          _id: 1,
          totalUnits: 1,
          totalTransactions: 1,
          name: '$supplierInfo.name',
        },
      },
    ]);
  }

  async getSupplyByCategory() {
    return this.supplierModel.aggregate<{
      category: string;
      supplierCount: number;
    }>([
      { $match: { isActive: true } },
      { $unwind: '$suppliedProduct' },
      {
        $group: {
          _id: '$suppliedProduct',
          supplierCount: { $sum: 1 },
        },
      },
      { $sort: { supplierCount: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          supplierCount: 1,
        },
      },
    ]);
  }

  async getTopSuppliersByProductVariety(limit = 5) {
    return this.supplierModel.aggregate<{
      _id: string;
      name: string;
      categoryCount: number;
      categories: string[];
    }>([
      { $match: { isActive: true } },
      {
        $project: {
          _id: 1,
          name: 1,
          categoryCount: { $size: { $ifNull: ['$suppliedProduct', []] } },
          categories: { $ifNull: ['$suppliedProduct', []] },
        },
      },
      { $sort: { categoryCount: -1 } },
      { $limit: limit },
    ]);
  }
}
