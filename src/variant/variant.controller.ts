import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { VariantService } from './variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import type { RequestWithUser } from 'src/warehouse/types/userType';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerStorage } from 'src/helper/multer';
import {
  FILE_FIELD,
  FILE_COUNT,
  FOLDER_PATH,
} from 'src/common/constants/file.constant';

@Controller('variant')
@UseGuards(AuthGuard)
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor(FILE_FIELD.productImage, FILE_COUNT, {
      storage: multerStorage(FOLDER_PATH.product),
    }),
  )
  create(
    @Body() dto: CreateVariantDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: RequestWithUser,
  ) {
    let imageUrls: string[] = [];

    if (files && files.length) {
      imageUrls = files.map((file) => {
        const fileName = file.filename;
        return `${req.protocol}://${req.get('host')}/uploads/products/${fileName}`;
      });
    }
    return this.variantService.create({ ...dto, productImage: imageUrls });
  }

  @Get('product/:id')
  findByProduct(@Param('id') id: string) {
    return this.variantService.findByProduct(id);
  }
}
