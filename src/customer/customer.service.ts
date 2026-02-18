import { Injectable } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class CustomerService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const createdCustomer = new this.customerModel(createCustomerDto);
    return await createdCustomer.save();
  }

  async findAll() {
    return await this.customerModel.find({ isActive: true }).exec();
  }

  async findOne(id: string) {
    return await this.customerModel.findOne({ _id: id, isActive: true }).exec();
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    return await this.customerModel
      .findByIdAndUpdate(id, updateCustomerDto, { new: true })
      .exec();
  }

  async remove(id: string) {
    return await this.customerModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();
  }
}
