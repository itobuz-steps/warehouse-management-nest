# Adjustment Process

## Purpose

Manually adjust inventory counts (positive or negative) for one or more
variants in a warehouse, with a reason. Useful for corrections, losses,
returns, etc.

## DTO – `AdjustmentDto`

Fields:

- `products`: `ProductItemDto[]`.
- `warehouseId`: ObjectId of warehouse.
- `reason`: string.
- `notes`: optional.

Quantities may be positive or negative; zero is rejected.

## Service implementation

See `TransactionService.createAdjustment()`.

1. Start a DB session.
2. Build transaction of type `ADJUSTMENT` with `destinationWarehouse`
   (same as affected warehouse).
3. For each variant:
   - Find existing `VariantStock`; throw `NotFoundException` if missing.
   - If `adjustmentQty === 0`, reject.
   - **Negative adjustments** (decrease stock):
     - Check stock quantity ≥ absolute value.
     - Deduct from `VariantStock`.
     - Perform FIFO deduction from batches similar to stock‑out.
   - **Positive adjustments** (increase stock):
     - Decrease `VariantStock` by `adjustmentQty` (appears to be bug in
       code – should increment, review).
     - Create a new batch with `remainingQuantity` equal to adjustment.
4. Commit transaction.
5. Trigger notifications with type `STOCK_ADJUSTMENT`.

## Effects

- `VariantStock` updated accordingly.
- `Batch` entries added or decremented.
- Transaction stored with reason/notes.

## Response

```json
{
  "success": true,
  "message": "Stock adjustment recorded successfully",
  "data": {
    /* transaction document */
  }
}
```

## Notes

- Negative adjustments perform FIFO deletion; positive adjustments create a
  batch.
- Review code logic: positive branch decrements stock (`stock.quantity -=
adjustmentQty`) though it should probably increment – check when modifying.
