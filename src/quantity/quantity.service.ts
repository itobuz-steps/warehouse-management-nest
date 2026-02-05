// quantity.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quantity } from './entities/quantity.entity';
import { AddProductQuantityDto } from './dto/add-quantity.dto';
import { UpdateQuantityDto } from './dto/update-quantity.dto';
import { GetSpecificQuantityDto } from './dto/product-specific-quantity.dto';

export interface TotalQuantityResult {
  _id: string;
  totalQuantity: number;
}

@Injectable()
export class QuantityService {
  constructor(
    @InjectModel(Quantity.name) private quantityModel: Model<Quantity>,
  ) {}

  async create(dto: AddProductQuantityDto): Promise<Quantity> {
    const created = await this.quantityModel.create(dto);

    const res = await this.quantityModel
      .findById(created._id)
      .populate('warehouseId productId')
      .exec();

    if (!res) {
      throw new NotFoundException('Could Not found Record');
    }

    return res;
  }

  async updateLimit(id: string, dto: UpdateQuantityDto): Promise<Quantity> {
    const result = await this.quantityModel
      .findByIdAndUpdate(id, { limit: dto.limit }, { new: true })
      .populate('warehouseId productId')
      .exec();

    if (!result) {
      throw new NotFoundException('Quantity record not found');
    }

    return result;
  }

  async getTotalQuantity(productId: string): Promise<TotalQuantityResult[]> {
    return await this.quantityModel.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
        },
      },
      {
        $lookup: {
          from: 'products', // Ensure this matches your actual MongoDB collection name
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isArchived': false } },
      {
        $group: {
          _id: productId,
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);
  }

  async getSpecificWarehouseQuantity(
    query: GetSpecificQuantityDto,
  ): Promise<Quantity[]> {
    const { productId, warehouseId } = query;

    const res = await this.quantityModel
      .find({ productId, warehouseId })
      .populate({
        path: 'productId',
        match: { isArchived: false },
      })
      .populate('warehouseId')
      .exec();

    if (!res) {
      throw new NotFoundException("Couldn't Find Record");
    }
    return res;
  }
}
