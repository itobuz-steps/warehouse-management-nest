# Stock‑Out Process

## Purpose

Record items shipped out to customers and deduct quantities from warehouse
stock. Implements FIFO deduction from batches.

## DTO – `StockOutDto`

Fields:

- `products`: `ProductItemDto[]`.
- Optional customer info: name, email, phone, address.
- `notes`: optional.
- `sourceWarehouse`: warehouse ObjectId.

Variants are validated with quantity ≥ 1.

## Service implementation

See `TransactionService.createStockOut()`.

1. Start Mongo session.
2. Create `Transaction` with type `OUT`, shipment set to `PENDING`.
3. For each variant:
   - Attempt to decrement `VariantStock` document quantity by requested
     amount using `$inc: { quantity: -requiredQty }` with `quantity ≥ requiredQty`.
   - If update count is 0, throw `BadRequestException` – insufficient stock.
   - Deduct from `Batch` documents in createdAt order (FIFO):
     - Loop batches having `items.variant` and `items.remainingQuantity > 0`.
     - For each batch, compute deduction = `min(remainingQuantity, remainingToDeduct)`.
     - Update batch item `remainingQuantity` using positional `$` operator.
     - Decrease `remainingToDeduct`; break when zero.
   - If after iterating batches there is `remainingToDeduct`,
     throw `BadRequestException('Stock inconsistency detected (FIFO failure)')`.
4. Commit session.
5. Trigger pending shipment notifications for each variant.

## Effects on other collections

- **VariantStock** – quantity decreased.
- **Batch** – remainingQuantity fields reduced FIFO-wise.
- **Transaction** – saved with all relevant fields.

## Error conditions

- `BadRequestException` on insufficient stock or FIFO inconsistency.
- Transaction rollback on any error.

## Response

```json
{
  "success": true,
  "message": "Stock-out transaction created successfully",
  "data": {
    /* transaction document */
  }
}
```

---

## Notes

- Shipment status initially `PENDING`.
- Customer data optional; included in transaction document.
- Notifications are queued asynchronously.
