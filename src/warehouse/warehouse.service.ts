import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose'; //Types
import { Warehouse, WarehouseDocument } from './schemas/warehouse.schema';
import { USER_TYPES } from 'src/auth/userType';
// import Quantity from '../models/quantityModel'; // TEMP: will be injected later
import User from './types/userType';
import mongoose from 'mongoose';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
  ) {}

  async getWarehouses(user: User) {
    if (user.role === USER_TYPES.MANAGER) {
      const warehouses = await this.warehouseModel
        .find({
          managerIds: user._id,
          active: true,
        })
        .populate('managerIds', 'name email role');

      return { success: true, data: warehouses };
    }

    if (user.role === USER_TYPES.ADMIN) {
      const warehouses = await this.warehouseModel
        .find({ active: true })
        .populate('managerIds', 'name email role');

      return {
        message: 'All Warehouses',
        success: true,
        data: warehouses,
      };
    }

    throw new ForbiddenException('User role not allowed to fetch warehouses');
  }

  async getWarehouseById(warehouseId: string, user: User) {
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

      return {
        success: true,
        data: {
          manager: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          warehouse,
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

  async getWarehouseCapacity(warehouseId: string, user: User) {
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

    // const totalAgg = await Quantity.aggregate<{ totalQuantity: number }>([
    //   { $match: { warehouseId: new Types.ObjectId(warehouse._id) } },
    //   {
    //     $group: {
    //       _id: null,
    //       totalQuantity: { $sum: '$quantity' },
    //     },
    //   },
    // ]);

    // const totalQuantity = totalAgg[0]?.totalQuantity ?? 0;
    const capacity = warehouse.capacity || 0;

    // let percentage: number | null = null;
    // if (capacity > 0) {
    //   percentage = Number(((totalQuantity / capacity) * 100).toFixed(2));
    // }

    return {
      success: true,
      data: {
        warehouse: {
          id: warehouse._id,
          name: warehouse.name,
          capacity,
        },
        // totalQuantity,
        // percentage,
      },
    };
  }

  async addWarehouse(dto: CreateWarehouseDto) {
    const managerIds = dto.managers?.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    return this.warehouseModel.create({
      ...dto,
      managerIds,
    });
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    const managerIds = dto.managers?.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const warehouse = await this.warehouseModel.findByIdAndUpdate(
      id,
      { ...dto, managerIds },
      { new: true },
    );

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return warehouse;
  }

  async deleteWarehouse(id: string) {
    const warehouse = await this.warehouseModel.findOneAndUpdate(
      { _id: id, active: true },
      { active: false },
    );

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
  }
}
