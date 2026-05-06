import { tool } from 'ai';
import { z } from 'zod';
import { DashboardService } from 'src/dashboard/dashboard.service';
import { unwrapToolResponse } from './unwrap-tool-response';
import type { UserDocument } from 'src/auth/entities/auth.entity';

export function createDashboardTools(
  dashboardService: DashboardService,
  getUserContext: () => UserDocument,
) {
  return {
    get_top_products: tool({
      description:
        'Get the top 5 products by stock quantity in a warehouse. Useful for knowing which products have the most inventory.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
      }),
      execute: async ({ warehouseId }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await dashboardService.getTopFiveProducts(warehouseId, user),
        );
      },
    }),

    get_inventory_by_category: tool({
      description:
        'Get inventory breakdown grouped by product category in a warehouse. Shows total quantity per category (Electronics, Furniture, etc.).',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
      }),
      execute: async ({ warehouseId }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await dashboardService.getInventoryByCategory(warehouseId, user),
        );
      },
    }),

    get_transaction_activity: tool({
      description:
        'Get daily IN and OUT transaction counts for the last 7 days in a warehouse. Useful for activity trend charts.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
      }),
      execute: async ({ warehouseId }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await dashboardService.getProductTransaction(warehouseId, user),
        );
      },
    }),

    get_dashboard_stats: tool({
      description:
        "Get warehouse dashboard summary: total sales (dollar value + quantity), total purchases (dollar value + quantity), total inventory quantity, and today's shipment count. A single call for overall warehouse KPIs.",
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
      }),
      execute: async ({ warehouseId }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await dashboardService.getTransactionStats(warehouseId, user),
        );
      },
    }),

    get_low_stock_products: tool({
      description:
        "Get products that are below their stock alert threshold in a warehouse. Each product's quantity is at or below its configured limit.",
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
      }),
      execute: async ({ warehouseId }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await dashboardService.getLowStockProducts(warehouseId, user),
        );
      },
    }),

    get_top_selling_products: tool({
      description:
        'Get top selling products ranked by total sold quantity (OUT transactions) in a warehouse. Includes sales amount.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
        limit: z
          .number()
          .optional()
          .describe('Number of top products to return'),
      }),
      execute: async ({ warehouseId, limit }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await dashboardService.getTopSellingProducts(
            warehouseId,
            limit,
            user,
          ),
        );
      },
    }),

    get_most_cancelled_products: tool({
      description:
        'Get products with the most cancelled shipments in a warehouse. Optionally filter by date range.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
        startDate: z
          .string()
          .optional()
          .describe('Start date filter (ISO string)'),
        endDate: z.string().optional().describe('End date filter (ISO string)'),
        limit: z.number().optional().describe('Number of results'),
      }),
      execute: async ({ warehouseId, ...options }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await dashboardService.getMostCancelledProducts(
            warehouseId,
            options,
            user,
          ),
        );
      },
    }),

    get_most_adjusted_products: tool({
      description:
        'Get products with the most stock adjustments (corrections) in a warehouse.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
        limit: z.number().optional().describe('Number of results'),
      }),
      execute: async ({ warehouseId, limit }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await dashboardService.getMostAdjustedProducts(
            warehouseId,
            { limit },
            user,
          ),
        );
      },
    }),

    get_profit_loss: tool({
      description:
        'Get daily profit and loss data for a warehouse over a time period. Profit comes from OUT/TRANSFER transactions (price * markup), loss from ADJUSTMENT transactions. Supports period: "week", "month", or custom date range with "from" and "to".',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
        period: z
          .string()
          .optional()
          .describe('Time period: "week", "month", or omit for custom range'),
        from: z
          .string()
          .optional()
          .describe('Custom range start date (ISO string)'),
        to: z
          .string()
          .optional()
          .describe('Custom range end date (ISO string)'),
      }),
      execute: async ({ warehouseId, period, from, to }) => {
        const user = getUserContext();
        return unwrapToolResponse(
          await dashboardService.getProfitLoss(
            { id: warehouseId, period, from, to },
            user,
          ),
        );
      },
    }),
  };
}
