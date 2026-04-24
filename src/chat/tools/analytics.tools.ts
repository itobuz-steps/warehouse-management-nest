import { tool } from 'ai';
import { z } from 'zod';
import { AnalyticsService } from 'src/analytics/analytics.service';
import type { UserDocument } from 'src/auth/entities/auth.entity';
import { TwoProductQuery } from 'src/analytics/dto/tow-product-query.dto';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';
import { unwrapToolResponse } from './unwrap-tool-response';

const sortOrderSchema = z.enum(['asc', 'desc']).optional();
const positiveLimitSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .describe('Maximum number of records to return');
const optionalWarehouseIdSchema = z
  .string()
  .optional()
  .describe('MongoDB ObjectId of the warehouse');
const auditQuerySchema = z.object({
  startDate: z.string().optional().describe('Start date filter in ISO format'),
  endDate: z.string().optional().describe('End date filter in ISO format'),
  warehouseId: optionalWarehouseIdSchema,
  userId: z
    .string()
    .optional()
    .describe('MongoDB ObjectId of the actor/user to filter by'),
  action: z
    .array(z.nativeEnum(LOG_ACTION))
    .optional()
    .describe('Audit action filters'),
  entityType: z
    .array(z.nativeEnum(LOG_ENTITY_TYPE))
    .optional()
    .describe('Audit entity type filters'),
});

export function createAnalyticsTools(
  analyticsService: AnalyticsService,
  getUserContext: () => UserDocument,
) {
  return {
    compare_product_quantities: tool({
      description:
        'Compare current stock quantities of two products side by side in a specific warehouse. Returns both product names and their quantities.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
        productA: z.string().describe('MongoDB ObjectId of the first product'),
        productB: z.string().describe('MongoDB ObjectId of the second product'),
      }),
      execute: async (args) => {
        return unwrapToolResponse(
          await analyticsService.getTwoProductQuantitiesData(
            args as unknown as TwoProductQuery,
          ),
        );
      },
    }),

    compare_product_history: tool({
      description:
        'Compare 7-day transaction history of two products in a warehouse. Shows daily transaction counts for each product over the last week.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
        productA: z.string().describe('MongoDB ObjectId of the first product'),
        productB: z.string().describe('MongoDB ObjectId of the second product'),
      }),
      execute: async (args) => {
        return unwrapToolResponse(
          await analyticsService.getTwoProductComparisonHistoryData(
            args as unknown as TwoProductQuery,
          ),
        );
      },
    }),

    get_products_by_stock: tool({
      description:
        'Rank products by total stock across variant inventory, optionally scoped to a warehouse.',
      inputSchema: z.object({
        order: sortOrderSchema.describe(
          'Sort ascending or descending by stock',
        ),
        limit: positiveLimitSchema,
        warehouseId: optionalWarehouseIdSchema,
      }),
      execute: async ({ order = 'desc', limit, warehouseId }) => {
        return unwrapToolResponse(
          await analyticsService.getProductsByStock(order, limit, warehouseId),
        );
      },
    }),

    get_variants_by_stock: tool({
      description:
        'Rank variants by total stock, optionally scoped to a warehouse.',
      inputSchema: z.object({
        order: sortOrderSchema.describe(
          'Sort ascending or descending by stock',
        ),
        limit: positiveLimitSchema,
        warehouseId: optionalWarehouseIdSchema,
      }),
      execute: async ({ order = 'desc', limit, warehouseId }) => {
        return unwrapToolResponse(
          await analyticsService.getVariantsByStock(order, limit, warehouseId),
        );
      },
    }),

    get_warehouse_product_stock: tool({
      description:
        'Get total stock per product for one warehouse, aggregated across its variants.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
      }),
      execute: async ({ warehouseId }) => {
        return unwrapToolResponse(
          await analyticsService.getWarehouseProductStock(warehouseId),
        );
      },
    }),

    get_top_selling_products_analytics: tool({
      description:
        'Get the highest-selling products from OUT transactions, with optional warehouse filtering and sort order.',
      inputSchema: z.object({
        order: sortOrderSchema.describe(
          'Sort ascending or descending by sold quantity',
        ),
        limit: positiveLimitSchema,
        warehouseId: optionalWarehouseIdSchema,
      }),
      execute: async ({ order = 'desc', limit, warehouseId }) => {
        return unwrapToolResponse(
          await analyticsService.getTopSellingProducts(
            order,
            limit,
            warehouseId,
          ),
        );
      },
    }),

    get_top_selling_variants: tool({
      description:
        'Get the top-selling variants for a specific product, optionally scoped to a warehouse.',
      inputSchema: z.object({
        productId: z.string().describe('MongoDB ObjectId of the product'),
        warehouseId: optionalWarehouseIdSchema,
      }),
      execute: async ({ productId, warehouseId }) => {
        return unwrapToolResponse(
          await analyticsService.getTopSellingVariants(productId, warehouseId),
        );
      },
    }),

    get_top_stock_products_analytics: tool({
      description:
        'Get products with the highest or lowest stock levels across variant inventory.',
      inputSchema: z.object({
        order: sortOrderSchema.describe(
          'Sort ascending or descending by stock',
        ),
        limit: positiveLimitSchema,
        warehouseId: optionalWarehouseIdSchema,
      }),
      execute: async ({ order = 'desc', limit, warehouseId }) => {
        return unwrapToolResponse(
          await analyticsService.getTopStockProducts(order, limit, warehouseId),
        );
      },
    }),

    get_top_stock_variants: tool({
      description:
        'Get the highest-stock variants for a specific product, optionally within one warehouse.',
      inputSchema: z.object({
        productId: z.string().describe('MongoDB ObjectId of the product'),
        warehouseId: optionalWarehouseIdSchema,
      }),
      execute: async ({ productId, warehouseId }) => {
        return unwrapToolResponse(
          await analyticsService.getTopStockVariants(productId, warehouseId),
        );
      },
    }),

    get_top_batches_by_volume: tool({
      description:
        'List the largest incoming batches by total quantity, optionally for one warehouse.',
      inputSchema: z.object({
        order: sortOrderSchema.describe(
          'Sort ascending or descending by batch volume',
        ),
        limit: positiveLimitSchema,
        warehouseId: optionalWarehouseIdSchema,
      }),
      execute: async ({ order = 'desc', limit, warehouseId }) => {
        return unwrapToolResponse(
          await analyticsService.getTopBatchesByVolume(
            order,
            limit,
            warehouseId,
          ),
        );
      },
    }),

    get_top_consumed_batches: tool({
      description:
        'List batches with the most consumed inventory, optionally for one warehouse.',
      inputSchema: z.object({
        limit: positiveLimitSchema,
        warehouseId: optionalWarehouseIdSchema,
      }),
      execute: async ({ limit, warehouseId }) => {
        return unwrapToolResponse(
          await analyticsService.getTopConsumedBatches(limit, warehouseId),
        );
      },
    }),

    get_damaged_cost_by_supplier: tool({
      description:
        'Analyze damaged batch cost grouped by supplier, with optional supplier, warehouse, and date filters.',
      inputSchema: z.object({
        supplierId: z
          .string()
          .optional()
          .describe('MongoDB ObjectId of the supplier'),
        warehouseId: optionalWarehouseIdSchema,
        startDate: z
          .string()
          .optional()
          .describe('Start date filter in ISO format'),
        endDate: z
          .string()
          .optional()
          .describe('End date filter in ISO format'),
      }),
      execute: async (args) => {
        return unwrapToolResponse(
          await analyticsService.getDamagedCostBySupplier(args),
        );
      },
    }),

    get_transaction_summary: tool({
      description:
        'Get finance and operations analytics including revenue, order volume, inventory value, sales trend, transaction mix, and top products.',
      inputSchema: z.object({
        startDate: z
          .string()
          .optional()
          .describe('Start date filter in ISO format'),
        endDate: z
          .string()
          .optional()
          .describe('End date filter in ISO format'),
        warehouseId: optionalWarehouseIdSchema,
      }),
      execute: async (args) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await analyticsService.getTransactionSummary(args, user),
        );
      },
    }),

    get_audit_logs_summary: tool({
      description:
        'Get a summary of audit log activity, including totals, action mix, entity mix, and busiest hour.',
      inputSchema: auditQuerySchema,
      execute: async (args) => {
        return unwrapToolResponse(
          await analyticsService.getAuditLogsSummary(args),
        );
      },
    }),

    get_audit_logs_timeline: tool({
      description:
        'Get audit log activity over time, grouped by day or ISO week.',
      inputSchema: auditQuerySchema.extend({
        timezone: z
          .string()
          .optional()
          .describe('IANA timezone for daily buckets, e.g. Asia/Kolkata'),
        granularity: z
          .enum(['day', 'week'])
          .optional()
          .describe('Timeline grouping granularity'),
      }),
      execute: async (args) => {
        return unwrapToolResponse(
          await analyticsService.getAuditLogsTimeline(args),
        );
      },
    }),

    get_audit_log_actors: tool({
      description:
        'Get the most active users in audit logs with pagination and optional filters.',
      inputSchema: auditQuerySchema.extend({
        page: z.number().int().positive().optional().describe('Page number'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe('Results per page'),
      }),
      execute: async (args) => {
        return unwrapToolResponse(
          await analyticsService.getAuditLogsActors(args),
        );
      },
    }),
  };
}
