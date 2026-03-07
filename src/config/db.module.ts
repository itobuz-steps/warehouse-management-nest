import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Connection, ConnectionStates } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dbName: 'seeded_db',
        uri: config.get<string>('DB_URI'),
      }),
    }),
  ],
})
export class DbModule implements OnModuleInit {
  private readonly logger = new Logger(DbModule.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    if (this.connection.readyState === ConnectionStates.connected) {
      this.logger.log('MongoDB connected successfully');
    } else {
      this.logger.error(
        `MongoDB connection state: ${ConnectionStates[this.connection.readyState]}`,
      );
    }
  }
}
