import { tool } from 'ai';
import { z } from 'zod';
import { ProductsService } from 'src/products/products.service';
import { GetProductsQueryDto } from 'src/products/dto/get-product-query.dto';
import { unwrapToolResponse } from './unwrap-tool-response';

export function createProductTools(productsService: ProductsService) {
  return {
    search_products: tool({
      description:
        'Search products by name, filter by category, with pagination. Returns product list with names, categories, brands, labels, and variant counts.',
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .describe('Search term to match product name'),
        category: z
          .string()
          .optional()
          .describe(
            'Product category filter (Electronics, Furniture, Clothing, Food & Beverage, Medical Supplies, Industrial Tools, Automotive Parts, Office Supplies, Accessories)',
          ),
        sort: z
          .string()
          .optional()
          .describe(
            'Sort option: name_asc, name_desc, category_asc, createdAt_desc',
          ),
        page: z.string().optional().describe('Page number, defaults to 1'),
        limit: z
          .string()
          .optional()
          .describe('Results per page, defaults to 10'),
      }),
      execute: async (args) => {
        const result = await productsService.getProducts(
          args as unknown as GetProductsQueryDto,
        );
        return unwrapToolResponse(result);
      },
    }),

    get_product_details: tool({
      description:
        'Get full details of a specific product by its MongoDB ID. Returns name, category, brand, label, description, variant count.',
      inputSchema: z.object({
        productId: z.string().describe('The MongoDB ObjectId of the product'),
      }),
      execute: async ({ productId }) => {
        const result = await productsService.findOne(productId);
        return unwrapToolResponse(result);
      },
    }),

    search_archived_products: tool({
      description:
        'Search archived (soft-deleted) products. Same filters as search_products.',
      inputSchema: z.object({
        search: z.string().optional().describe('Search term'),
        category: z.string().optional().describe('Category filter'),
        page: z.string().optional().describe('Page number'),
        limit: z.string().optional().describe('Results per page'),
      }),
      execute: async (args) => {
        const result = await productsService.findArchived(
          args as unknown as GetProductsQueryDto,
        );
        return unwrapToolResponse(result);
      },
    }),
  };
}
