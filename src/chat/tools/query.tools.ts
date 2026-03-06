import { tool } from 'ai';
import { z } from 'zod';
import type { Model, PipelineStage, SortOrder } from 'mongoose';

/**
 * Whitelisted read-only collections the LLM is allowed to query.
 * Sensitive collections (e.g. otps) are intentionally excluded.
 */
export const ALLOWED_COLLECTIONS = [
  'products',
  'quantities',
  'warehouses',
  'transactions',
  'variants',
  'variantstocks',
  'suppliers',
  'customers',
  'batches',
  'transactionlogs',
  'users',
] as const;

export type AllowedCollection = (typeof ALLOWED_COLLECTIONS)[number];

export type QueryModelMap = Record<AllowedCollection, Model<unknown>>;

/**
 * Sensitive fields that must always be stripped from results
 * regardless of projection.
 */
const STRIP_FIELDS: Record<string, string[]> = {
  users: ['password'],
};

function stripSensitive(
  collection: string,
  docs: Record<string, unknown>[],
): Record<string, unknown>[] {
  const fields = STRIP_FIELDS[collection];
  if (!fields?.length) return docs;
  return docs.map((doc) => {
    const copy = { ...doc };
    for (const f of fields) delete copy[f];
    return copy;
  });
}

export function createQueryTools(modelMap: QueryModelMap) {
  return {
    /**
     * Run a flexible read-only find() query on any whitelisted collection.
     * Use this when the built-in tools cannot satisfy the user's request
     * (e.g. date range filters, custom projections, cross-field comparisons).
     */
    execute_db_query: tool({
      description: `
Execute a read-only MongoDB find() on any collection.
Use this for custom filters that built-in tools don't support:
  - date ranges (e.g. {"createdAt": {"$gte": "2026-01-01"}})
  - field comparisons (e.g. {"quantity": {"$lt": 5}})
  - text searches (e.g. {"name": {"$regex": "shirt", "$options": "i"}})
  - OR/AND conditions (e.g. {"$or": [{"category": "Clothing"}, {"category": "Furniture"}]})
Always keep limit ≤ 100 unless the user asks for more.
      `.trim(),
      inputSchema: z.object({
        collection: z
          .enum(ALLOWED_COLLECTIONS)
          .describe('Collection name to query'),
        filter: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'MongoDB filter object. Supports all query operators ($gt, $lt, $in, $regex, $or, $and, etc.)',
          ),
        projection: z
          .record(z.string(), z.number())
          .optional()
          .describe('Fields to include (1) or exclude (0).'),
        sort: z
          .record(z.string(), z.number())
          .optional()
          .describe('Sort: {field: 1} ascending, {field: -1} descending'),
        limit: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .default(50)
          .describe('Max documents to return (default 50, max 200)'),
        skip: z
          .number()
          .min(0)
          .optional()
          .describe('Documents to skip for pagination'),
      }),
      execute: async ({
        collection,
        filter,
        projection,
        sort,
        limit,
        skip,
      }) => {
        const model = modelMap[collection];
        if (!model) {
          return { error: `Collection "${collection}" is not queryable` };
        }

        try {
          const results = (await model
            .find(filter ?? {}, projection ?? null)
            .sort((sort ?? {}) as Record<string, SortOrder>)
            .skip(skip ?? 0)
            .limit(limit ?? 50)
            .lean()
            .exec()) as Record<string, unknown>[];

          const safe = stripSensitive(collection, results);
          return { count: safe.length, data: safe };
        } catch (err) {
          return {
            error:
              err instanceof Error
                ? `Query error: ${err.message}`
                : 'Unknown query error',
          };
        }
      },
    }),

    /**
     * Run a read-only MongoDB aggregation pipeline on any whitelisted collection.
     * Use this for complex analytics: grouping, joining collections ($lookup),
     * computing totals, averages, date-based grouping, etc.
     */
    execute_db_aggregate: tool({
      description: `
Execute a read-only MongoDB aggregation pipeline on any collection.
Use this for advanced queries:
  - $group: totals, averages, counts per category/warehouse
  - $lookup: join collections (e.g. join quantities with products)
  - $match + $group: filtered aggregations
  - $unwind: flatten array fields
  - $project: reshape output
  - $sort + $limit: ranked results
Example pipeline to get total quantity per product:
  [{"$group": {"_id": "$productId", "total": {"$sum": "$quantity"}}}]
      `.trim(),
      inputSchema: z.object({
        collection: z
          .enum(ALLOWED_COLLECTIONS)
          .describe('Collection to run the pipeline on'),
        pipeline: z
          .array(z.record(z.string(), z.unknown()))
          .describe(
            'MongoDB aggregation pipeline array. Each element is an aggregation stage.',
          ),
        limit: z
          .number()
          .min(1)
          .max(500)
          .optional()
          .describe(
            'Safety limit appended to pipeline if not already present (default 100)',
          ),
      }),
      execute: async ({ collection, pipeline, limit }) => {
        const model = modelMap[collection];
        if (!model) {
          return { error: `Collection "${collection}" is not queryable` };
        }

        // Block any mutation stages
        const BLOCKED_STAGES = ['$out', '$merge'];
        for (const stage of pipeline) {
          for (const blocked of BLOCKED_STAGES) {
            if (blocked in stage) {
              return {
                error: `Stage "${blocked}" is not allowed (read-only mode)`,
              };
            }
          }
        }

        // Append a safety $limit if pipeline doesn't already have one
        const hasLimit = pipeline.some((s) => '$limit' in s);
        const safePipeline: PipelineStage[] = hasLimit
          ? (pipeline as unknown as PipelineStage[])
          : ([
              ...pipeline,
              { $limit: limit ?? 100 },
            ] as unknown as PipelineStage[]);

        try {
          const results = (await model
            .aggregate(safePipeline)
            .exec()) as Record<string, unknown>[];

          const safe = stripSensitive(collection, results);
          return { count: safe.length, data: safe };
        } catch (err) {
          return {
            error:
              err instanceof Error
                ? `Aggregation error: ${err.message}`
                : 'Unknown aggregation error',
          };
        }
      },
    }),
  };
}
