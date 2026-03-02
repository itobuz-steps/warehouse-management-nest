import { tool } from 'ai';
import { z } from 'zod';
import { TransactionService } from 'src/transaction/transaction.service';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { GetTransactionsQueryDto } from 'src/transaction/dto/query/get-transactions.query.dto';
import { WarehouseTransactionsQueryDto } from 'src/transaction/dto/query/warehouse-transactions.query.dto';

export function createTransactionTools(
  transactionService: TransactionService,
  getUserContext: () => UserDocument,
) {
  return {
    search_transactions: tool({
      description:
        'Search transactions with filters: date range, type (IN, OUT, ADJUSTMENT, TRANSFER), shipment status (PENDING, SHIPPED, CANCELLED). Returns paginated transaction list with products, quantities, and amounts. Managers only see their assigned warehouses.',
      inputSchema: z.object({
        startDate: z
          .string()
          .optional()
          .describe('Start date filter (ISO string, e.g. 2026-02-01)'),
        endDate: z.string().optional().describe('End date filter (ISO string)'),
        type: z
          .string()
          .optional()
          .describe('Transaction type: IN, OUT, ADJUSTMENT, or TRANSFER'),
        status: z
          .string()
          .optional()
          .describe('Shipment status: PENDING, SHIPPED, or CANCELLED'),
        page: z.number().optional().describe('Page number'),
        limit: z.number().optional().describe('Results per page'),
      }),
      execute: async (args) => {
        const user = getUserContext();
        const result = await transactionService.getTransactions(
          args as unknown as GetTransactionsQueryDto,
          user as unknown as Parameters<
            TransactionService['getTransactions']
          >[1],
        );
        return result;
      },
    }),

    get_warehouse_transactions: tool({
      description:
        'Get all transactions for a specific warehouse (as source or destination). Supports date range, type, and status filters. Returns paginated list.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
        startDate: z
          .string()
          .optional()
          .describe('Start date filter (ISO string)'),
        endDate: z.string().optional().describe('End date filter (ISO string)'),
        type: z
          .string()
          .optional()
          .describe('Transaction type: IN, OUT, ADJUSTMENT, or TRANSFER'),
        status: z
          .string()
          .optional()
          .describe('Shipment status: PENDING, SHIPPED, or CANCELLED'),
        page: z.number().optional().describe('Page number'),
        limit: z.number().optional().describe('Results per page'),
      }),
      execute: async ({ warehouseId, ...query }) => {
        const result = await transactionService.getWarehouseTransactions(
          warehouseId,
          query as unknown as WarehouseTransactionsQueryDto,
        );
        return result;
      },
    }),
  };
}
