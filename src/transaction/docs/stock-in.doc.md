# Stock‑In Process

## Purpose

Record items received from a supplier and add quantities to warehouse
stock. Batches are created for FIFO tracking.

## DTO – `StockInDto`

Fields:

- `products`: `ProductItemDto[]` – product/variant IDs and quantities.
- `supplier`: email string.
- `destinationWarehouse`: warehouse ObjectId.
- `notes`: optional string.

Validation ensures arrays and IDs are correct.

## Service implementation

See `TransactionService.createStockIn()`.

1. **Start session/transaction.**
2. Convert warehouse and user IDs to `Types.ObjectId`.
3. **Create transaction document** with type `IN` and supplier.
4. **For each product/variant:**
   - Create a new `Batch` document containing
     `{ destinationWarehouse, items: [{ variant, quantity, remainingQuantity }] }`
   - Increment or upsert `VariantStock` for the variant/warehouse by `quantity`.
5. Commit the session.
6. Trigger notifications for each variant (type `STOCK_IN`).

Transactions are atomic: failure anywhere aborts session. Errors thrown (e.g.
validation) propagate.

## Effects on other collections

- **Batch** – new entry with full quantity.
- **VariantStock** – quantity increased; upsert if record not exists.

## Response

```json
{
  "success": true,
  "message": "Stock-in transaction created successfully",
  "data": {
    /* transaction document */
  }
}
```

---

## Notes

- Notifications run asynchronously; failures are logged.
- Supplier is stored as an email string.
- Uses FIFO for later stock‑out / transfer operations.
