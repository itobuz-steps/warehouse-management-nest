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
├── product.type.ts              # TypeScript types
├── PRODUCT.doc.md              # This documentation
├── entities/
│   └── product.entity.ts        # Database schema
├── constants/
│   └── product.constant.ts      # Enums and constants
└── dto/
    ├── create-product.dto.ts    # Create DTO
    ├── update-product.dto.ts    # Update DTO
    └── get-product-query.dto.ts # Query DTO
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
  brand: string,
  label: string (unique uppercase identifier),
  description: string,
  createdBy: ObjectId (User reference),
  isArchived: boolean (default: false),
  variantCount: number (default: 0),
  createdAt: Date,
  updatedAt: Date
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

### 2. Create Product

**Endpoint:** `POST /product`

**Authentication:** Required

**Content-Type:** multipart/form-data

**Body:**

```json
{
  "name": "Laptop Pro (required)",
  "category": "Electronics (required)",
  "brand": "APPLE (required)",
  "description": "High performance laptop (optional)",
  "price": 1200 (required),
  "markup": 20 (optional, 0-100),
  "variantAttributes": { "color": "silver", "storage": "256gb" } (required),
  "productImage": [file1, file2] (optional)
}
```

**Process Flow:**

1. Validates input using `CreateProductDto`
2. Extracts user ID from authenticated request
3. Processes uploaded images and generates URLs
4. Initiates database transaction session
5. Normalizes product name (lowercase)
6. Generates unique uppercase label from product name
7. Creates product document
8. Creates variants through `VariantService`
9. Commits transaction or rolls back on error
10. Returns created product

**Response:**

```json
{
  "success": true,
  "message": "Product Successfully Saved",
  "data": {
    "_id": "60d5ec49c1234567890abcde",
    "name": "laptop pro",
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
// Validation Error
{
  "statusCode": 400,
  "message": "Product name is required"
}

// Unauthorized
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### 3. Update Product

**Endpoint:** `PUT /product/:id`

**Authentication:** Required

**Content-Type:** multipart/form-data

**URL Parameters:**

| Parameter | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| `id`      | string | Product ID (MongoDB ObjectId) |

**Body:**

```json
{
  "name": "Updated Product Name (optional)",
  "category": "Electronics (optional)",
  "description": "Updated description (optional)",
  "price": 1500 (optional),
  "markup": 25 (optional, 0-100),
  "productImage": [file1] (optional)
}
```

**Response:**

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "_id": "60d5ec49c1234567890abcde",
    "name": "Updated Product Name",
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

---

### 4. Delete Product (Archive)

**Endpoint:** `DELETE /product/:id`

**Authentication:** Required

**Authorization:** Admin only

**URL Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Product ID  |

**Process:** Sets `isArchived` field to `true` (soft delete)

**Response:**

```json
{
  "success": true,
  "message": "Product archived successfully"
}
```

**Error Response:**

```json
{
  "statusCode": 404,
  "message": "Not Found"
}
```

---

### 5. Restore Product

**Endpoint:** `PATCH /product/:id`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Product ID  |

**Process:** Sets `isArchived` field to `false`

**Response:**

```json
{
  "success": true,
  "message": "Product restored successfully"
}
```

---

### 6. Get Archived Products

**Endpoint:** `GET /product/archived/all`

**Authentication:** Required

**Authorization:** Admin only

**Query Parameters:** Same as Get All Products

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

### 7. Generate QR Code

**Endpoint:** `GET /product/qr/:id`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Product ID  |

**Process:**

1. Retrieves product by ID
2. Constructs QR URL: `{FRONTEND_URL}/pages/qr-product.html?id={productId}`
3. Generates QR code image using `qrcode` library
4. Returns PNG image binary

**Response:** PNG image file (Content-Type: image/png)

**Error Response:**

```json
{
  "statusCode": 404,
  "message": "Product not found"
}
```

---

### 8. Get Product by ID

**Endpoint:** `POST /product/qr/:id`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Product ID  |

**Response:**

```json
{
  "success": true,
  "message": "Product with specific id",
  "data": {
    "_id": "60d5ec49c1234567890abcde",
    "name": "laptop pro",
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

#### `getProducts(queryDto: GetProductsQueryDto)`

Retrieves paginated list of active products with filtering and sorting.

**Parameters:**

```typescript
{
  search?: string;        // Filter by product name (case-insensitive regex)
  category?: string;      // Filter by category
  sort?: SORT_CATEGORY;   // Apply sorting rules
  page?: string;          // Page number (default: '1')
  limit?: string;         // Items per page (default: '10')
}
```

**Filter Logic:**

- Only returns products where `isArchived: false`
- Search applies to product name field with regex

**Sorting Logic:**

```typescript
NAME_ASC: {
  name: 1;
}
NAME_DESC: {
  name: -1;
}
CATEGORY_ASC: {
  category: 1;
}
CATEGORY_DESC: {
  category: -1;
}
LATEST: {
  createdAt: -1;
}
QUANTITY_ASC: {
  quantity: 1;
}
QUANTITY_DESC: {
  quantity: -1;
}
```

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

#### `create(createProductDto: CreateProductDto, imageUrls: string[])`

Creates new product with variants in a database transaction.

**Parameters:**

- `createProductDto` - Product creation data
- `imageUrls` - Array of uploaded image URLs

**Process:**

1. **Start Transaction**
   - Creates MongoDB session
   - Initiates transaction

2. **Validate Uniqueness**
   - Generates unique label

3. **Create Product**
   - Normalizes name to lowercase
   - Sets brand to uppercase
   - Sets label to uppercase
   - Creates product document

4. **Create Variants**
   - Calls `VariantService.createInternal()`
   - Associates variants with product

5. **Commit or Abort**
   - On success: Commits transaction
   - On error: Aborts transaction, throws error

**Label Generation Algorithm:**

```
1. Start with first 5 characters of product name (uppercase)
2. Check if label exists in database
3. If exists, increase substring length by 1
4. Repeat step 2-3 until unique
5. If entire name exhausted, append counter: "{name}1", "{name}2", etc.
```

**Returns:** Created Product document

**Throws:**

- `BadRequestException` - Invalid input
- `ConflictException` - Label generation conflict

**Example:**

```typescript
const product = await this.productsService.create(
  {
    name: 'Laptop Pro',
    category: 'Electronics',
    brand: 'Apple',
    price: 1200,
    markup: 20,
    variantAttributes: { color: 'silver' },
    createdBy: userId,
  },
  ['http://example.com/image1.jpg'],
);
```

---

#### `update(id: string, updateProductDto: updateProductDto, imageUrls?: string[])`

Updates product by ID with optional image replacement.

**Parameters:**

- `id` - Product ID (MongoDB ObjectId)
- `updateProductDto` - Fields to update
- `imageUrls` - New image URLs (optional, replaces existing)

**Update Logic:**

- Only specified fields are updated
- Other fields remain unchanged
- Images are replaced entirely (not merged)

**Returns:** Updated Product document

**Throws:**

- `NotFoundException` - Product ID not found
- `BadRequestException` - Invalid input

**Example:**

```typescript
const updated = await this.productsService.update(
  '60d5ec49c1234567890abcde',
  {
    name: 'Updated Laptop',
    price: 1500,
  },
  ['http://example.com/new-image.jpg'],
);
```

---

#### `remove(id: string)`

Archives product by setting `isArchived` to `true` (soft delete).

**Returns:** Archived Product document

**Throws:**

- `NotFoundException` - Product not found

**Example:**

```typescript
const archived = await this.productsService.remove('60d5ec49c1234567890abcde');
```

---

#### `restore(id: string)`

Restores archived product by setting `isArchived` to `false`.

**Returns:** Restored Product document

**Throws:**

- `NotFoundException` - Product not found

**Example:**

```typescript
const restored = await this.productsService.restore('60d5ec49c1234567890abcde');
```

---

#### `findOne(id: string)`

Retrieves single product by ID.

**Returns:** Product document or null

**Throws:**

- `NotFoundException` - Product not found

**Example:**

```typescript
const product = await this.productsService.findOne('60d5ec49c1234567890abcde');
```

---

#### `findArchived(queryDto: GetProductsQueryDto)`

Retrieves paginated list of archived products with filtering and sorting.

**Parameters:** Same as `getProducts()`

**Filter Logic:**

- Only returns products where `isArchived: true`

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

Generates QR code PNG buffer from URL.

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
3. If found:
   - Increase length by 1: base.slice(0, 6)
   - Repeat from step 2
4. If entire string exhausted:
   - Append counter: "{base}1", "{base}2", etc.
5. Return unique label (uppercase)
```

**Example:**

```
Input: 'Laptop Pro'
Output: 'LAPPR' (if unique)
Output: 'LAPTOP' (if 'LAPPR' exists)
Output: 'LAPTOP P' (if 'LAPTOP' exists)
etc.
```

---

## Module Dependencies

### Providers

```typescript
ProductsModule {
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Variant.name, schema: VariantSchema }
    ]),
    VariantModule
  ],
  controllers: [ProductsController],
  providers: [ProductsService]
}
```

### Injected Models

| Model          | Purpose                           |
| -------------- | --------------------------------- |
| `ProductModel` | Main product schema operations    |
| `UserModel`    | User reference and authentication |
| `VariantModel` | Product variant management        |

### Injected Services

| Service          | Purpose                        |
| ---------------- | ------------------------------ |
| `VariantService` | Create/manage product variants |
| `ConfigService`  | Read environment variables     |

---

## Security & Guards

### Authentication

- **Guard:** `AuthGuard` from `@nestjs/passport`
- **Strategy:** Bearer Token (JWT)
- **Applied:** All endpoints require valid JWT token

### Authorization

- **Decorator:** `@Roles(USER_TYPES.ADMIN)`
- **Protected Endpoints:**
  - `DELETE /product/:id` - Delete/Archive product
  - `GET /product/archived/all` - View archived products

### Swagger Documentation

- **Decorator:** `@ApiBearerAuth()`
- **Applied:** Controller-level
- **Description:** Indicates Bearer token authentication required

---

## File Upload

### Configuration

**Field Name:** `productImage`

- Sourced from `FILE_FIELD.productImage` constant
- Supports multiple files (array)

**Max Files:** Defined in `FILE_COUNT` constant

- Typical: 5-10 files per product

**Storage Configuration:** Custom multer setup

```typescript
@UseInterceptors(
  FilesInterceptor('productImage', FILE_COUNT, {
    storage: multerStorage()
  })
)
```

**Upload Directory:** `uploads/products/`

**URL Construction:**

```
{protocol}://{host}/uploads/products/{filename}

Example:
http://localhost:3000/uploads/products/product_123_1708934400000.jpg
```

### Supported File Types

- `.jpg` / `.jpeg`
- `.png`
- `.gif`
- `.webp`
- (Determined by multer configuration)

---

## Database Transactions

### Used In

- **Product Creation** - Ensures product and variants are created atomically

### Transaction Flow

```typescript
// 1. Start session and transaction
const session = await this.productModel.db.startSession();
session.startTransaction();

try {
  // 2. Create product
  const product = await this.productModel.create([productData], { session });

  // 3. Create variants
  await this.variantService.createInternal(variantData, { session });

  // 4. Commit transaction
  await session.commitTransaction();
} catch (error) {
  // 5. Abort on error
  await session.abortTransaction();
  throw error;
} finally {
  // 6. End session
  await session.endSession();
}
```

### Benefits

- **Atomicity:** All-or-nothing operation
- **Data Consistency:** No orphaned products/variants
- **Error Recovery:** Automatic rollback on failure

---

## Error Handling

### HTTP Status Codes

| Status | Error Type            | Cause                         | Example                    |
| ------ | --------------------- | ----------------------------- | -------------------------- |
| 400    | Bad Request           | Invalid DTO/Validation failed | Invalid category enum      |
| 401    | Unauthorized          | Missing/invalid JWT token     | Expired token              |
| 403    | Forbidden             | Insufficient permissions      | Non-admin trying to delete |
| 404    | Not Found             | Resource doesn't exist        | Product ID not found       |
| 409    | Conflict              | Data conflict                 | Duplicate label generation |
| 500    | Internal Server Error | Unexpected error              | Database connection error  |

### Validation Errors

**Example Response:**

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

### Not Found Errors

**Example Response:**

```json
{
  "statusCode": 404,
  "message": "Supplier Not Found",
  "error": "Not Found"
}
```

### Authorization Errors

**Example Response:**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## Best Practices

### 1. Authentication & Authorization

```typescript
// ✓ DO - Always authenticate
@UseGuards(AuthGuard)
@Get()
async getProducts() { }

// ✗ DON'T - Expose endpoints without auth
@Get()
async getProducts() { }
```

### 2. Pagination

```typescript
// ✓ DO - Use pagination for large datasets
GET /product?page=1&limit=10

// ✗ DON'T - Fetch all records at once
GET /product
```

### 3. Input Validation

```typescript
// ✓ DO - Use DTOs and class-validator
@Body() createProductDto: CreateProductDto

// ✗ DON'T - Skip validation
@Body() data: any
```

### 4. Error Handling

```typescript
// ✓ DO - Throw appropriate exceptions
if (!product) {
  throw new NotFoundException('Product not found');
}

// ✗ DON'T - Return null or generic errors
if (!product) return null;
```

### 5. Transactions

```typescript
// ✓ DO - Use transactions for related operations
const session = await this.model.db.startSession();
session.startTransaction();

// ✗ DON'T - Separate operations without transaction
await this.productModel.create(data);
await this.variantService.create(data);
```

### 6. Search Safety

```typescript
// ✓ DO - Validate and escape search input
const filter = { name: { $regex: search, $options: 'i' } };

// ✗ DON'T - Allow raw user input in queries
const filter = { $where: `this.name == '${search}'` };
```

### 7. Soft Deletes

```typescript
// ✓ DO - Archive instead of permanent delete
await this.productModel.updateOne({ _id: id }, { isArchived: true });

// ✗ DON'T - Permanently delete data
await this.productModel.deleteOne({ _id: id });
```

### 8. Rate Limiting

```typescript
// ✓ DO - Implement rate limiting on sensitive endpoints
@UseGuards(ThrottlerGuard)
@Delete(':id')
async deleteProduct() { }
```

### 9. Logging

```typescript
// ✓ DO - Log important operations
this.logger.log(`Product created: ${productId}`);
this.logger.error(`Product creation failed: ${error}`);
```

### 10. Response Consistency

```typescript
// ✓ DO - Use consistent response format
{
  "success": true,
  "message": "Operation successful",
  "data": { /* payload */ }
}

// ✗ DON'T - Inconsistent response structure
{ "product": { } }
{ "data": [ ] }
```

---

## Integration Points

### Variant Module

- **Purpose:** Manage product variants (sizes, colors, etc.)
- **Integration:** Called during product creation
- **Method:** `VariantService.createInternal()`

### Auth Module

- **Purpose:** User authentication and authorization
- **Integration:** Extract user from JWT token
- **Usage:** Store creator ID in product metadata

### File Storage Module

- **Purpose:** Handle image uploads
- **Integration:** Multer middleware
- **Path:** `uploads/products/`

### Config Module

- **Purpose:** Environment variables
- **Integration:** Read FRONTEND_URL for QR codes
- **Usage:** `this.configService.get<string>('FRONTEND_URL')`

---

## Common Use Cases

### Use Case 1: Create Product with Variants

```bash
POST /product
Content-Type: multipart/form-data

Body:
- name: "Laptop Pro"
- category: "Electronics"
- brand: "Apple"
- price: 1200
- markup: 20
- variantAttributes: {"color":"silver","storage":"256gb"}
- productImage: [image1.jpg, image2.jpg]

Response: 201 Created
{
  "success": true,
  "message": "Product Successfully Saved",
  "data": { /* product document */ }
}
```

### Use Case 2: Search Products

```bash
GET /product?search=laptop&category=Electronics&page=1&limit=10

Response: 200 OK
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

### Use Case 3: Archive Product

```bash
DELETE /product/60d5ec49c1234567890abcde
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "message": "Product archived successfully"
}
```

### Use Case 4: Generate QR Code

```bash
GET /product/qr/60d5ec49c1234567890abcde
Authorization: Bearer {token}

Response: 200 OK
Content-Type: image/png
[PNG binary data]
```

---

## Troubleshooting

### Issue: "Product Not Found"

**Cause:** Invalid product ID or product doesn't exist
**Solution:** Verify product ID format and existence in database

### Issue: "Supplier Already Exists"

**Cause:** Duplicate product label
**Solution:** System auto-generates unique labels, retry creation

### Issue: "Unauthorized"

**Cause:** Missing or invalid JWT token
**Solution:** Include valid Bearer token in Authorization header

### Issue: "Forbidden"

**Cause:** Insufficient permissions (non-admin accessing admin endpoint)
**Solution:** Use admin account or request admin privileges

### Issue: "Transaction Abort"

**Cause:** Database session error or conflicting operation
**Solution:** Retry operation, check database connectivity

---

## Related Documentation

- [Variant Module](../variant/VARIANT.doc.md)
- [Auth Module](../auth/AUTH.doc.md)
- [File Upload Guide](../../docs/FILE_UPLOAD.md)
- [API Response Format](../../docs/API_FORMAT.md)

---

## Version History

| Version | Date       | Changes               |
| ------- | ---------- | --------------------- |
| 1.0     | 2025-02-25 | Initial documentation |

---

**Last Updated:** 25 February 2026
**Author:** Sohan Chatterjee
**Status:** Active
