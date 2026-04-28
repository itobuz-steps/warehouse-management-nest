import { tool } from 'ai';
import { z } from 'zod';
import { WarehouseService } from 'src/warehouse/warehouse.service';
import { SupplierService } from 'src/supplier/supplier.service';
import { CustomerService } from 'src/customer/customer.service';
import { BatchService } from 'src/batch/batch.service';
import { AdminService } from 'src/admin/admin.service';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import type { UserDocument } from 'src/auth/entities/auth.entity';
import { unwrapToolResponse } from './unwrap-tool-response';

export function createEntityTools(
  warehouseService: WarehouseService,
  supplierService: SupplierService,
  customerService: CustomerService,
  batchService: BatchService,
  adminService: AdminService,
  transactionLogsService: TransactionLogsService,
  getUserContext: () => UserDocument,
) {
  return {
    get_warehouses: tool({
      description:
        'List all warehouses the current user has access to. Admins see all active warehouses; managers see only their assigned ones. Returns name, address, capacity, and manager list.',
      inputSchema: z.object({}),
      execute: async () => {
        const user = getUserContext();
        return unwrapToolResponse(await warehouseService.getWarehouses(user));
      },
    }),

    get_warehouse_details: tool({
      description:
        'Get detailed info about a specific warehouse including name, address, description, capacity, maximum transaction price limit, and assigned managers.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
      }),
      execute: async ({ warehouseId }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await warehouseService.getWarehouseById(warehouseId, user),
        );
      },
    }),

    get_warehouse_capacity: tool({
      description:
        'Get warehouse capacity usage: total quantity stored, maximum capacity, and percentage filled.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
      }),
      execute: async ({ warehouseId }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await warehouseService.getWarehouseCapacity(warehouseId, user),
        );
      },
    }),

    search_suppliers: tool({
      description:
        'Search or list all suppliers. Can search by name, email, phone, address, or supplied product category. Returns supplier details including contact info and supplied product categories.',
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .describe(
            'Search term to match against supplier name, email, phone, address, or product category',
          ),
      }),
      execute: async ({ search }) => {
        return unwrapToolResponse(await supplierService.getAll(search));
      },
    }),

    get_customers: tool({
      description:
        'List all active customers. Returns name, email, address, and phone number for each customer.',
      inputSchema: z.object({}),
      execute: async () => {
        return unwrapToolResponse(await customerService.findAll());
      },
    }),

    get_customer_details: tool({
      description: 'Get detailed information about a specific customer by ID.',
      inputSchema: z.object({
        customerId: z.string().describe('MongoDB ObjectId of the customer'),
      }),
      execute: async ({ customerId }) => {
        return unwrapToolResponse(await customerService.findOne(customerId));
      },
    }),

    get_managers: tool({
      description:
        'List all warehouse managers. Returns verified, active manager accounts with their names and emails.',
      inputSchema: z.object({}),
      execute: async () => {
        return unwrapToolResponse(await adminService.getManagers());
      },
    }),

    get_batches: tool({
      description:
        'List all inventory batches with source/destination warehouse details and variant items. Batches track stock movement between warehouses.',
      inputSchema: z.object({}),
      execute: async () => {
        const user = getUserContext();
        return unwrapToolResponse(await batchService.findAll({}, user));
      },
    }),

    get_batch_details: tool({
      description:
        'Get details of a specific batch by ID, including source/destination warehouses and item quantities.',
      inputSchema: z.object({
        batchId: z.string().describe('MongoDB ObjectId of the batch'),
      }),
      execute: async ({ batchId }) => {
        const user = getUserContext();

        if (!batchId) {
          throw new Error('batchId is required');
        }

        return unwrapToolResponse(await batchService.findOne(batchId, user));
      },
    }),

    get_audit_logs: tool({
      description:
        'Get all transaction/audit logs. Logs record actions like supplier creation, customer updates, etc., with who performed them and when.',
      inputSchema: z.object({}),
      execute: async () => {
        return unwrapToolResponse(await transactionLogsService.findAll());
      },
    }),
  };
}
