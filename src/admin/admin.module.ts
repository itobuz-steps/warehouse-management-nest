import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import {
  Warehouse,
  WarehouseSchema,
} from 'src/warehouse/schemas/warehouse.schema';
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: User.name, schema: UserSchema },
    ]),
    StorageModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
