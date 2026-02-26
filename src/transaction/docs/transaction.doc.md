# Transaction Module Documentation

## Overview

The **Transaction Module** handles all inventory movement inside the
warehouse management system: stock‑in, stock‑out, transfers and adjustments.
Every operation is recorded as a `Transaction` document which may reference
products, variants, warehouses, customers or suppliers. An external PDF
invoice can be generated for any transaction.

The module exposes HTTP endpoints guarded by JWT authentication and integrates
with other parts of the system (warehouse, product, variant, batch,
notification, quantity, variant‑stock).

---

## Directory structure

```
src/transaction/
├── constants/
│   ├── shipmentConstants.ts
│   └── transactionConstants.ts
├── dto/
│   ├── adjustment.dto.ts
│   ├── stock-in.dto.ts
│   ├── stock-out.dto.ts
│   ├── transfer.dto.ts
│   ├── product-item.dto.ts
│   ├── variant-item.dto.ts
│   └── query/
│       ├── get-transactions.query.dto.ts
│       └── warehouse-transactions.query.dto.ts
├── schemas/
│   ├── transaction.schema.ts
│   ├── transaction-product.schema.ts
│   └── transaction-variant.schema.ts
├── services/
│   └── pdf.service.ts
├── utils/
│   └── pdf.utils.ts
├── types/
│   └── types.ts
├── transaction.controller.ts
├── transaction.service.ts
└── transaction.module.ts
```

---

## Core schema

`Transaction` (see `transaction.schema.ts`)

- `type` – enum (`IN`, `OUT`, `ADJUSTMENT`, `TRANSFER`)
- `products` – array of `TransactionProduct` (product + variants+quantity)
- optional fields: `supplier`, `customer*`, `shipment` status, `reason`,
  `notes`
- `performedBy` – reference to user
- `sourceWarehouse`, `destinationWarehouse` – warehouse references
- timestamps and indexes on variant/product and createdAt

Sub‑schemas (`transaction-product.schema.ts`, `transaction-variant.schema.ts`)
define structure of nested arrays.

---

## DTOs

- **`ProductItemDto`** – productId with nested `VariantItemDto` list.
- **`VariantItemDto`** – variantId & quantity.
- **`StockInDto`**, **`StockOutDto`**, **`TransferDto`**, **`AdjustmentDto`**
  – wrap product arrays with warehouse/supplier/customer/notes metadata.
- Query DTOs for filtering lists by date/type/status/page/limit.

Validation is performed with `class-validator` and `class-transformer`.

---

## Controller

`TransactionController` defines routes:

| Verb | Path                                | Description             |
| ---- | ----------------------------------- | ----------------------- |
| GET  | `/transaction`                      | List all transactions   |
| GET  | `/transaction/:warehouseId`         | List warehouse–specific |
| POST | `/transaction/stock-in`             | Create stock‑in         |
| POST | `/transaction/stock-out`            | Create stock‑out        |
| POST | `/transaction/transfer`             | Create transfer         |
| POST | `/transaction/adjustment`           | Create adjustment       |
| GET  | `/transaction/generate-invoice/:id` | PDF invoice             |

All routes require `AuthGuard` and bearer token.

---

## Service

`TransactionService` contains business logic for each operation. The
general pattern:

1. Start a MongoDB session / transaction.
2. Insert a `Transaction` document.
3. Update `VariantStock` and `Batch` collections accordingly.
4. Commit/abort session.
5. Trigger notifications via
   `NotificationTriggerService`.

Pagination and filtering are implemented in `getTransactions` and
`getWarehouseTransactions`.

### Helper types

Useful type definitions are in `types/types.ts` (populated transaction
shapes for PDF, request extension, etc.).

---

## Notifications

Operations call `notificationTriggerService.*` with appropriate
`NOTIFICATION_TYPES` to inform other systems or users. Email sending is
supported by `NotificationService` + `SendEmail`.

---

## PDF generation

`PdfService` (under services) uses `pdf-lib` utilities in
`utils/pdf.utils.ts` to render invoices. `generateInvoice` method
populates referenced documents and returns a `StreamableFile`.

---

## Transaction processes

Each of the four main processes (stock‑in, stock‑out, transfer,
adjustment) has its own document below for detailed flow.

---

_Last updated: 26 February 2026._
