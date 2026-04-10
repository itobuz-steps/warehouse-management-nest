import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { VariantService } from './variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FILE_FIELD, FILE_COUNT } from 'src/common/constants/file.constant';
import { memoryStorage } from 'multer';
import { StorageService } from 'src/storage/storage.service';
import type { RequestWithUser } from 'src/profile/profile.controller';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { GetVariantsWithStockDto } from './dto/get-variant-stock.dto';
@Controller('variant')
@UseGuards(AuthGuard)
export class VariantController {
  constructor(
    private readonly variantService: VariantService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor(FILE_FIELD.variantImage, FILE_COUNT, {
      storage: memoryStorage(),
    }),
  )
  async create(
    @Body() dto: CreateVariantDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: RequestWithUser,
  ) {
    const imageKeys: string[] = [];

    if (files && files.length) {
      const uploadedImages =
        await this.storageService.uploadMultipleFiles(files);
      imageKeys.push(...uploadedImages.map((img) => img.key));
    }

    return await this.variantService.create(
      {
        ...dto,
        variantImage: imageKeys,
      },
      req.user,
    );
  }

  @Put('/:id')
  @UseInterceptors(
    FilesInterceptor(FILE_FIELD.variantImage, FILE_COUNT, {
      storage: memoryStorage(),
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVariantDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const imageUrls: string[] = [];

    if (files && files.length) {
      const uploadedImages =
        await this.storageService.uploadMultipleFiles(files);

      const urls = await Promise.all(
        uploadedImages.map((img) =>
          this.storageService.getPresignedSignedUrl(img.key),
        ),
      );
      imageUrls.push(...urls);
    }

    return this.variantService.update(id, {
      ...dto,
      ...(imageUrls.length && { variantImage: imageUrls }),
    });
  }

  @Post('/get-stocks')
  async getVariantsWithStock(@Body() body: GetVariantsWithStockDto) {
    const { warehouseId, variantIds } = body;

    return this.variantService.getVariantsStock(warehouseId, variantIds);
  }

  @Get('/:id')
  async findById(@Param('id') id: string) {
    return await this.variantService.findById(id);
  }

  @Get('/product/:id')
  async findByProductId(
    @Param('id') id: string,
    @Query() query: { warehouseId: string; hasStock?: string },
  ) {
    return this.variantService.findByProductId(
      id,
      query.warehouseId,
      query.hasStock === 'true',
    );
  }
}
