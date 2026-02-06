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
import { storageConfig } from 'src/helper/multer';
import type { Request, Response } from 'express';
import { CreateProductDto } from './dto/create-product.dto';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('product/')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async getProducts(@Query() queryDto: GetProductsQueryDto) {
    const data = await this.productsService.getProducts(queryDto);

    return {
      success: true,
      data,
    };
  }

  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('productImage', 8, { storage: storageConfig }),
  )
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: updateProductDto,
    @UploadedFiles() files: Array<Express.Multer.File>, // NestJS Multer types
    @Req() req: Request,
  ) {
    // 1. Process Files to create URLs (if any exist)
    let imageUrls: string[] | undefined;

    if (files && files.length > 0) {
      imageUrls = files.map(
        (file) =>
          `${req.protocol}://${req.get('host')}/${file.path.replace(/\\/g, '/')}`,
      );
      // Note: .replace(/\\/g, '/') handles Windows paths (backslashes) correctly
    }

    // 2. Call Service
    const data = await this.productsService.update(
      id,
      updateProductDto,
      imageUrls,
    );

    // 3. Return Response (NestJS handles status 200/201 automatically)
    return {
      success: true,
      message: 'Product updated successfully',
      data,
    };
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('productImage', 8, { storage: storageConfig }),
  )
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: Request,
  ) {
    // 1. Process Files to create URLs
    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      imageUrls = files.map(
        (file) =>
          `${req.protocol}://${req.get('host')}/${file.path.replace(/\\/g, '/')}`,
      );
    }

    // 2. Call Service
    const product = await this.productsService.create(
      createProductDto,
      imageUrls,
    );

    // 3. Return Response (Status 201 is default for @Post)
    return {
      success: true,
      message: 'Product Successfully Saved',
      data: product,
    };
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    // 1. Call the service
    await this.productsService.remove(id);

    // 2. Return the custom response
    // NestJS defaults DELETE to 200 OK. If you strictly need 201, use @HttpCode(201)
    return {
      success: true,
      message: 'Product archived successfully',
    };
  }

  @Patch(':id')
  async restoreProduct(@Param('id') id: string) {
    // 1. Call the service
    await this.productsService.restore(id);

    // 2. Return the custom response
    return {
      success: true,
      message: 'Product restored successfully',
    };
  }

  // @Get('archived/all')
  // @UseGuards(AdminGuard)
  // async getArchivedProducts(@Query() queryDto: GetProductsQueryDto) {
  //   const data = await this.productsService.findArchived(queryDto);

  //   return {
  //     success: true,
  //     data,
  //   };
  // }
  @Get('qr/:id')
  async getProductQrCode(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // 1. Construct the URL
    // Best practice: Use ConfigService instead of process.env directly
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const url = `${req.protocol}://${frontendUrl}/pages/qr-product.html?id=${id}`;

    // 2. Generate the Buffer
    const qrBuffer = await this.productsService.generateQrCode(url);

    // 3. Set Headers (MIME type is crucial for images)
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="qrcode.png"');

    // 4. Send the binary data
    res.send(qrBuffer);
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);

    return {
      message: 'Product with specific id',
      success: true,
      data: product,
    };
  }
}
