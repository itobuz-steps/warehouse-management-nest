import { tool } from 'ai';
import { z } from 'zod';
import { QuantityService } from 'src/quantity/quantity.service';
import { GetSpecificQuantityDto } from 'src/quantity/dto/product-specific-quantity.dto';
import { ProductsHavingQuantityDto } from 'src/quantity/dto/product-having-quantity.dto';

export function createInventoryTools(quantityService: QuantityService) {
  return {
    get_total_product_quantity: tool({
      description:
        'Get total stock quantity of a product summed across ALL warehouses. Returns aggregated total.',
      inputSchema: z.object({
        productId: z.string().describe('MongoDB ObjectId of the product'),
      }),
      execute: async ({ productId }) => {
        return quantityService.getTotalQuantity(productId);
      },
    }),

    get_product_warehouse_stock: tool({
      description:
        'Get stock quantity of a specific product in a specific warehouse.',
      inputSchema: z.object({
        productId: z.string().describe('MongoDB ObjectId of the product'),
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
      }),
      execute: async (args) => {
        return quantityService.getSpecificWarehouseQuantity(
          args as unknown as GetSpecificQuantityDto,
        );
      },
    }),

    search_products_with_stock: tool({
      description:
        'Search products with their stock quantities. Supports filtering by warehouse, category, name search, and sorting by name/category/quantity. Returns paginated results.',
      inputSchema: z.object({
        search: z.string().optional().describe('Search term for product name'),
        category: z.string().optional().describe('Category filter'),
        sort: z
          .string()
          .optional()
          .describe('Sort field: name, category, or quantity'),
        warehouseId: z
          .string()
          .optional()
          .describe('Filter by specific warehouse ID'),
        page: z.number().optional().describe('Page number'),
        limit: z.number().optional().describe('Results per page'),
      }),
      execute: async (args) => {
        return quantityService.getProductsHavingQuantity(
          args as unknown as ProductsHavingQuantityDto,
        );
      },
    }),

    get_all_warehouse_products: tool({
      description:
        'List ALL products and their quantities in a specific warehouse. Returns complete inventory list for that warehouse.',
      inputSchema: z.object({
        warehouseId: z.string().describe('MongoDB ObjectId of the warehouse'),
      }),
      execute: async ({ warehouseId }) => {
        return quantityService.getWarehouseProducts(warehouseId);
      },
    }),

    get_product_stock_breakdown: tool({
      description:
        'Get per-warehouse stock breakdown for a single product. Shows how much stock is in each warehouse.',
      inputSchema: z.object({
        productId: z.string().describe('MongoDB ObjectId of the product'),
      }),
      execute: async ({ productId }) => {
        return quantityService.findByProduct(productId);
      },
    }),
  };
}
