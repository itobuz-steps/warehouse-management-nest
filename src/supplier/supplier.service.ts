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
import { UserDocument } from 'src/auth/entities/auth.entity';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { LogAction } from 'src/transaction-logs/enums/log-action.enum';
import { LogEntityType } from 'src/transaction-logs/enums/log-entity-type.enum';

@Injectable()
export class SupplierService {
  constructor(
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
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
      action: LogAction.SUPPLIER_CREATED,
      entityType: LogEntityType.SUPPLIER,
      entityId: newSupplier._id.toHexString(),
      performedBy: user,
      metadata: {
        name: newSupplier.name,
        email: newSupplier.email,
        phoneNumber: newSupplier.phoneNumber,
        address: newSupplier.address,
        suppliedProduct: newSupplier.suppliedProduct,
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
      action: LogAction.SUPPLIER_UPDATED,
      entityType: LogEntityType.SUPPLIER,
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
      action: LogAction.SUPPLIER_DELETED,
      entityType: LogEntityType.SUPPLIER,
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
