import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { User, UserSchema } from './entities/auth.entity';
import { OTP, OTPSchema } from './entities/otp.entity';
import { TokenGenerator } from 'src/utils/TokenGenerator';
import { ConfigModule } from 'src/config/config.module';
import OtpGenerator from 'src/utils/OtpGenerator';
import { MailModule } from 'src/mail/mail.module';
import { WarehouseModule } from 'src/warehouse/warehouse.module';
import {
  Warehouse,
  WarehouseSchema,
} from 'src/warehouse/schemas/warehouse.schema';
import { Product, ProductSchema } from 'src/products/entities/product.entity';
import { TransactionModule } from 'src/transaction/transaction.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: OTP.name, schema: OTPSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    WarehouseModule,
    TransactionModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenGenerator, OtpGenerator],
  exports: [OtpGenerator, TokenGenerator], // Optional if needed elsewhere
})
export class AuthModule {}
