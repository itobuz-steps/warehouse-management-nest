# Product Module Documentation

## Overview

The Product Module is a core feature of the warehouse management system that handles product creation, retrieval, updating, and archival. It manages product information, variants, categorization, and generates QR codes for product tracking.

---

## Table of Contents

1. [Module Structure](#module-structure)
2. [Data Models](#data-models)
3. [API Endpoints](#api-endpoints)
4. [Service Methods](#service-methods)
5. [Module Dependencies](#module-dependencies)
6. [Security & Guards](#security--guards)
7. [File Upload](#file-upload)
8. [Database Transactions](#database-transactions)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Module Structure

### Files

```
src/products/
├── products.module.ts           # Module definition
├── products.controller.ts       # HTTP endpoints
├── products.service.ts          # Business logic
├── product.doc.md              # This documentation
├── entities/
│   └── product.entity.ts        # Database schema
├── constants/
│   └── product.constant.ts      # Enums and constants
└── dto/
    ├── create-product.dto.ts    # Create DTO
    ├── update-product.dto.ts    # Update DTO
    ├── get-product-query.dto.ts # Query DTO
    └── get-warehouse-products-query.ts # Warehouse query DTO
```

---

## Data Models

### Product Entity

The Product entity represents a product in the warehouse:

```typescript
{
  _id: ObjectId,
  name: string,
  category: PRODUCT_CATEGORY_TYPES,
  brand: string (uppercase, required),
  label: string (unique uppercase identifier),
  description: string,
  createdBy: ObjectId (User reference),
  isArchived: boolean (default: false),
  variantCount: number (default: 0),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

### Product Categories

**PRODUCT_CATEGORY_TYPES Enum:**

```typescript
- ELECTRONICS = 'Electronics'
- FURNITURE = 'Furniture'
- CLOTHING = 'Clothing'
- FOOD_BEVERAGE = 'Food & Beverage'
- MEDICAL_SUPPLIES = 'Medical Supplies'
- INDUSTRIAL_TOOLS = 'Industrial Tools'
- AUTOMOTIVE_PARTS = 'Automotive Parts'
- OFFICE_SUPPLIES = 'Office Supplies'
- ACCESSORIES = 'Accessories'
```

### Sort Options

**SORT_CATEGORY Enum:**

```typescript
- NAME_ASC = 'name_asc'           # Sort by name (ascending)
- NAME_DESC = 'name_desc'         # Sort by name (descending)
- CATEGORY_ASC = 'category_asc'   # Sort by category (ascending)
- CATEGORY_DESC = 'category_desc' # Sort by category (descending)
- LATEST = 'latest'               # Most recently created
- QUANTITY_ASC = 'quantity_asc'   # Sort by quantity (ascending)
- QUANTITY_DESC = 'quantity_desc' # Sort by quantity (descending)
```

---

## API Endpoints

### 1. Get All Products

**Endpoint:** `GET /product`

**Authentication:** Required (Bearer Token)

**Query Parameters:**

| Parameter  | Type                   | Required | Description                               |
| ---------- | ---------------------- | -------- | ----------------------------------------- |
| `search`   | string                 | No       | Search by product name (case-insensitive) |
| `category` | PRODUCT_CATEGORY_TYPES | No       | Filter by category                        |
| `sort`     | SORT_CATEGORY          | No       | Sort order                                |
| `page`     | string                 | No       | Page number (default: 1)                  |
| `limit`    | string                 | No       | Items per page (default: 10)              |

**Example Request:**

```bash
GET /product?search=laptop&category=Electronics&sort=latest&page=1&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "60d5ec49c1234567890abcde",
        "name": "Laptop Pro",
        "category": "Electronics",
        "brand": "APPLE",
        "label": "LAPPR",
        "description": "High performance laptop",
        "createdBy": "60d5ec49c1234567890abcdf",
        "isArchived": false,
        "variantCount": 5,
        "createdAt": "2025-02-25T10:30:00Z",
        "updatedAt": "2025-02-25T10:30:00Z"
      }
    ],
    "totalCount": 50,
    "totalPages": 5,
    "currentPage": 1,
    "productsPerPage": 10
  }
}
```

---

### 2. Get Warehouse Products

**Endpoint:** `GET /product/warehouse-products`

**Authentication:** Required (Bearer Token)

**Query Parameters:**

| Parameter     | Type   | Required | Description            |
| ------------- | ------ | -------- | ---------------------- |
| `warehouseId` | string | No       | Filter by warehouse ID |
| `category`    | string | No       | Filter by category     |

**Process:**

1. Queries VariantStock collection for products in the warehouse
2. Filters by warehouse ID if provided
3. Filters by category if provided
4. Returns only non-archived products

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49c1234567890abcde",
      "name": "Laptop Pro",
      "category": "Electronics",
      "brand": "APPLE",
      "label": "LAPPR",
      "description": "High performance laptop",
      "createdBy": "60d5ec49c1234567890abcdf",
      "isArchived": false,
      "variantCount": 5,
      "createdAt": "2025-02-25T10:30:00Z",
      "updatedAt": "2025-02-25T10:30:00Z"
    }
  ]
}
```

---

### 3. Create Product

**Endpoint:** `POST /product`

**Authentication:** Required

**Content-Type:** multipart/form-data

**Body Parameters:**

| Parameter           | Type   | Required | Description                             |
| ------------------- | ------ | -------- | --------------------------------------- |
| `name`              | string | Yes      | Product name                            |
| `category`          | string | Yes      | Product category (must be valid enum)   |
| `brand`             | string | Yes      | Product brand                           |
| `label`             | string | No       | Product label (auto-generated if empty) |
| `description`       | string | No       | Product description                     |
| `price`             | number | Yes      | Cost price (must be >= 0)               |
| `markup`            | number | No       | Markup percentage (0-100)               |
| `variantAttributes` | object | Yes      | Variant attributes as JSON string       |
| `productImage`      | File[] | No       | Product images (max 5 files)            |
| `isArchived`        | bool   | No       | Archive status (default: false)         |

**Validation Rules:**

```typescript
- name: required, string, non-empty
- category: required, must match PRODUCT_CATEGORY_TYPES enum
- brand: required, string (converted to uppercase)
- price: required, number >= 0
- markup: optional, number between 0-100
- variantAttributes: required, valid JSON object
- productImage: optional, valid URLs only
- description: optional, string
```

**Request Example:**

```bash
curl -X POST http://localhost:3000/product \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Laptop Pro" \
  -F "category=Electronics" \
  -F "brand=Apple" \
  -F "price=1200" \
  -F "markup=20" \
  -F 'variantAttributes={"color":"silver","storage":"256GB"}' \
  -F "productImage=@image1.jpg" \
  -F "productImage=@image2.jpg"
```

**Process Flow:**

1. Validates input using `CreateProductDto`
2. Extracts user ID from authenticated request
3. Processes uploaded images
4. Starts MongoDB transaction session
5. Generates unique uppercase label from product name
6. Creates product document with:
   - Normalized name (lowercase)
   - Brand (uppercase)
   - Label (uppercase)
   - variantCount: 0
7. Creates variants through `VariantService.createInternal()`
8. Creates transaction log entry
9. Commits transaction
10. Returns created product

**Response:**

```json
{
  "success": true,
  "message": "Product Successfully Saved",
  "data": {
    "_id": "60d5ec49c1234567890abcde",
    "name": "Laptop Pro",
    "category": "Electronics",
    "brand": "APPLE",
    "label": "LAPPR",
    "description": "High performance laptop",
    "createdBy": "60d5ec49c1234567890abcdf",
    "isArchived": false,
    "variantCount": 1,
    "createdAt": "2025-02-25T10:30:00Z",
    "updatedAt": "2025-02-25T10:30:00Z"
  }
}
```

**Error Responses:**

```json
{
  "statusCode": 400,
  "message": "Product name is required"
}
```

---

### 4. Update Product

**Endpoint:** `PUT /product/:id`

**Authentication:** Required

**Content-Type:** application/json

**URL Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| `id`      | string | Yes      | Product MongoDB ID |

**Body:**

```json
{
  "description": "Updated description (optional)"
}
```

**Note:** Currently only `description` field is updatable via the DTO. Other fields require direct database modification.

**Response:**

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "_id": "60d5ec49c1234567890abcde",
    "name": "Laptop Pro",
    "category": "Electronics",
    "brand": "APPLE",
    "label": "LAPPR",
    "description": "Updated description",
    "createdBy": "60d5ec49c1234567890abcdf",
    "isArchived": false,
    "variantCount": 1,
    "updatedAt": "2025-02-25T11:00:00Z"
  }
}
```

**Error Response:**

```json
{
  "statusCode": 404,
  "message": "Product not found"
}
```

---

### 5. Delete Product (Archive)

**Endpoint:** `DELETE /product/:id`

**Authentication:** Required

**Authorization:** Admin only (`USER_TYPES.ADMIN`)

**URL Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| `id`      | string | Yes      | Product MongoDB ID |

**Process:**

1. Validates user is admin
2. Sets `isArchived` field to `true` (soft delete)
3. Creates transaction log entry
4. Returns success message

**Response:**

```json
{
  "success": true,
  "message": "Product archived successfully"
}
```

**Error Responses:**

```json
{
  "statusCode": 403,
  "message": "Forbidden - Admin access required"
}
```

```json
{
  "statusCode": 404,
  "message": "Product not found"
}
```

---

### 6. Restore Product

**Endpoint:** `PATCH /product/:id`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| `id`      | string | Yes      | Product MongoDB ID |

**Process:**

1. Sets `isArchived` field to `false`
2. Creates transaction log entry
3. Returns success message

**Response:**

```json
{
  "success": true,
  "message": "Product restored successfully"
}
```

---

### 7. Get Archived Products

**Endpoint:** `GET /product/archived/all`

**Authentication:** Required

**Authorization:** Admin only (`USER_TYPES.ADMIN`)

**Query Parameters:** Same as [Get All Products](#1-get-all-products)

**Response:** Same paginated format as Get All Products, but only archived products

```json
{
  "success": true,
  "data": {
    "products": [
      /* archived products */
    ],
    "totalCount": 10,
    "totalPages": 1,
    "currentPage": 1,
    "productsPerPage": 10
  }
}
```

---

### 8. Generate QR Code

**Endpoint:** `GET /product/qr/:id`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| `id`      | string | Yes      | Product MongoDB ID |

**Process:**

1. Retrieves product by ID
2. Constructs QR URL: `{protocol}://{FRONTEND_URL}/pages/qr-product.html?id={productId}`
3. Generates QR code image using `qrcode` library
4. Returns PNG image binary

**Response:** PNG image file

**Headers:**

```
Content-Type: image/png
Content-Disposition: inline; filename="qrcode.png"
```

**Example:**

```bash
curl -X GET http://localhost:3000/product/qr/60d5ec49c1234567890abcde \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o qrcode.png
```

**Error Response:**

```json
{
  "statusCode": 404,
  "message": "Product not found"
}
```

---

### 9. Get Product by ID

**Endpoint:** `POST /product/qr/:id`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| `id`      | string | Yes      | Product MongoDB ID |

**Note:** This endpoint uses POST method (typically GET would be used, but implementation uses POST)

**Response:**

```json
{
  "success": true,
  "message": "Product with specific id",
  "data": {
    "_id": "60d5ec49c1234567890abcde",
    "name": "Laptop Pro",
    "category": "Electronics",
    "brand": "APPLE",
    "label": "LAPPR",
    "description": "High performance laptop",
    "createdBy": "60d5ec49c1234567890abcdf",
    "isArchived": false,
    "variantCount": 5,
    "createdAt": "2025-02-25T10:30:00Z",
    "updatedAt": "2025-02-25T10:30:00Z"
  }
}
```

---

## Service Methods

### ProductsService

#### `getProducts(queryDto: GetProductsQueryDto): Promise<PaginatedProducts>`

Retrieves paginated list of active products with filtering and sorting.

**Parameters:**

```typescript
GetProductsQueryDto {
  search?: string;        // Filter by product name (case-insensitive regex)
  category?: string;      // Filter by category
  sort?: SORT_CATEGORY;   // Apply sorting rules
  page?: string;          // Page number (default: '1')
  limit?: string;         // Items per page (default: '10')
}
```

**Filter Logic:**

- Only returns products where `isArchived: false`
- Search uses MongoDB regex with case-insensitive option
- Category filter is exact match

**Sorting Logic:**

```typescript
NAME_ASC: { name: 1 }
NAME_DESC: { name: -1 }
CATEGORY_ASC: { category: 1 }
CATEGORY_DESC: { category: -1 }
LATEST (default): { createdAt: -1 }
```

**Pagination:**

- Minimum page: 1
- Minimum limit: 1
- Default page: 1
- Default limit: 10

**Returns:**

```typescript
{
  products: Product[],
  totalCount: number,
  totalPages: number,
  currentPage: number,
  productsPerPage: number
}
```

**Example:**

```typescript
const result = await this.productsService.getProducts({
  search: 'laptop',
  category: 'Electronics',
  sort: 'latest',
  page: '1',
  limit: '10',
});
```

---

#### `getProductsForWarehouse(query: GetWarehouseProductsQueryDto): Promise<Product[]>`

Retrieves products available in a specific warehouse by checking VariantStock collection.

**Parameters:**

```typescript
GetWarehouseProductsQueryDto {
  warehouseId?: string;  // Warehouse MongoDB ID
  category?: string;     // Filter by category
}
```

**Logic:**

1. If `warehouseId` provided:
   - Queries VariantStock collection
   - Finds all distinct productIds in that warehouse
   - Filters Product collection by those IDs

2. If `category` provided:
   - Adds category filter to Product query

3. Always filters out archived products (`isArchived: false`)

**Returns:** `Product[]` (unsorted, unfiltered except for above criteria)

**Example:**

```typescript
const products = await this.productsService.getProductsForWarehouse({
  warehouseId: '507f1f77bcf86cd799439011',
  category: 'Electronics',
});
```

---

#### `create(userId: Types.ObjectId, createProductDto: CreateProductDto, user: UserDocument, imageUrls: string[]): Promise<Product>`

Creates new product with variants in a database transaction.

**Parameters:**

- `userId` - User creating the product (Types.ObjectId)
- `createProductDto` - Product creation DTO with validation
- `user` - Full user document (for audit logging)
- `imageUrls` - Array of image URLs from file upload

**Process:**

1. **Start Transaction**

   ```typescript
   const session = await this.productModel.db.startSession();
   session.startTransaction();
   ```

2. **Generate Unique Label**

   ```typescript
   const normalizedName = createProductDto.name
     .toUpperCase()
     .replace(/[^A-Z0-9]/g, '');
   const label = await this.generateUniqueLabel(normalizedName);
   ```

3. **Create Product**

   ```typescript
   const product = await new this.productModel({
     name: createProductDto.name,
     category: createProductDto.category,
     description: createProductDto.description,
     isArchived: createProductDto.isArchived || false,
     createdBy: userId,
     brand: createProductDto.brand,
     label: createProductDto.label || label,
     variantCount: 0,
   }).save({ session });
   ```

4. **Create Audit Log**

   ```typescript
   await this.logsService.createLog({
     action: LOG_ACTION.PRODUCT_CREATED,
     entityType: LOG_ENTITY_TYPE.PRODUCT,
     entityId: product._id.toHexString(),
     performedBy: user,
     metadata: {
       /* product data */
     },
   });
   ```

5. **Create Variants**

   ```typescript
   await this.variantService.createInternal(
     product._id.toString(),
     createProductDto.variantAttributes,
     createProductDto.price,
     createProductDto.markup,
     imageUrls,
     user,
     session,
   );
   ```

6. **Commit or Abort**
   ```typescript
   await session.commitTransaction();
   await session.endSession();
   ```

**Label Generation Algorithm:**

```
1. Start with first 5 characters of normalized name (uppercase)
2. Query database: "Does this label exist?"
3. If NO: Return this label
4. If YES:
   - Increase substring length by 1
   - Repeat from step 2
5. If entire name exhausted:
   - Append counter: "{base}1", "{base}2", etc.
   - Repeat until unique label found
```

**Returns:** Created Product document

**Throws:**

- `BadRequestException` - Invalid input validation
- `ConflictException` - Persistent label generation conflict
- Database/validation errors from VariantService

**Example:**

```typescript
const product = await this.productsService.create(
  userId,
  {
    name: 'Laptop Pro',
    category: 'Electronics',
    brand: 'Apple',
    price: 1200,
    markup: 20,
    variantAttributes: { color: 'silver', storage: '256GB' },
  },
  user,
  ['https://example.com/image1.jpg'],
);
```

---

#### `update(id: string, updateProductDto: updateProductDto, user: UserDocument): Promise<Product>`

Updates product by ID with audit logging.

**Parameters:**

- `id` - Product ID (MongoDB ObjectId string)
- `updateProductDto` - DTO containing only description field
- `user` - Full user document (for audit logging)

**Update Logic:**

1. Validates product exists
2. Captures old values
3. Applies update via `findByIdAndUpdate`
4. Captures new values
5. Creates audit log with old/new comparison

**Allowed Updates:**

- `description` field only

**Returns:** Updated Product document

**Throws:**

- `NotFoundException` - Product not found

**Audit Log Created:**

```typescript
{
  action: LOG_ACTION.PRODUCT_UPDATED,
  entityType: LOG_ENTITY_TYPE.PRODUCT,
  metadata: {
    oldValue: { description: '...' },
    newValue: { description: '...' }
  }
}
```

**Example:**

```typescript
const updated = await this.productsService.update(
  '507f1f77bcf86cd799439011',
  { description: 'New description' },
  user,
);
```

---

#### `remove(id: string, user: UserDocument): Promise<Product>`

Archives (soft-delete) a product.

**Parameters:**

- `id` - Product ID (MongoDB ObjectId string)
- `user` - Full user document (for audit logging)

**Process:**

1. Updates product: `{ isArchived: true }`
2. Creates audit log entry
3. Product still exists in database
4. Won't appear in active queries

**Returns:** Archived Product document

**Throws:**

- `NotFoundException` - Product not found

**Audit Log Created:**

```typescript
{
  action: LOG_ACTION.PRODUCT_ARCHIVED,
  entityType: LOG_ENTITY_TYPE.PRODUCT,
  metadata: {
    name: product.name,
    isArchived: true
  }
}
```

**Example:**

```typescript
await this.productsService.remove('507f1f77bcf86cd799439011', user);
```

---

#### `restore(id: string, user: UserDocument): Promise<Product>`

Restores an archived product.

**Parameters:**

- `id` - Product ID
- `user` - Full user document (for audit logging)

**Process:**

1. Updates product: `{ isArchived: false }`
2. Creates audit log entry
3. Product now appears in active queries

**Returns:** Restored Product document

**Throws:**

- `NotFoundException` - Product not found

**Audit Log Created:**

```typescript
{
  action: LOG_ACTION.PRODUCT_RESTORED,
  entityType: LOG_ENTITY_TYPE.PRODUCT,
  metadata: {
    name: product.name,
    isArchived: false
  }
}
```

**Example:**

```typescript
await this.productsService.restore('507f1f77bcf86cd799439011', user);
```

---

#### `findOne(id: string): Promise<Product>`

Retrieves single product by ID.

**Parameters:**

- `id` - Product ID (MongoDB ObjectId string)

**Returns:** Product document

**Throws:**

- `NotFoundException` - Product not found

**Example:**

```typescript
const product = await this.productsService.findOne('507f1f77bcf86cd799439011');
```

---

#### `findArchived(queryDto: GetProductsQueryDto): Promise<PaginatedProducts>`

Retrieves paginated list of archived products with filtering and sorting.

**Parameters:** Same as `getProducts()`

**Filter Logic:**

- Only returns products where `isArchived: true`
- Search applies to product name
- Category filter is exact match

**Returns:** Paginated archived products with metadata

**Example:**

```typescript
const archived = await this.productsService.findArchived({
  search: 'laptop',
  page: '1',
  limit: '10',
});
```

---

#### `generateQrCode(url: string): Promise<Buffer>`

Generates QR code PNG buffer from URL using `qrcode` library.

**Parameters:**

- `url` - URL to encode in QR code

**Returns:** PNG image buffer

**Example:**

```typescript
const qrBuffer = await this.productsService.generateQrCode(
  'https://example.com/qr-product.html?id=123',
);
```

---

#### `generateUniqueLabel(base: string): Promise<string>` (Private)

Generates unique product label from base string.

**Algorithm:**

```
1. Start with base.slice(0, 5)
2. Query database for existing label
3. If NOT found: Return label
4. If FOUND:
   - Increase length by 1: base.slice(0, 6)
   - Repeat from step 2
5. If entire base exhausted:
   - Set counter = 1
   - Try: "{base.slice(0, 5)}{counter}"
   - Repeat until unique or increment counter
```

**Example:**

```
Input: 'Laptop Pro'
Normalized: 'LAPTOPPRO'

Step 1: Check 'LAPPR' - Not found → Return 'LAPPR'

Alternative if 'LAPPR' exists:
Step 1: Check 'LAPPR' - Found
Step 2: Check 'LAPTOP' - Not found → Return 'LAPTOP'

Alternative if 'LAPTOP' exists:
Step 1-3: All substring lengths exhausted
Step 4: Check 'LAPPR1' - Not found → Return 'LAPPR1'
```

---

## Module Dependencies

### Injected Models

| Model               | Provider                          | Purpose                        |
| ------------------- | --------------------------------- | ------------------------------ |
| `ProductModel`      | `@InjectModel(Product.name)`      | Main product schema operations |
| `VariantStockModel` | `@InjectModel(VariantStock.name)` | Warehouse stock tracking       |

### Injected Services

| Service                  | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `VariantService`         | Create/manage product variants            |
| `TransactionLogsService` | Audit logging for all product operations  |
| `StorageService`         | File upload and URL management            |
| `ConfigService`          | Read environment variables (FRONTEND_URL) |

### Module Registration

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: VariantStock.name, schema: VariantStockSchema },
    ]),
    VariantModule,
    TransactionLogsModule,
    StorageModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

---

## Security & Guards

### Authentication

**Guard:** `AuthGuard` (from custom guard implementation)

**Applied To:** All controller methods

**Mechanism:**

- Extracts JWT token from Authorization header
- Validates token signature and expiration
- Injects user data into request object (req.user)

**Token Format:**

```
Authorization: Bearer <JWT_TOKEN>
```

### Authorization

**Decorator:** `@Roles(USER_TYPES.ADMIN)`

**Protected Endpoints:**

1. `DELETE /product/:id` - Archive product (requires ADMIN role)
2. `GET /product/archived/all` - View archived products (requires ADMIN role)

**User Types:**

```typescript
enum USER_TYPES {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  // ... other types
}
```

### Request Context

**Type:** `RequestWithUser`

```typescript
interface RequestWithUser extends Request {
  user: {
    _id: ObjectId;
    email: string;
    roles: USER_TYPES[];
    // ... other user properties
  };
}
```

### Documentation

**Decorator:** `@ApiBearerAuth()` (Swagger)

- Applied at controller level
- Indicates Bearer token requirement in API docs

---

## File Upload

### Configuration

```typescript
@UseInterceptors(
  FilesInterceptor(
    FILE_FIELD.productImage,  // Field name: 'productImage'
    FILE_COUNT,               // Max files: typically 5
    { storage: multerStorage() }  // Custom storage config
  )
)
```

### File Parameters

| Parameter  | Value          | Description                      |
| ---------- | -------------- | -------------------------------- |
| Field Name | `productImage` | Form field name for file upload  |
| Max Files  | 5              | Maximum files per request        |
| Storage    | Multer custom  | Configured via `multerStorage()` |

### Supported File Types

Based on multer configuration:

- `.jpg` / `.jpeg`
- `.png`
- `.gif`
- `.webp`
- (Configured in multer.ts)

### Upload Flow

1. **Multer Validation**
   - Validates file types
   - Checks file size
   - Enforces file count limit

2. **File Processing**

   ```typescript
   if (files && files.length) {
     const uploadedImages =
       await this.storageService.uploadMultipleFiles(files);
     imageUrls.push(...uploadedImages.map((img) => img.key));
   }
   ```

3. **URL Generation**
   - Storage service returns file keys
   - Keys used as URLs in product creation

4. **Variant Image Association**
   - URLs passed to VariantService
   - Images associated with product variants

**Error Handling:**

- Invalid file types: Rejected by Multer
- Exceeds max count: Rejected by Multer
- Upload failure: Throws exception, transaction rolls back

---

## Database Transactions

### Used In

Product creation via `create()` method

### Transaction Implementation

```typescript
const session = await this.productModel.db.startSession();
session.startTransaction();

try {
  // 1. Create product document
  const product = await new this.productModel({...}).save({ session });

  // 2. Create audit log
  await this.logsService.createLog({...});

  // 3. Create variants
  await this.variantService.createInternal(..., session);

  // Commit if all successful
  await session.commitTransaction();
  await session.endSession();
  return product;
} catch (error) {
  // Rollback on any error
  await session.abortTransaction();
  await session.endSession();
  throw error;
}
```

### ACID Properties

| Property    | Assurance                                                |
| ----------- | -------------------------------------------------------- |
| Atomicity   | All product/variant/log operations succeed or all fail   |
| Consistency | Product and variants always in sync, no orphaned records |
| Isolation   | Concurrent requests don't interfere with each other      |
| Durability  | Committed data persists in database                      |

### Benefits

- **Data Integrity:** Product and variants created atomically
- **Error Recovery:** Automatic rollback on failure
- **No Orphans:** Partial failures don't leave inconsistent state
- **Audit Trail:** Log creation is part of transaction

---

## Error Handling

### HTTP Status Codes

| Status | Error Type            | Example                                   |
| ------ | --------------------- | ----------------------------------------- |
| 400    | Bad Request           | Invalid category enum, validation failed  |
| 401    | Unauthorized          | Missing JWT token or invalid token        |
| 403    | Forbidden             | Non-admin trying to delete product        |
| 404    | Not Found             | Product ID doesn't exist                  |
| 409    | Conflict              | Label generation conflict                 |
| 500    | Internal Server Error | Database connection error, unexpected err |

### Exception Types & Handling

**NotFoundException**

```typescript
if (!product) {
  throw new NotFoundException('Product not found');
}
```

Response:

```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

**BadRequestException**

```typescript
throw new BadRequestException('Invalid input');
```

Response:

```json
{
  "statusCode": 400,
  "message": "Invalid input",
  "error": "Bad Request"
}
```

**Validation Errors (from DTO)**

Response:

```json
{
  "statusCode": 400,
  "message": [
    "name must be a string",
    "category must be a valid enum value",
    "price must be a positive number"
  ],
  "error": "Bad Request"
}
```

### Transaction Error Handling

```typescript
try {
  // ... operations
} catch (error) {
  await session.abortTransaction();
  await session.endSession();
  throw error; // Re-throw for controller handling
}
```

---

## Best Practices

### 1. Authentication & Authorization

```typescript
// ✓ DO - All endpoints require authentication
@UseGuards(AuthGuard)
@Get()
async getProducts() { }

// ✓ DO - Admin endpoints explicit
@Roles(USER_TYPES.ADMIN)
@Delete(':id')
async deleteProduct() { }

// ✗ DON'T - Expose endpoints without guards
@Get()
async getProducts() { }
```

### 2. Pagination

```typescript
// ✓ DO - Always paginate results
GET /product?page=1&limit=10

// ✗ DON'T - Fetch all records without pagination
GET /product
```

### 3. Input Validation

```typescript
// ✓ DO - Use DTOs with class-validator
@Body() createProductDto: CreateProductDto

// ✗ DON'T - Skip validation or use any type
@Body() data: any
```

### 4. Error Handling

```typescript
// ✓ DO - Throw specific exceptions
if (!product) {
  throw new NotFoundException('Product not found');
}

// ✗ DON'T - Generic errors or returning null
if (!product) return null;
```

### 5. Transactions

```typescript
// ✓ DO - Use transactions for related operations
const session = await model.db.startSession();
session.startTransaction();
// ... operations with { session }
await session.commitTransaction();

// ✗ DON'T - Separate operations without transaction
await productModel.create(data);
await variantService.create(data);
```

### 6. Search Safety

```typescript
// ✓ DO - Use MongoDB operators safely
const filter = { name: { $regex: search, $options: 'i' } };

// ✗ DON'T - String injection vulnerabilities
const filter = { $where: `this.name == '${search}'` };
```

### 7. Soft Deletes

```typescript
// ✓ DO - Archive instead of permanent delete
await productModel.updateOne({ _id: id }, { isArchived: true });

// ✗ DON'T - Permanently delete data
await productModel.deleteOne({ _id: id });
```

### 8. Audit Logging

```typescript
// ✓ DO - Log all important operations
await this.logsService.createLog({
  action: LOG_ACTION.PRODUCT_CREATED,
  entityType: LOG_ENTITY_TYPE.PRODUCT,
  entityId: product._id.toHexString(),
  performedBy: user,
  metadata: {
    /* details */
  },
});
```

### 9. Response Consistency

```typescript
// ✓ DO - Use consistent format
{
  "success": true,
  "message": "Operation successful",
  "data": { /* payload */ }
}

// ✗ DON'T - Inconsistent structure
{ "product": { } }
{ "data": [ ] }
```

### 10. Label Generation

```typescript
// ✓ DO - Allow custom labels with fallback
label: createProductDto.label || (await this.generateUniqueLabel(name));

// ✗ DON'T - Force auto-generation
label: await this.generateUniqueLabel(name); // Ignores input
```

---

## Common Use Cases

### Use Case 1: Create Product with Variants

```bash
POST /product
Authorization: Bearer <TOKEN>
Content-Type: multipart/form-data

Form Data:
- name: "Laptop Pro"
- category: "Electronics"
- brand: "Apple"
- price: 1200
- markup: 20
- variantAttributes: {"color":"silver","storage":"256gb"}
- productImage: [image1.jpg, image2.jpg]

Response: 201
{
  "success": true,
  "message": "Product Successfully Saved",
  "data": { product document }
}
```

### Use Case 2: Search Products

```bash
GET /product?search=laptop&category=Electronics&sort=latest&page=1&limit=10
Authorization: Bearer <TOKEN>

Response: 200
{
  "success": true,
  "data": {
    "products": [ /* 10 products */ ],
    "totalCount": 45,
    "totalPages": 5,
    "currentPage": 1,
    "productsPerPage": 10
  }
}
```

### Use Case 3: Get Warehouse Products

```bash
GET /product/warehouse-products?warehouseId=507f1f77bcf86cd799439011&category=Electronics
Authorization: Bearer <TOKEN>

Response: 200
{
  "success": true,
  "data": [
    { product1 },
    { product2 },
    ...
  ]
}
```

### Use Case 4: Archive Product

```bash
DELETE /product/60d5ec49c1234567890abcde
Authorization: Bearer <ADMIN_TOKEN>

Response: 200
{
  "success": true,
  "message": "Product archived successfully"
}
```

### Use Case 5: Generate QR Code

```bash
GET /product/qr/60d5ec49c1234567890abcde
Authorization: Bearer <TOKEN>

Response: 200
Content-Type: image/png
[PNG binary data]
```

### Use Case 6: Update Product Description

```bash
PUT /product/60d5ec49c1234567890abcde
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "description": "Updated product description"
}

Response: 200
{
  "success": true,
  "message": "Product updated successfully",
  "data": { updated product }
}
```

---

## Related Modules

| Module           | Purpose                 | Integration Point                      |
| ---------------- | ----------------------- | -------------------------------------- |
| Variant          | Manage product variants | `VariantService.createInternal()`      |
| Transaction Logs | Audit trail             | `TransactionLogsService.createLog()`   |
| Storage          | File upload/management  | `StorageService.uploadMultipleFiles()` |
| Auth             | User authentication     | `AuthGuard` validation                 |

---

## Troubleshooting

### Issue: "Product Not Found"

**Cause:** Invalid product ID or product doesn't exist

**Solutions:**

- Verify product ID format (valid MongoDB ObjectId)
- Confirm product exists: `db.products.findById(id)`
- Check `isArchived` status (may be archived)

### Issue: "Category must be a valid enum value"

**Cause:** Invalid category provided

**Solution:** Use valid values from `PRODUCT_CATEGORY_TYPES` enum

### Issue: "Unauthorized"

**Cause:** Missing or invalid JWT token

**Solution:** Include valid Bearer token in Authorization header

### Issue: "Forbidden resource"

**Cause:** Insufficient permissions (non-admin accessing admin endpoint)

**Solution:** Use admin account or request elevated permissions

### Issue: "Product archived successfully" but product still visible

**Cause:** Querying all products (includes archived)

**Solution:** Use `GET /product/archived/all` to view archived products

### Issue: Transaction Abort Error

**Cause:** Database session error or conflicting operation

**Solutions:**

- Check database connectivity
- Verify variant data is valid
- Retry operation
- Check MongoDB server logs

### Issue: "Price must be greater than or equal to 0"

**Cause:** Negative price provided

**Solution:** Provide price >= 0

### Issue: "Markup cannot be more than 100%"

**Cause:** Markup percentage exceeds 100

**Solution:** Provide markup between 0-100

---

## Version History

| Version | Date       | Changes                       |
| ------- | ---------- | ----------------------------- |
| 2.0     | 2025-03-07 | Updated with current codebase |
| 1.0     | 2025-02-25 | Initial documentation         |

---

## Environment Variables

No product-specific environment variables. Inherits from application config:

- `FRONTEND_URL` - For QR code generation (from ConfigService)
- `DB_URI` - MongoDB connection (from DbModule)
- `JWT_SECRET` - Token validation (from AuthModule)

---

**Last Updated:** 7 March 2026
**Author:** GitHub Copilot (Updated)
**Status:** Active & Current
