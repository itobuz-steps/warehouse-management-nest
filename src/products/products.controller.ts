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
import {
  FILE_COUNT,
  FILE_FIELD,
  FOLDER_PATH,
} from 'src/common/constants/file.constant';
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
    FilesInterceptor(FILE_FIELD.productImage, FILE_COUNT, {
      storage: multerStorage(FOLDER_PATH.product),
    }),
  )
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: updateProductDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: Request,
  ) {
    let imageUrls: string[] | undefined;

    if (files && files.length) {
      imageUrls = files.map(
        (file) =>
          `${req.protocol}://${req.get('host')}/${file.path.replace(/\\/g, '/')}`,
      );
    }

    const data = await this.productsService.update(
      id,
      updateProductDto,
      imageUrls,
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
      storage: multerStorage(FOLDER_PATH.product),
    }),
  )
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    let imageUrls: string[] = [];

    if (files && files.length) {
      imageUrls = files.map(
        (file) =>
          `${req.protocol}://${req.get('host')}/${file.path.replace(/\\/g, '/')}`,
      );
    }

    const product = await this.productsService.create(
      createProductDto,
      imageUrls,
    );

    return {
      success: true,
      message: 'Product Successfully Saved',
      data: product,
    };
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    await this.productsService.remove(id);

    return {
      success: true,
      message: 'Product archived successfully',
    };
  }

  @Patch(':id')
  async restoreProduct(@Param('id') id: string) {
    await this.productsService.restore(id);

    return {
      success: true,
      message: 'Product restored successfully',
    };
  }

  @Get('archived/all')
  // @UseGuards(AdminGuard)
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
