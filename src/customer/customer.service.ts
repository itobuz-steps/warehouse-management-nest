import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { LogAction } from 'src/transaction-logs/enums/log-action.enum';
import { LogEntityType } from 'src/transaction-logs/enums/log-entity-type.enum';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { ActionUser } from 'src/common/types/action-user.type';

@Injectable()
export class CustomerService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    private readonly logsService: TransactionLogsService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, user: ActionUser) {
    const customer = await this.customerModel.create(createCustomerDto);

    await this.logsService.createLog({
      action: LogAction.CUSTOMER_CREATED,
      entityType: LogEntityType.CUSTOMER,
      entityId: customer._id.toHexString(),
      performedBy: user,
      metadata: {
        name: customer.name as string,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
      },
    });

    return customer;
  }

  async findAll() {
    return await this.customerModel.find({ isActive: true }).exec();
  }

  async findOne(id: string) {
    return await this.customerModel.findOne({ _id: id, isActive: true }).exec();
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    user: ActionUser,
  ) {
    const existingCustomer = await this.customerModel.findOne({
      _id: id,
      isActive: true,
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
      action: LogAction.CUSTOMER_UPDATED,
      entityType: LogEntityType.CUSTOMER,
      entityId: updatedCustomer._id.toHexString(),
      performedBy: user,
      metadata: {
        oldValue,
        newValue,
      },
    });
  }

  async remove(id: string, user: ActionUser) {
    const deletedCustomer = await this.customerModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!deletedCustomer) {
      throw new NotFoundException('Customer not found');
    }

    await this.logsService.createLog({
      action: LogAction.CUSTOMER_DELETED,
      entityType: LogEntityType.CUSTOMER,
      entityId: deletedCustomer._id.toHexString(),
      performedBy: user,
      metadata: {
        email: deletedCustomer.email,
      },
    });

    return deletedCustomer;
  }
}
