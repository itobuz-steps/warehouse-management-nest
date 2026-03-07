import {
  Controller,
  Get,
  Query,
  Put,
  UseInterceptors,
  Req,
  Param,
  Body,
  UploadedFiles,
  Post,
  Delete,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsQueryDto } from './dto/get-product-query.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { updateProductDto } from './dto/update-product.dto';
import { multerStorage } from 'src/helper/multer';
import type { Request, Response } from 'express';
import { CreateProductDto } from './dto/create-product.dto';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { FILE_COUNT, FILE_FIELD } from 'src/common/constants/file.constant';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/guard/roles.decorator';
import { USER_TYPES } from 'src/auth/userType';
import type { RequestWithUser } from 'src/profile/profile.controller';
import { StorageService } from 'src/storage/storage.service';
import { GetWarehouseProductsQueryDto } from './dto/get-warehouse-products-query';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('product')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  async getProducts(@Query() queryDto: GetProductsQueryDto) {
    const data = await this.productsService.getProducts(queryDto);

    return {
      success: true,
      data,
    };
  }

  @Get('/warehouse-products')
  async getProductsForWarehouse(@Query() query: GetWarehouseProductsQueryDto) {
    const data = await this.productsService.getProductsForWarehouse(query);

    return {
      success: true,
      data,
    };
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: updateProductDto,
    @Req() req: RequestWithUser,
  ) {
    const data = await this.productsService.update(
      id,
      updateProductDto,
      req.user,
    );

    return {
      success: true,
      message: 'Product updated successfully',
      data,
    };
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor(FILE_FIELD.productImage, FILE_COUNT, {
      storage: multerStorage(),
    }),
  )
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: RequestWithUser,
  ) {
    const imageUrls: string[] = [];

    if (files && files.length) {
      const uploadedImages =
        await this.storageService.uploadMultipleFiles(files);
      imageUrls.push(...uploadedImages.map((img) => img.key));
    }

    const product = await this.productsService.create(
      req.user._id,
      createProductDto,
      req.user,
      imageUrls,
    );

    return {
      success: true,
      message: 'Product Successfully Saved',
      data: product,
    };
  }

  @Delete(':id')
  @Roles(USER_TYPES.ADMIN)
  async deleteProduct(
    @Param() params: updateProductDto,
    @Req() req: RequestWithUser,
  ) {
    await this.productsService.remove(params.id, req.user);

    return {
      success: true,
      message: 'Product archived successfully',
    };
  }

  @Patch(':id')
  async restoreProduct(
    @Param() params: updateProductDto,
    @Req() req: RequestWithUser,
  ) {
    await this.productsService.restore(params.id, req.user);

    return {
      success: true,
      message: 'Product restored successfully',
    };
  }

  @Get('archived/all')
  @Roles(USER_TYPES.ADMIN)
  async getArchivedProducts(@Query() queryDto: GetProductsQueryDto) {
    const data = await this.productsService.findArchived(queryDto);

    return {
      success: true,
      data,
    };
  }

  @Get('qr/:id')
  async getProductQrCode(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const url = `${req.protocol}://${frontendUrl}/pages/qr-product.html?id=${id}`;

    const qrBuffer = await this.productsService.generateQrCode(url);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="qrcode.png"');

    res.send(qrBuffer);
  }

  @Post('/qr/:id')
  async getProductById(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);

    return {
      message: 'Product with specific id',
      success: true,
      data: product,
    };
  }
}
