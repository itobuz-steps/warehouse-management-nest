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
  Query,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/profile/profile.controller';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('analytics')
  getAnalytics() {
    return this.customerService.getAnalytics();
  }

  @Get('status-counts')
  getStatusCounts() {
    return this.customerService.getStatusCounts();
  }

  @Post()
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Req() req: RequestWithUser,
  ) {
    return {
      message: 'Customer created successfully',
      success: true,
      data: await this.customerService.create(createCustomerDto, req.user),
    };
  }

  @Get()
  async findAll(@Query('search') search?: string) {
    return {
      message: 'All customers retrieved successfully',
      success: true,
      data: (await this.customerService.findAll(search)) || [],
    };
  }

  @Get('paginated')
  async findAllPaginated(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('isActive') isActive?: string,
  ) {
    return {
      message: 'All customers retrieved successfully',
      success: true,
      data: await this.customerService.findAllPaginated(
        search,
        Number(page),
        Number(limit),
        isActive,
      ),
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
    @Req() req: RequestWithUser,
  ) {
    return {
      message: `Customer updated successfully`,
      success: true,
      data: await this.customerService.update(id, updateCustomerDto, req.user),
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return {
      message: `Customer removed successfully`,
      success: true,
      data: await this.customerService.remove(id, req.user),
    };
  }
}
