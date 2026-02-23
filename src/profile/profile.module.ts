import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

import { User, UserSchema } from '../auth/entities/auth.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageService } from 'src/storage/storage.service';
import { TransactionLogsModule } from 'src/transaction-logs/transaction-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    TransactionLogsModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService, StorageService],
})
export class ProfileModule {}
