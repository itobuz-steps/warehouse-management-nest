import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  VariantStock,
  VariantStockDocument,
} from './schemas/variant-stock.schema';

@Injectable()
export class VariantStockService {
  constructor(
    @InjectModel(VariantStock.name)
    private readonly variantStockModel: Model<VariantStockDocument>,
  ) {}

  async validateStock(
    variant: Types.ObjectId,
    warehouse: Types.ObjectId,
    quantity: number,
  ) {
    const record = await this.variantStockModel.findOne({
      variant,
      warehouse,
    });

    if (!record || record.quantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    return true;
  }

  async increaseStock(
    variant: Types.ObjectId,
    warehouse: Types.ObjectId,
    quantity: number,
    session?: ClientSession,
  ) {
    await this.variantStockModel.updateOne(
      { variant, warehouse },
      { $inc: { stock: quantity } },
      { upsert: true, session },
    );
  }

  async decreaseStock(
    variant: Types.ObjectId,
    warehouse: Types.ObjectId,
    quantity: number,
    session?: ClientSession,
  ) {
    const record = await this.variantStockModel.findOne(
      { variant, warehouse },
      null,
      { session },
    );

    if (!record || record.quantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    await this.variantStockModel.updateOne(
      { variant, warehouse },
      { $inc: { stock: -quantity } },
      { session },
    );
  }

  async bulkIncrease(
    operations: {
      variant: Types.ObjectId;
      warehouse: Types.ObjectId;
      quantity: number;
    }[],
    session?: ClientSession,
  ) {
    if (!operations.length) return;

    await this.variantStockModel.bulkWrite(
      operations.map((op) => ({
        updateOne: {
          filter: {
            variant: op.variant,
            warehouse: op.warehouse,
          },
          update: { $inc: { stock: op.quantity } },
          upsert: true,
        },
      })),
      { session },
    );
  }

  async bulkDecrease(
    operations: {
      variant: Types.ObjectId;
      warehouse: Types.ObjectId;
      quantity: number;
    }[],
    session?: ClientSession,
  ) {
    if (!operations.length) return;

    const warehouse = operations[0].warehouse;

    const records = await this.variantStockModel.find({
      variant: { $in: operations.map((o) => o.variant) },
      warehouse,
    });

    const stockMap = new Map(
      records.map((r) => [r.variantId.toString(), r.quantity]),
    );

    for (const op of operations) {
      const current = stockMap.get(op.variant.toString());
      if (!current || current < op.quantity) {
        throw new BadRequestException(
          `Insufficient stock for variant ${op.variant.toString()}`,
        );
      }
    }

    await this.variantStockModel.bulkWrite(
      operations.map((op) => ({
        updateOne: {
          filter: {
            variant: op.variant,
            warehouse: op.warehouse,
          },
          update: { $inc: { stock: -op.quantity } },
        },
      })),
      { session },
    );
  }
}
