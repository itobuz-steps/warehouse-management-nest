import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer, CustomerDocument } from './entities/customer.entity';
import { Model, QueryFilter } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';

@Injectable()
export class CustomerService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    private readonly logsService: TransactionLogsService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, user: UserDocument) {
    const customer = await this.customerModel.create(createCustomerDto);

    await this.logsService.createLog({
      action: LOG_ACTION.CUSTOMER_CREATED,
      entityType: LOG_ENTITY_TYPE.CUSTOMER,
      entityId: customer._id.toHexString(),
      performedBy: user,
      metadata: {
        name: customer.name as string,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        address: customer.address,
      },
    });

    return customer;
  }

  async findAll(query?: string) {
    const filter: QueryFilter<CustomerDocument> = {};

    if (query) {
      const searchConditions: QueryFilter<CustomerDocument>[] = [
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { address: { $regex: query, $options: 'i' } },
      ];

      const lowerQuery = query.toLowerCase();

      //handles boolean field
      if (lowerQuery === 'active') {
        searchConditions.push({ isActive: true });
      } else if (lowerQuery === 'inactive') {
        searchConditions.push({ isActive: false });
      }

      filter.$or = searchConditions;
    }

    return await this.customerModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    return await this.customerModel.findOne({ _id: id, isActive: true }).exec();
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    user: UserDocument,
  ) {
    const existingCustomer = await this.customerModel.findOne({
      _id: id,
    });

    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    const oldValue = {
      name: existingCustomer.name,
      email: existingCustomer.email,
      phoneNumber: existingCustomer.phoneNumber,
    };

    const updatedCustomer = await this.customerModel.findByIdAndUpdate(
      id,
      updateCustomerDto,
      { new: true },
    );

    if (!updatedCustomer) {
      throw new NotFoundException('Customer not found');
    }

    const newValue = {
      name: updatedCustomer.name,
      email: updatedCustomer.email,
      phoneNumber: updatedCustomer.phoneNumber,
    };

    await this.logsService.createLog({
      action: LOG_ACTION.CUSTOMER_UPDATED,
      entityType: LOG_ENTITY_TYPE.CUSTOMER,
      entityId: updatedCustomer._id.toHexString(),
      performedBy: user,
      metadata: {
        oldValue,
        newValue,
      },
    });
    return updatedCustomer;
  }

  async remove(id: string, user: UserDocument) {
    const deletedCustomer = await this.customerModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!deletedCustomer) {
      throw new NotFoundException('Customer not found');
    }

    await this.logsService.createLog({
      action: LOG_ACTION.CUSTOMER_DELETED,
      entityType: LOG_ENTITY_TYPE.CUSTOMER,
      entityId: deletedCustomer._id.toHexString(),
      performedBy: user,
      metadata: {
        name: deletedCustomer.name as string,
        email: deletedCustomer.email,
      },
    });

    return deletedCustomer;
  }
}
