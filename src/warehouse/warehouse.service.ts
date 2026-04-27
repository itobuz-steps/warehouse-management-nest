import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Warehouse, WarehouseDocument } from './schemas/warehouse.schema';
import { USER_TYPES } from 'src/auth/userType';
import mongoose from 'mongoose';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { Quantity } from 'src/quantity/entities/quantity.entity';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';
import { User, UserDocument } from 'src/auth/entities/auth.entity';
import { StorageService } from 'src/storage/storage.service';
import {
  CapacityAggResult,
  HealthAggResult,
  PopulatedManager,
} from './types/userType';
import { Transaction } from 'src/transaction/schemas/transaction.schema';
import { NOTIFICATION_TYPES } from 'src/notification/notificationTypes';
import { Notification } from 'src/notification/entities/notification.entity';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<
      WarehouseDocument & { warehouseImageUrl?: string }
    >,

    @InjectModel(Quantity.name)
    private readonly quantityModel: Model<Quantity>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,

    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,

    private readonly logService: TransactionLogsService,

    private readonly storageService: StorageService,
  ) {}

  async getWarehouses(user: UserDocument) {
    if (user.role !== USER_TYPES.MANAGER && user.role !== USER_TYPES.ADMIN) {
      throw new ForbiddenException('User role not allowed to fetch warehouses');
    }

    const filter =
      user.role === USER_TYPES.MANAGER
        ? { managerIds: user._id, active: true }
        : { active: true };

    const warehouses = await this.warehouseModel
      .find(filter)
      .populate<{
        managerIds: PopulatedManager[];
      }>('managerIds', 'name email role profileImageKey')
      .lean();

    await Promise.all(
      warehouses.map(async (warehouse) => {
        if (warehouse.warehouseImageKey) {
          warehouse.warehouseImageUrl =
            await this.storageService.getPresignedSignedUrl(
              warehouse.warehouseImageKey,
            );
        }

        await Promise.all(
          warehouse.managerIds.map(async (manager) => {
            manager.profileImage = manager.profileImageKey
              ? await this.storageService.getPresignedSignedUrl(
                  manager.profileImageKey,
                )
              : undefined;
          }),
        );
      }),
    );

    return {
      success: true,
      message:
        user.role === USER_TYPES.MANAGER
          ? 'Assigned Warehouses'
          : 'All Warehouses',
      data: warehouses,
    };
  }

  async getWarehouseById(warehouseId: string, user: UserDocument) {
    let warehouse: WarehouseDocument | null = null;

    if (user.role === USER_TYPES.MANAGER) {
      warehouse = await this.warehouseModel
        .findOne({
          _id: warehouseId.trim(),
          managerIds: user._id,
        })
        .populate('managerIds', 'name email role');

      if (!warehouse) {
        throw new NotFoundException(
          'Warehouse not found or not assigned to this manager',
        );
      }

      let imageUrl: string | null = null;

      if (warehouse.warehouseImageKey) {
        imageUrl = await this.storageService.getPresignedSignedUrl(
          warehouse.warehouseImageKey,
        );
      }

      return {
        success: true,
        message: 'Warehouse Details',
        data: {
          manager: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          warehouse,
          imageUrl,
        },
      };
    }

    warehouse = await this.warehouseModel
      .findById(warehouseId.trim())
      .populate('managerIds', 'name email role');

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return {
      message: 'Warehouse Details',
      success: true,
      data: warehouse,
    };
  }

  async getWarehouseCapacity(warehouseId: string, user: UserDocument) {
    let warehouse: WarehouseDocument | null = null;

    if (user.role === USER_TYPES.MANAGER) {
      warehouse = await this.warehouseModel.findOne({
        _id: warehouseId.trim(),
        managerIds: user._id,
      });
    } else {
      warehouse = await this.warehouseModel.findById(warehouseId.trim());
    }

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const totalAgg = await this.quantityModel.aggregate<{
      totalQuantity: number;
    }>([
      { $match: { warehouseId: warehouse._id } },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    const totalQuantity = totalAgg[0]?.totalQuantity ?? 0;
    const capacity = warehouse.capacity || 0;

    let percentage: number | null = null;
    if (capacity) {
      percentage = Number(((totalQuantity / capacity) * 100).toFixed(2));
    }

    return {
      success: true,
      message: 'Warehouse Capacity Details',
      data: {
        warehouse: {
          id: warehouse._id,
          name: warehouse.name,
          capacity,
        },
        totalQuantity,
        percentage,
      },
    };
  }

  async addWarehouse(
    dto: CreateWarehouseDto,
    imageKey: string | null,
    user: UserDocument,
  ) {
    const managerIds =
      dto.managers?.map((id) => new mongoose.Types.ObjectId(id)) ?? [];

    const managers = await this.userModel
      .find({ _id: { $in: managerIds } })
      .select('_id name email')
      .lean();

    const warehouse = await this.warehouseModel.create({
      ...dto,
      warehouseImageKey: imageKey,
      managerIds,
    });

    await this.logService.createLog({
      action: LOG_ACTION.WAREHOUSE_CREATED,
      entityType: LOG_ENTITY_TYPE.WAREHOUSE,
      entityId: warehouse._id.toHexString(),
      performedBy: user,
      metadata: {
        name: warehouse.name,
        address: warehouse.address,
        capacity: warehouse.capacity,
        active: warehouse.active,
        managers: managers.map((m) => ({
          userId: m._id,
          name: m.name as string,
        })),
        maxTransactionPriceLimit: warehouse.maxTransactionPriceLimit,
        warehouseImage: warehouse.warehouseImageKey,
      },
    });

    return {
      success: true,
      message: 'Warehouses Created Successfully',
      data: warehouse,
    };
  }

  async updateWarehouse(
    id: string,
    dto: UpdateWarehouseDto,
    imageKey: string | null,
    user: UserDocument,
  ) {
    const managerIds: Types.ObjectId[] =
      dto.managers?.map((id) => new Types.ObjectId(id)) ?? [];

    const oldWarehouse = await this.warehouseModel.findById(id).lean();

    if (!oldWarehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const oldManagers = oldWarehouse.managerIds?.length
      ? await this.userModel
          .find({ _id: { $in: oldWarehouse.managerIds } })
          .select('_id name email')
          .lean()
      : [];

    const newManagers = managerIds.length
      ? await this.userModel
          .find({ _id: { $in: managerIds } })
          .select('_id name email')
          .lean()
      : [];

    if (!imageKey) {
      const existing = await this.warehouseModel.findById(
        new Types.ObjectId(id),
      );

      imageKey = existing?.warehouseImageKey || null;
    }

    const updatedWarehouse = await this.warehouseModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        warehouseImageKey: imageKey,
        managerIds,
      },
      { new: true },
    );

    if (!updatedWarehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    await this.logService.createLog({
      action: LOG_ACTION.WAREHOUSE_UPDATED,
      entityType: LOG_ENTITY_TYPE.WAREHOUSE,
      entityId: id,
      performedBy: user,
      metadata: {
        oldValue: {
          name: oldWarehouse.name,
          address: oldWarehouse.address,
          capacity: oldWarehouse.capacity,
          active: oldWarehouse.active,
          maxTransactionPriceLimit: oldWarehouse.maxTransactionPriceLimit,
          managers: oldManagers.map((m) => ({
            userId: m._id,
            name: m.name as string,
            email: m.email,
          })),
          warehouseImage: oldWarehouse.warehouseImageKey,
        },
        newValue: {
          name: updatedWarehouse.name,
          address: updatedWarehouse.address,
          capacity: updatedWarehouse.capacity,
          active: updatedWarehouse.active,
          maxTransactionPriceLimit: updatedWarehouse.maxTransactionPriceLimit,
          managers: newManagers.map((m) => ({
            userId: m._id,
            name: m.name as string,
            email: m.email,
          })),
          warehouseImage: updatedWarehouse.warehouseImageKey,
        },
      },
    });

    return {
      success: true,
      message: 'Warehouse Updated Successfully',
      data: updatedWarehouse,
    };
  }

  async deleteWarehouse(id: string, user: UserDocument) {
    const warehouse = await this.warehouseModel.findById(id).lean();

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    await this.warehouseModel.findByIdAndUpdate(
      id,
      {
        active: false,
      },
      {
        new: true,
      },
    );

    await this.logService.createLog({
      action: LOG_ACTION.WAREHOUSE_DELETED,
      entityType: LOG_ENTITY_TYPE.WAREHOUSE,
      entityId: id,
      performedBy: user,
      metadata: {
        name: warehouse.name,
        description: warehouse.description,
        active: !warehouse.active,
        address: warehouse.address,
        maxTransactionPriceLimit: warehouse.maxTransactionPriceLimit,
        warehouseImage: warehouse.warehouseImageKey,
      },
    });

    return {
      success: true,
      message: 'Warehouse Deleted Successfully',
    };
  }

  async getWarehouseCapacityComparison(user: UserDocument) {
    if (user.role !== USER_TYPES.MANAGER && user.role !== USER_TYPES.ADMIN) {
      throw new ForbiddenException('User role not allowed');
    }

    const warehouseFilter =
      user.role === USER_TYPES.MANAGER
        ? { managerIds: user._id, active: true }
        : { active: true };

    const allowedWarehouses = await this.warehouseModel
      .find(warehouseFilter, '_id')
      .lean();

    const allowedIds = allowedWarehouses.map((w) => w._id);

    const data = await this.quantityModel.aggregate<CapacityAggResult>([
      {
        $match: {
          warehouseId: { $in: allowedIds },
        },
      },
      {
        $group: {
          _id: '$warehouseId',
          totalQuantity: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      { $unwind: '$warehouse' },
      {
        $project: {
          warehouseId: '$_id',
          warehouseName: '$warehouse.name',
          capacity: '$warehouse.capacity',
          used: '$totalQuantity',
        },
      },
    ]);

    return data
      .map((w) => {
        const percentage = w.capacity
          ? Number(((w.used / w.capacity) * 100).toFixed(2))
          : 0;

        return {
          warehouseId: w.warehouseId,
          warehouseName: w.warehouseName,
          capacity: w.capacity,
          used: w.used,
          percentage,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }

  async getWarehouseHealthComparison(
    query: { days?: number; startDate?: string; endDate?: string },
    user: UserDocument,
  ) {
    if (user.role !== USER_TYPES.MANAGER && user.role !== USER_TYPES.ADMIN) {
      throw new ForbiddenException('User role not allowed');
    }

    const { days = 7, startDate, endDate } = query;

    const since = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(new Date().getDate() - days));

    const until = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : new Date();

    const warehouseFilter =
      user.role === USER_TYPES.MANAGER
        ? { managerIds: user._id, active: true }
        : { active: true };

    const allowedWarehouses = await this.warehouseModel
      .find(warehouseFilter, '_id')
      .lean();

    const allowedIds = allowedWarehouses.map((w) => w._id);

    const data = await this.transactionModel.aggregate<HealthAggResult>([
      {
        $match: {
          createdAt: { $gte: since, $lte: until },
          $or: [
            { sourceWarehouse: { $in: allowedIds } },
            { destinationWarehouse: { $in: allowedIds } },
          ],
        },
      },
      {
        $project: {
          warehouses: ['$sourceWarehouse', '$destinationWarehouse'],
          type: 1,
          shipment: 1,
          approvalStatus: 1,
        },
      },
      { $unwind: '$warehouses' },
      {
        $match: {
          warehouses: { $ne: null, $in: allowedIds },
        },
      },
      {
        $group: {
          _id: '$warehouses',
          total: { $sum: 1 },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$shipment', 'CANCELLED'] }, 1, 0] },
          },
          returned: {
            $sum: { $cond: [{ $eq: ['$shipment', 'RETURNED'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$approvalStatus', 'REJECTED'] }, 1, 0] },
          },
          adjustments: {
            $sum: { $cond: [{ $eq: ['$type', 'ADJUSTMENT'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'notifications',
          let: { warehouseId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$warehouse', '$$warehouseId'] },
                type: NOTIFICATION_TYPES.LOW_STOCK,
                createdAt: { $gte: since, $lte: until },
              },
            },
            { $count: 'count' },
          ],
          as: 'lowStockData',
        },
      },
      {
        $addFields: {
          lowStock: {
            $ifNull: [{ $arrayElemAt: ['$lowStockData.count', 0] }, 0],
          },
        },
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      { $unwind: '$warehouse' },
    ]);

    const lowStockCounts = await this.notificationModel.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      {
        $match: {
          type: NOTIFICATION_TYPES.LOW_STOCK,
          warehouse: { $in: allowedIds },
          createdAt: { $gte: since, $lte: until },
        },
      },
      {
        $group: {
          _id: '$warehouse',
          count: { $sum: 1 },
        },
      },
    ]);

    const lowStockMap = new Map<string, number>(
      lowStockCounts.map((x) => [x._id.toString(), x.count]),
    );

    const clamp = (v: number) => Math.min(1, Math.max(0, v));

    return data
      .map((w) => {
        const total = w.total || 1;
        const lowStock = lowStockMap.get(w._id.toString()) ?? 0;

        const cancelRate = clamp(w.cancelled / total);
        const returnRate = clamp(w.returned / total);
        const rejectionRate = clamp(w.rejected / total);
        const adjustmentRate = clamp(w.adjustments / total);
        const lowStockRate = clamp(lowStock / total);

        const score =
          100 -
          returnRate * 20 -
          cancelRate * 20 -
          rejectionRate * 20 -
          adjustmentRate * 20 -
          lowStockRate * 20;

        return {
          warehouseId: w._id,
          warehouseName: w.warehouse.name,
          score: Math.max(0, Math.round(score)),
          breakdown: {
            cancelRate,
            returnRate,
            rejectionRate,
            adjustmentRate,
          },
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
