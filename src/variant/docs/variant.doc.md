# Variant Module Documentation

## Overview

The Variant Module manages product variants – distinct versions of a product
differentiated by attributes such as color, size, etc.  
It provides endpoints for creating variants, uploading images, generating SKUs,
and retrieving variant information. The service is used by the Product module
during product creation to create variants in a transaction.

---

## Table of Contents

1. [Module Structure](#module-structure)
2. [Data Model](#data-model)
3. [DTOs](#dtos)
4. [API Endpoints](#api-endpoints)
5. [Service Methods](#service-methods)
6. [SKU Generation](#sku-generation)
7. [Integration Points](#integration-points)
8. [Best Practices & Notes](#best-practices--notes)

---

## Module Structure

```
src/variant/
├── variant.module.ts
├── variant.controller.ts
├── variant.service.ts
├── dto/
│   ├── create-variant.dto.ts
│   └── update-variant.dto.ts
└── schemas/
    └── variant.schema.ts
```

---

## Data Model

### `Variant` schema (`variant.schemas.ts`)

```ts
@Schema({ timestamps: true })
export class Variant {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: Map, of: String, default: {} })
  attributes: Record<string, string>;

  @Prop([String])
  variantImage: string[];

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: false, min: 0, max: 100, default: 10 })
  markup: number;

  @Prop({ required: true, unique: true, immutable: true })
  sku: string;
}
```

Fields

- `product` – ObjectId reference to the parent product.
- `attributes` – key/value map of variant attributes.
- `variantImage` – array of storage keys for images.
- `price` – cost price (>= 0).
- `markup` – percentage markup (0‑100, default 10).
- `sku` – generated SKU, unique and immutable.

---

## DTOs

### `CreateVariantDto`

```ts
export class CreateVariantDto {
  @IsMongoId()
  product: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  productImage?: string[];

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  markup?: number;
}
```

### `UpdateVariantDto`

Extends `CreateVariantDto` with `PartialType` (all fields optional).

---

## API Endpoints

All routes are guarded by `AuthGuard` (JWT).

| Method | Path                   | Description                                               |
| ------ | ---------------------- | --------------------------------------------------------- |
| POST   | `/variant`             | Create a new variant                                      |
| GET    | `/variant/product/:id` | Retrieve variant by id (returns variant + presigned URLs) |

### Create Variant

**Request:** multipart/form-data, optional image files  
**Body:** fields defined in `CreateVariantDto`  
**Process:**

1. Uploads images via `StorageService` (memoryStorage).
2. Collects returned keys.
3. Calls `VariantService.create()`.

**Example Response:**

```json
{
  "success": true,
  "message": "Variant created successfully",
  "data": {
    "_id": "60d5ec49c1234567890abcd0",
    "product": "60d5ec49c1234567890abcde",
    "attributes": { "color": "red" },
    "variantImage": ["key1", "key2"],
    "price": 100,
    "markup": 10,
    "sku": "ELEC-APPLE-LAPPR-RED",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Get Variant by ID

```
GET /variant/product/60d5ec49c1234567890abcd0
```

Returns variant document with `variantImage` replaced by presigned URLs.

---

## Service Methods

### `create(dto: CreateVariantDto)`

Wrapper around `createInternal`; returns standard success object.

### `findById(variantId: string)`

- Fetches variant by id using `.lean()`.
- Converts `variantImage` keys to presigned URLs via `StorageService`.
- Returns success/failure wrapper.

### `createInternal(...)`

Used by controller and `ProductsService` during product creation.

Parameters:

- `productId`: string
- `attributes`: Record<string,string> (default `{}`)
- `price`: number
- `markup?`: number
- `imageUrls`: string[] (storage keys)
- `session?`: `ClientSession` for transactions

Process:

1. Verify product exists (`productModel.findById(...).session(session || null)`).
2. Generate SKU using category, brand, label, attributes.
3. Check for existing variant with same SKU in same session.
4. Create variant document (`new this.variantModel({...}).save({ session })`).
5. Increment parent product’s `variantCount` (`$inc: { variantCount: 1 }`).
6. Return new variant.

Throws `BadRequestException` for missing product or duplicate SKU.

---

## SKU Generation

Helper methods in service:

```ts
private normalize(value: string, length = 5): string { ... }

private generateVariantCode(attributes: Record<string, string>): string { ... }

private generateSku(
  category: string,
  brand: string,
  productLabel: string,
  attributes: Record<string, string>,
): string { ... }
```

Algorithm:

1. Clean and uppercase each component (category, brand, product label).
2. Attributes keys sorted; each value normalized to 6 chars.
3. SKU format: `CAT-BRAND-PRODLABEL-ATTRCODE`

Example:

```
category = 'Electronics' -> ELEC
brand = 'Apple'         -> APPLE
label = 'LAPPR'         -> LAPPR
attributes = { color: 'red' } -> RED (normalized 6)
→ SKU = 'ELEC-APPLE-LAPPR-RED'
```

---

## Integration Points

- **Product Module**
  - `ProductsService.create()` calls `variantService.createInternal()` within a
    MongoDB transaction.

- **Storage Module**
  - `VariantController` uploads image files and receives storage keys.
  - `VariantService.findById()` generates presigned URLs for returned keys.

- **Auth Module**
  - All endpoints require a valid JWT (no roles restricted).

---

## Best Practices & Notes

- Variants are always tied to an existing product.
- SKU is immutable once created; duplicates throw error.
- Use `createInternal` when variants are created alongside product
  (session support).
- Images are stored externally; database holds keys only.
- When fetching, convert keys to URLs for client consumption.
- Validation via class-validator ensures data integrity.

---

## Common Use Cases

1. **Create a Variant independently**

   ```bash
   POST /variant
   Content-Type: multipart/form-data
   Authorization: Bearer <token>

   body: {
     product: "60d5ec49c1234567890abcde",
     price: 10,
     attributes: {"size":"M","color":"blue"}
   }
   files: productImage[]
   ```

2. **Retrieve a variant**

   ```bash
   GET /variant/product/60d5ec49c1234567890abcd0
   Authorization: Bearer <token>
   ```

---

## File Paths Reference

- [`src/variant/variant.module.ts`](variant.module.ts)
- [`src/variant/variant.controller.ts`](variant.controller.ts)
- [`src/variant/variant.service.ts`](variant.service.ts)
- [`src/variant/dto/create-variant.dto.ts`](dto/create-variant.dto.ts)
- [`src/variant/dto/update-variant.dto.ts`](dto/update-variant.dto.ts)
- [`src/variant/schemas/variant.schema.ts`](schemas/variant.schema.ts)

---

Last updated: February 26 2026.// filepath: /Users/sohanchatterjee/Desktop/dev/warehouse-management-nest/src/variant/VARIANT.doc.md

# Variant Module Documentation

## Overview

The Variant Module manages product variants – distinct versions of a product
differentiated by attributes such as color, size, etc.  
It provides endpoints for creating variants, uploading images, generating SKUs,
and retrieving variant information. The service is used by the Product module
during product creation to create variants in a transaction.

---

## Table of Contents

1. [Module Structure](#module-structure)
2. [Data Model](#data-model)
3. [DTOs](#dtos)
4. [API Endpoints](#api-endpoints)
5. [Service Methods](#service-methods)
6. [SKU Generation](#sku-generation)
7. [Integration Points](#integration-points)
8. [Best Practices & Notes](#best-practices--notes)

---

## Module Structure

```
src/variant/
├── variant.module.ts
├── variant.controller.ts
├── variant.service.ts
├── dto/
│   ├── create-variant.dto.ts
│   └── update-variant.dto.ts
└── schemas/
    └── variant.schema.ts
```

---

## Data Model

### `Variant` schema (`variant.schemas.ts`)

```ts
@Schema({ timestamps: true })
export class Variant {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: Map, of: String, default: {} })
  attributes: Record<string, string>;

  @Prop([String])
  variantImage: string[];

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: false, min: 0, max: 100, default: 10 })
  markup: number;

  @Prop({ required: true, unique: true, immutable: true })
  sku: string;
}
```

Fields

- `product` – ObjectId reference to the parent product.
- `attributes` – key/value map of variant attributes.
- `variantImage` – array of storage keys for images.
- `price` – cost price (>= 0).
- `markup` – percentage markup (0‑100, default 10).
- `sku` – generated SKU, unique and immutable.

---

## DTOs

### `CreateVariantDto`

```ts
export class CreateVariantDto {
  @IsMongoId()
  product: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  productImage?: string[];

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  markup?: number;
}
```

### `UpdateVariantDto`

Extends `CreateVariantDto` with `PartialType` (all fields optional).

---

## API Endpoints

All routes are guarded by `AuthGuard` (JWT).

| Method | Path                   | Description                                               |
| ------ | ---------------------- | --------------------------------------------------------- |
| POST   | `/variant`             | Create a new variant                                      |
| GET    | `/variant/product/:id` | Retrieve variant by id (returns variant + presigned URLs) |

### Create Variant

**Request:** multipart/form-data, optional image files  
**Body:** fields defined in `CreateVariantDto`  
**Process:**

1. Uploads images via `StorageService` (memoryStorage).
2. Collects returned keys.
3. Calls `VariantService.create()`.

**Example Response:**

```json
{
  "success": true,
  "message": "Variant created successfully",
  "data": {
    "_id": "60d5ec49c1234567890abcd0",
    "product": "60d5ec49c1234567890abcde",
    "attributes": { "color": "red" },
    "variantImage": ["key1", "key2"],
    "price": 100,
    "markup": 10,
    "sku": "ELEC-APPLE-LAPPR-RED",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Get Variant by ID

```
GET /variant/product/60d5ec49c1234567890abcd0
```

Returns variant document with `variantImage` replaced by presigned URLs.

---

## Service Methods

### `create(dto: CreateVariantDto)`

Wrapper around `createInternal`; returns standard success object.

### `findById(variantId: string)`

- Fetches variant by id using `.lean()`.
- Converts `variantImage` keys to presigned URLs via `StorageService`.
- Returns success/failure wrapper.

### `createInternal(...)`

Used by controller and `ProductsService` during product creation.

Parameters:

- `productId`: string
- `attributes`: Record<string,string> (default `{}`)
- `price`: number
- `markup?`: number
- `imageUrls`: string[] (storage keys)
- `session?`: `ClientSession` for transactions

Process:

1. Verify product exists (`productModel.findById(...).session(session || null)`).
2. Generate SKU using category, brand, label, attributes.
3. Check for existing variant with same SKU in same session.
4. Create variant document (`new this.variantModel({...}).save({ session })`).
5. Increment parent product’s `variantCount` (`$inc: { variantCount: 1 }`).
6. Return new variant.

Throws `BadRequestException` for missing product or duplicate SKU.

---

## SKU Generation

Helper methods in service:

```ts
private normalize(value: string, length = 5): string { ... }

private generateVariantCode(attributes: Record<string, string>): string { ... }

private generateSku(
  category: string,
  brand: string,
  productLabel: string,
  attributes: Record<string, string>,
): string { ... }
```

Algorithm:

1. Clean and uppercase each component (category, brand, product label).
2. Attributes keys sorted; each value normalized to 6 chars.
3. SKU format: `CAT-BRAND-PRODLABEL-ATTRCODE`

Example:

```
category = 'Electronics' -> ELEC
brand = 'Apple'         -> APPLE
label = 'LAPPR'         -> LAPPR
attributes = { color: 'red' } -> RED (normalized 6)
→ SKU = 'ELEC-APPLE-LAPPR-RED'
```

---

## Integration Points

- **Product Module**
  - `ProductsService.create()` calls `variantService.createInternal()` within a
    MongoDB transaction.

- **Storage Module**
  - `VariantController` uploads image files and receives storage keys.
  - `VariantService.findById()` generates presigned URLs for returned keys.

- **Auth Module**
  - All endpoints require a valid JWT (no roles restricted).

---

## Best Practices & Notes

- Variants are always tied to an existing product.
- SKU is immutable once created; duplicates throw error.
- Use `createInternal` when variants are created alongside product
  (session support).
- Images are stored externally; database holds keys only.
- When fetching, convert keys to URLs for client consumption.
- Validation via class-validator ensures data integrity.

---

## Common Use Cases

1. **Create a Variant independently**

   ```bash
   POST /variant
   Content-Type: multipart/form-data
   Authorization: Bearer <token>

   body: {
     product: "60d5ec49c1234567890abcde",
     price: 10,
     attributes: {"size":"M","color":"blue"}
   }
   files: productImage[]
   ```

2. **Retrieve a variant**

   ```bash
   GET /variant/product/60d5ec49c1234567890abcd0
   Authorization: Bearer <token>
   ```

---

## File Paths Reference

- [`src/variant/variant.module.ts`](variant.module.ts)
- [`src/variant/variant.controller.ts`](variant.controller.ts)
- [`src/variant/variant.service.ts`](variant.service.ts)
- [`src/variant/dto/create-variant.dto.ts`](dto/create-variant.dto.ts)
- [`src/variant/dto/update-variant.dto.ts`](dto/update-variant.dto.ts)
- [`src/variant/schemas/variant.schema.ts`](schemas/variant.schema.ts)

---

Last updated: February 26 2026.
