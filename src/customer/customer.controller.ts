import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'src/common/types/authenticated-request.type';
import { toActionUser } from 'src/common/adapters/action-user.adapter';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      message: 'Customer created successfully',
      success: true,
      data: await this.customerService.create(
        createCustomerDto,
        toActionUser(req.user),
      ),
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
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      message: `Customer updated successfully`,
      success: true,
      data: await this.customerService.update(
        id,
        updateCustomerDto,
        toActionUser(req.user),
      ),
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return {
      message: `Customer removed successfully`,
      success: true,
      data: await this.customerService.remove(id, toActionUser(req.user)),
    };
  }
}
