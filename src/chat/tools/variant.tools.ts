import { tool } from 'ai';
import { z } from 'zod';
import type { Model } from 'mongoose';
import { VariantService } from 'src/variant/variant.service';
import { unwrapToolResponse } from './unwrap-tool-response';

export function createVariantTools(
  variantService: VariantService,
  variantModel: Model<unknown>,
) {
  return {
    get_variant_details: tool({
      description:
        'Get full details of a specific variant by ID, including attributes, SKU, price, markup, and image URLs.',
      inputSchema: z.object({
        variantId: z.string().describe('MongoDB ObjectId of the variant'),
      }),
      execute: async ({ variantId }) => {
        return unwrapToolResponse(await variantService.findById(variantId));
      },
    }),

    get_product_variants: tool({
      description:
        'List variants for a product. Optionally include stock totals, optionally scoped to a warehouse.',
      inputSchema: z.object({
        productId: z.string().describe('MongoDB ObjectId of the product'),
        warehouseId: z
          .string()
          .optional()
          .describe('MongoDB ObjectId of the warehouse'),
        hasStock: z
          .boolean()
          .optional()
          .describe(
            'When true, include aggregated stock quantity for each variant',
          ),
      }),
      execute: async ({ productId, warehouseId = '', hasStock = false }) => {
        return unwrapToolResponse(
          await variantService.findByProductId(
            productId,
            warehouseId,
            hasStock,
          ),
        );
      },
    }),

    get_variants_with_stock: tool({
      description:
        'Get stock snapshots for selected variants in a specific warehouse, including product and variant metadata plus current stock.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
        variantIds: z
          .array(z.string())
          .min(1)
          .describe('Array of MongoDB ObjectIds for variants'),
      }),
      execute: async ({ warehouseId, variantIds }) => {
        return unwrapToolResponse(
          await variantService.getVariantsStock(warehouseId, variantIds),
        );
      },
    }),

    search_variants: tool({
      description:
        'Search variants using product ID, SKU text, and pagination. Useful when the user asks for variants by SKU or wants a product variant catalog.',
      inputSchema: z.object({
        productId: z
          .string()
          .optional()
          .describe('MongoDB ObjectId of the product'),
        sku: z.string().optional().describe('Case-insensitive SKU search'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Maximum number of variants to return'),
      }),
      execute: async ({ productId, sku, limit = 20 }) => {
        const filter: Record<string, unknown> = {};

        if (productId) {
          filter.product = productId;
        }

        if (sku) {
          filter.sku = { $regex: sku, $options: 'i' };
        }

        const rows = await variantModel.find(filter).limit(limit).lean().exec();
        return rows;
      },
    }),
  };
}
