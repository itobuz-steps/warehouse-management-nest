import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { USER_TYPES } from 'src/auth/userType';
import { Roles } from 'src/common/guard/roles.decorator';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/profile/profile.controller';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FILE_FIELD } from 'src/common/constants/file.constant';
import { StorageService } from 'src/storage/storage.service';
import { WarehouseAnalyticsQueryDto } from './dto/warehouse-analytics.dto';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('warehouse/')
export class WarehouseController {
  constructor(
    private readonly service: WarehouseService,
    private readonly storageService: StorageService,
  ) {}

  @Get('get-warehouses')
  getWarehouses(@Req() req: RequestWithUser) {
    return this.service.getWarehouses(req.user);
  }

  @Get('get-warehouses/:warehouseId')
  getWarehouseById(
    @Param('warehouseId') warehouseId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.getWarehouseById(warehouseId, req.user);
  }

  @Get('get-warehouse-capacity/:warehouseId')
  getWarehouseCapacity(
    @Param('warehouseId') warehouseId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.getWarehouseCapacity(warehouseId, req.user);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor(FILE_FIELD.warehouseImage, {
      storage: memoryStorage(),
    }),
  )
  @Roles(USER_TYPES.ADMIN)
  async addWarehouse(
    @Body() dto: CreateWarehouseDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    let imageKey: string | null = null;

    if (file) {
      const uploadedImage = await this.storageService.uploadSingleFile(file);
      imageKey = uploadedImage.key;
    }

    return await this.service.addWarehouse(dto, imageKey, req.user);
  }

  @Put('/:id')
  @UseInterceptors(
    FileInterceptor(FILE_FIELD.warehouseImage, {
      storage: memoryStorage(),
    }),
  )
  @Roles(USER_TYPES.ADMIN)
  async updateWarehouse(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;

    if (file) {
      const uploadedImage = await this.storageService.uploadSingleFile(file);
      imageUrl = uploadedImage.key;
    }

    return this.service.updateWarehouse(id, dto, imageUrl, req.user);
  }

  @Delete('/:id')
  @Roles(USER_TYPES.ADMIN)
  deleteWarehouse(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.deleteWarehouse(id, req.user);
  }

  @Get('analytics/health-comparison')
  getWarehouseHealthComparison(
    @Query() query: WarehouseAnalyticsQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.getWarehouseHealthComparison(
      {
        days: query.days ? Number(query.days) : undefined,
        startDate: query.startDate,
        endDate: query.endDate,
      },
      req.user,
    );
  }

  @Get('analytics/capacity-comparison')
  getWarehouseCapacityComparison(@Req() req: RequestWithUser) {
    return this.service.getWarehouseCapacityComparison(req.user);
  }
}
