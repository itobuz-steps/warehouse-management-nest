# Transfer Process

## Purpose

Move inventory from one warehouse to another.

## DTO – `TransferDto`

Fields:

- `products`: `ProductItemDto[]`.
- `sourceWarehouse`: ObjectId.
- `destinationWarehouse`: ObjectId (must differ from source).
- `notes`: optional.

## Service implementation

See `TransactionService.createTransfer()`.

1. Start session.
2. Validate source ≠ destination.
3. Create `Transaction` with type `TRANSFER`.
4. For each variant:
   - Ensure `VariantStock` in source warehouse exists and has enough
     quantity.
   - Deduct required quantity from source stock.
   - Perform FIFO deduction from source batches (identical to
     stock‑out logic).
   - Upsert `VariantStock` in destination warehouse with `$inc: { quantity:
variant.quantity }`.
   - Create a `Batch` documenting movement from source to destination with
     full quantity.
5. Commit the session.
6. Send notifications (`STOCK_TRANSFER`) per variant.

## Effects

- Stock subtracted at source; added at destination.
- Batches record both removal (via remainingQuantity decrement in source)
  and addition (new batch with destinationWarehouse field).
- Transaction stored with both warehouse references and product details.

## Response

```json
{
  "success": true,
  "message": "Stock transfer completed successfully",
  "data": {
    /* transaction document */
  }
}
```

## Notes

- Transfers are atomic across both warehouses.
- FIFO consistency enforced when removing from source.
- Notifications may be used by dashboard or alerting service.
