import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { AddWarehouseDto } from './dto/add-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { USER_TYPES } from 'src/auth/userType';
import { Warehouse } from 'src/warehouse/schemas/warehouse.schema';
import { User } from 'src/auth/entities/auth.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<Warehouse>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async addWarehouse(dto: AddWarehouseDto) {
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

  async removeWarehouse(id: string) {
    const warehouse = await this.warehouseModel.findOneAndUpdate(
      { _id: id, active: true },
      { active: false },
    );

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
  }

  async getManagers() {
    return this.userModel.find({
      role: USER_TYPES.MANAGER,
      isVerified: true,
      isDeleted: false,
    });
  }
}
