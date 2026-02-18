import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return {
      message: 'Customer created successfully',
      success: true,
      data: await this.customerService.create(createCustomerDto),
    };
  }

  @Get()
  async findAll() {
    return {
      message: 'All customers retrieved successfully',
      success: true,
      data: (await this.customerService.findAll()) || [],
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return {
      message: `Specific Customer retrieved successfully`,
      success: true,
      data: (await this.customerService.findOne(id)) || [],
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return {
      message: `Customer updated successfully`,
      success: true,
      data: await this.customerService.update(id, updateCustomerDto),
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return {
      message: `Customer removed successfully`,
      success: true,
      data: await this.customerService.remove(id),
    };
  }
}
