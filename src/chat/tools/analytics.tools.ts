import { tool } from 'ai';
import { z } from 'zod';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { TwoProductQuery } from 'src/analytics/dto/tow-product-query.dto';

export function createAnalyticsTools(analyticsService: AnalyticsService) {
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
        return analyticsService.getTwoProductQuantities(
          args as unknown as TwoProductQuery,
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
        return analyticsService.getTwoProductComparisonHistory(
          args as unknown as TwoProductQuery,
        );
      },
    }),
  };
}
