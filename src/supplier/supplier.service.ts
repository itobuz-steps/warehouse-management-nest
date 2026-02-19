import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Supplier } from './entities/supplier.entity';
import { SupplierDocument } from './entities/supplier.entity';
import { Model, QueryFilter } from 'mongoose';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
  ) {}
  async create(supplierData: CreateSupplierDto) {
    const data = { ...supplierData };

    const existingSupplier = await this.supplierModel.findOne({
      email: data.email,
    });

    if (existingSupplier) {
      throw new ConflictException('Supplier Already Exists');
    }

    const newSupplier = await this.supplierModel.create(data);

    return newSupplier;
  }

  async update(id: string, updatedData: UpdateSupplierDto) {
    const existingSupplier = await this.supplierModel.findById(id);

    if (!existingSupplier) {
      throw new NotFoundException('Supplier Not Found');
    }

    if (updatedData.email) {
      updatedData.email = updatedData.email.toLowerCase().trim();
    }

    const updatedSupplierData = await this.supplierModel.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true },
    );

    return updatedSupplierData;
  }

  async delete(id: string) {
    const existingSupplier = await this.supplierModel.findById(id);

    if (!existingSupplier) {
      throw new NotFoundException('Supplier Not Found');
    }

    const res = await this.supplierModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    return res;
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
            $elemMatch: {
              $regex: search,
              $options: 'i',
            },
          },
        },
      ];
    }

    return this.supplierModel.find(filter, { __v: 0 }).sort({ isActive: -1 });
  }
}
