import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Supplier } from './entities/supplier.entity';
import { SupplierDocument } from './entities/supplier.entity';
import { Model } from 'mongoose';
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
      throw new NotFoundException('Supplier donot Exists');
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
      throw new NotFoundException('Supplier donot Exists');
    }

    const res = await this.supplierModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    return res;
  }

  async getAll() {
    const allActiveSupplier = await this.supplierModel.find({
      isActive: false,
    });

    return allActiveSupplier;
  }
}
