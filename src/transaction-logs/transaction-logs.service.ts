import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionLogsService {
  create() {
    return 'This action adds a new transactionLog';
  }

  findAll() {
    return `This action returns all transactionLogs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} transactionLog`;
  }

  update(id: number) {
    return `This action updates a #${id} transactionLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} transactionLog`;
  }
}
