import { Injectable } from '@nestjs/common';
import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import * as fontkit from 'fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Fontkit } from 'pdf-lib/cjs/types/fontkit';

import { WarehouseDocument } from '../../warehouse/schemas/warehouse.schema';
import {
  PopulatedTransactionForPdfGeneration,
  PopulatedVariant,
} from '../types/types';

import { writeText, drawBadge } from '../utils/pdf.utils';

import { urlsConstant } from '../constants/urlPathConstants';
import { CustomerDocument } from 'src/customer/entities/customer.entity';
import { SupplierDocument } from 'src/supplier/entities/supplier.entity';
import { TRANSACTION_TYPES } from '../constants/transactionConstants';

@Injectable()
export class PdfService {
  async generateTransactionPdf(
    transaction: PopulatedTransactionForPdfGeneration,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit as unknown as Fontkit);

    const rootPath = process.cwd();

    const [regularFontBytes, boldFontBytes] = await Promise.all([
      fs.readFile(path.join(rootPath, urlsConstant.regularFontPath)),
      fs.readFile(path.join(rootPath, urlsConstant.boldFontPath)),
    ]);

    const regular = await pdfDoc.embedFont(regularFontBytes);
    const bold = await pdfDoc.embedFont(boldFontBytes);

    const C = {
      panelBg: rgb(0.99, 0.99, 0.99),
      border: rgb(0.87, 0.88, 0.9),
      title: rgb(0.12, 0.13, 0.15),
      subtitle: rgb(0.47, 0.5, 0.55),
      text: rgb(0.16, 0.17, 0.19),
      muted: rgb(0.45, 0.47, 0.52),
      accent: rgb(0.44, 0.56, 0.62),
      headBg: rgb(0.92, 0.93, 0.95),
      badgeBg: rgb(0.91, 0.93, 0.94),
      badgeText: rgb(0.24, 0.3, 0.35),
      rowAlt: rgb(0.96, 0.97, 0.98),
    };

    // ─── Layout constants ───────────────────────────────────────────────────
    const PAGE_W = PageSizes.A4[0];
    const PAGE_H = PageSizes.A4[1];

    // No outer margin — card fills the full page

    // const left = 0;
    const panelW = PAGE_W;
    // const panelRight = PAGE_W;

    const money = (n: number) =>
      '$' +
      (n || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const formatDate = (d?: Date | string) => {
      if (!d) return '-';
      return new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    };

    const uppercase = (v?: string) => (v ? v.toUpperCase() : 'N/A');

    let counterparty: CustomerDocument | SupplierDocument | null;

    if (transaction.type === TRANSACTION_TYPES.IN)
      counterparty = transaction.supplier ?? null;
    else if (transaction.type === TRANSACTION_TYPES.OUT)
      counterparty = transaction.customer ?? null;
    else counterparty = null;

    // ─── Build row data ─────────────────────────────────────────────────────
    type BatchEntry = { batch: string; quantity: number };

    type Row = {
      product: string;
      attributes: string; // shown below product name
      category: string;
      sku: string;
      batches: BatchEntry[]; // one line per batch in the BATCH column
      totalQty: number;
    };

    const rows: Row[] = [];
    let computedTotal = 0;
    let totalUnits = 0;

    for (const productEntry of transaction.products ?? []) {
      const productDoc = productEntry.product as unknown as {
        name?: string;
        category?: string;
      };

      for (const variantEntry of productEntry.variants ?? []) {
        const variant = variantEntry.variant as PopulatedVariant;
        if (!variant) continue;

        const basePrice = variant.price ?? 0;
        const markup = variant.markup ?? 0;
        const finalPrice = basePrice + (basePrice * markup) / 100;
        const qty = variantEntry.quantity ?? 0;

        computedTotal += finalPrice * qty;
        totalUnits += qty;

        const attrs = Object.entries(variant.attributes ?? {})
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join(', ');

        const rawBatches = variantEntry.batches as
          | { batch: string; quantity: number }[]
          | undefined;

        let batches: BatchEntry[];

        if (rawBatches && Boolean(rawBatches.length)) {
          batches = rawBatches.map((b) => {
            const batchName =
              typeof b.batch === 'string' ? b.batch : (b.batch ?? '-');
            return { batch: batchName, quantity: b.quantity };
          });
        } else {
          // No batch info — show a single dash entry
          batches = [{ batch: '-', quantity: qty }];
        }

        rows.push({
          product: productDoc?.name ?? '-',
          attributes: attrs || '-',
          category: productDoc?.category ?? '-',
          sku: variant.sku ?? '-',
          batches,
          totalQty: qty,
        });
      }
    }

    const grandTotal = transaction.totalAmount ?? computedTotal;
    const sourceWarehouse = transaction.sourceWarehouse as WarehouseDocument;
    const destinationWarehouse =
      transaction.destinationWarehouse as WarehouseDocument;
    const preparedBy = transaction.performedBy?.name ?? '-';
    let warehouseName: string;

    if (sourceWarehouse?.name) {
      warehouseName = sourceWarehouse.name;
    } else if (destinationWarehouse?.name) {
      warehouseName = destinationWarehouse.name;
    } else {
      warehouseName = '-';
    }

    // ─── Dimensions ─────────────────────────────────────────────────────────
    const cardGap = 6;
    const cardCols = 3;
    const cardW = (panelW - cardGap * (cardCols - 1) - 20) / 3;
    const cardH = 36;

    // Header block height (accent bar + title + subtitle + padding)
    const HEADER_BLOCK_H = 60;
    // Meta-cards block: 2 rows × cardH + gaps + padding
    let META_BLOCK_H: number;

    if (
      transaction.type === TRANSACTION_TYPES.IN ||
      transaction.type === TRANSACTION_TYPES.OUT
    ) {
      META_BLOCK_H = 3 * cardH + cardGap + 16 + 12;
    } else {
      META_BLOCK_H = 2 * cardH + cardGap + 16 + 12;
    }

    // Table header
    const TABLE_HEADER_H = 20;
    // Per-row base height (single batch)
    const BASE_ROW_H = 28; // enough for product name + attributes line
    const BATCH_LINE_H = 13; // extra height per additional batch line
    // Summary + reason + footer
    const SUMMARY_ROW_H = 24;
    const SUMMARY_H = 3 * SUMMARY_ROW_H;
    const REASON_BOX_H = 48;
    const FOOTER_H = 24;
    const FIXED_BOTTOM_H = SUMMARY_H + 8 + REASON_BOX_H + 14 + FOOTER_H + 10;

    // Available height for table rows on first page
    const firstPageUsedTop = HEADER_BLOCK_H + META_BLOCK_H + TABLE_HEADER_H;
    const firstPageAvailable = PAGE_H - firstPageUsedTop - FIXED_BOTTOM_H;

    // Continuation pages: table header only at top
    const contPageUsedTop = 40 + TABLE_HEADER_H; // small top margin + header
    const contPageAvailable = PAGE_H - contPageUsedTop - FIXED_BOTTOM_H;

    // Pre-compute row heights
    const rowHeights = rows.map((r) => {
      const extraLines = Math.max(0, r.batches.length - 1);
      return BASE_ROW_H + extraLines * BATCH_LINE_H;
    });

    // ─── Pagination: group rows into pages ──────────────────────────────────
    type PageGroup = { startIdx: number; endIdx: number };
    const pages: PageGroup[] = [];

    let cursor = 0;
    let isFirst = true;

    while (cursor < rows.length) {
      const available = isFirst ? firstPageAvailable : contPageAvailable;
      let used = 0;
      const start = cursor;

      while (cursor < rows.length && used + rowHeights[cursor] <= available) {
        used += rowHeights[cursor];
        cursor++;
      }

      // If no rows fit at all (row taller than available), force at least one
      if (cursor === start) {
        cursor++;
      }

      pages.push({ startIdx: start, endIdx: cursor });
      isFirst = false;
    }

    // If no rows exist, still create one page
    if (!pages.length) {
      pages.push({ startIdx: 0, endIdx: 0 });
    }

    // ─── Column X positions (inside 10px inner padding) ─────────────────────
    const tableX = 10;
    const tableW = panelW - 20;

    const colProduct = tableX + 6; // Product + attributes below
    const colBatch = tableX + 160; // Batch column (new)
    const colCategory = tableX + 330; // Category
    const colSku = tableX + 430; // SKU
    const colQty = tableX + tableW - 8; // Quantity (right-aligned)

    // Column widths for clipping
    const wProduct = 148;
    const wBatch = 164;
    const wCategory = 94;
    const wSku = 88;

    // ─── Helper: draw a full-page panel (white card, accent top bar) ─────────
    const drawPagePanel = (page: ReturnType<typeof pdfDoc.addPage>) => {
      const sz = page.getSize();
      page.drawRectangle({
        x: 0,
        y: 0,
        width: sz.width,
        height: sz.height,
        color: C.panelBg,
      });
      // Accent top bar
      page.drawRectangle({
        x: 0,
        y: sz.height - 2,
        width: sz.width,
        height: 2,
        color: C.accent,
      });
      // Light border around whole page
      page.drawRectangle({
        x: 0,
        y: 0,
        width: sz.width,
        height: sz.height,
        borderColor: C.border,
        borderWidth: 0.6,
      });
    };

    // ─── Helper: draw table column headers ───────────────────────────────────
    const drawTableHeader = (
      page: ReturnType<typeof pdfDoc.addPage>,
      y: number,
    ) => {
      page.drawRectangle({
        x: tableX,
        y: y - TABLE_HEADER_H,
        width: tableW,
        height: TABLE_HEADER_H,
        color: C.headBg,
        borderColor: C.border,
        borderWidth: 0.6,
      });

      writeText(page, 'PRODUCT', colProduct, y - 13, 9, bold, C.muted);
      writeText(page, 'BATCH', colBatch, y - 13, 9, bold, C.muted);
      writeText(page, 'CATEGORY', colCategory, y - 13, 9, bold, C.muted);
      writeText(page, 'SKU', colSku, y - 13, 9, bold, C.muted);
      writeText(
        page,
        'QUANTITY',
        colQty,
        y - 13,
        9,
        bold,
        C.muted,
        undefined,
        'right',
      );
    };

    // ─── Helper: draw meta-info cards ────────────────────────────────────────
    const drawMetaCards = (
      page: ReturnType<typeof pdfDoc.addPage>,
      topY: number,
    ) => {
      const drawCard = (
        px: number,
        pyTop: number,
        label: string,
        value: string,
      ) => {
        page.drawRectangle({
          x: px,
          y: pyTop - cardH,
          width: cardW,
          height: cardH,
          color: C.panelBg,
          borderColor: C.border,
          borderWidth: 0.6,
        });
        writeText(page, label, px + 8, pyTop - 12, 8, bold, C.subtitle);
        writeText(
          page,
          value || '-',
          px + 8,
          pyTop - 25,
          9.5,
          regular,
          C.text,
          cardW - 14,
        );
      };

      const c1 = 10;
      const c2 = c1 + cardW + cardGap;
      const c3 = c2 + cardW + cardGap;

      drawCard(c1, topY, 'INVOICE NO.', String(transaction._id));
      drawCard(c2, topY, 'TYPE', String(transaction.type || '-'));
      drawCard(c3, topY, 'CREATED AT', formatDate(transaction.createdAt));

      drawCard(c1, topY - (cardH + cardGap), 'PERFORMED BY', preparedBy);
      drawCard(c2, topY - (cardH + cardGap), 'WAREHOUSE', warehouseName);
      drawCard(
        c3,
        topY - (cardH + cardGap),
        'SHIPMENT STATUS',
        transaction.shipment ? transaction.shipment : '-',
      );

      if (
        (transaction.type === TRANSACTION_TYPES.IN ||
          transaction.type === TRANSACTION_TYPES.OUT) &&
        counterparty
      ) {
        drawCard(
          c1,
          topY - (cardH + cardGap) - (cardH + cardGap),
          'COUNTERPARTY NAME',
          counterparty.name ?? '-',
        );

        drawCard(
          c2,
          topY - (cardH + cardGap) - (cardH + cardGap),
          'COUNTERPARTY CONTACT',
          counterparty.email,
        );

        drawCard(
          c3,
          topY - (cardH + cardGap) - (cardH + cardGap),
          'COUNTERPARTY ADDRESS',
          counterparty.address ?? '-',
        );
      }
    };

    // ─── Helper: draw summary + reason + footer ───────────────────────────────
    const drawBottomSection = (
      page: ReturnType<typeof pdfDoc.addPage>,
      topY: number,
    ) => {
      const summaryW = 210;
      const summaryX = panelW - 10 - summaryW;

      page.drawRectangle({
        x: summaryX,
        y: topY - SUMMARY_H,
        width: summaryW,
        height: SUMMARY_H,
        color: C.panelBg,
        borderColor: C.border,
        borderWidth: 0.6,
      });

      const s1y = topY - 8;
      const s2y = s1y - SUMMARY_ROW_H;
      const s3y = s2y - SUMMARY_ROW_H;

      writeText(
        page,
        'Shipment Status',
        summaryX + 8,
        s1y - 9,
        9,
        regular,
        C.text,
      );
      writeText(
        page,
        uppercase(transaction.shipment ? transaction.shipment : '-'),
        summaryX + summaryW - 8,
        s1y - 9,
        9,
        bold,
        C.text,
        undefined,
        'right',
      );

      writeText(page, 'Total Units', summaryX + 8, s2y - 9, 9, regular, C.text);
      writeText(
        page,
        String(totalUnits),
        summaryX + summaryW - 8,
        s2y - 9,
        9,
        bold,
        C.text,
        undefined,
        'right',
      );

      page.drawRectangle({
        x: summaryX,
        y: s3y - SUMMARY_ROW_H + 1,
        width: summaryW,
        height: SUMMARY_ROW_H - 1,
        color: C.headBg,
      });

      writeText(page, 'Total Amount', summaryX + 8, s3y - 15, 10, bold, C.text);
      writeText(
        page,
        money(grandTotal),
        summaryX + summaryW - 8,
        s3y - 15,
        10,
        bold,
        C.text,
        undefined,
        'right',
      );

      // Reason / Notes box
      const reasonTopY = topY - SUMMARY_H - 20;
      page.drawRectangle({
        x: tableX,
        y: reasonTopY - REASON_BOX_H,
        width: tableW,
        height: REASON_BOX_H,
        color: C.panelBg,
        borderColor: C.border,
        borderWidth: 0.6,
      });
      writeText(
        page,
        'Reason: ',
        tableX + 8,
        reasonTopY - 14,
        9.2,
        bold,
        C.text,
      );
      writeText(
        page,
        transaction.reason ? transaction.reason : '',
        tableX + 46,
        reasonTopY - 14,
        9.2,
        regular,
        C.text,
      );

      writeText(
        page,
        'Notes: ',
        tableX + 8,
        reasonTopY - 30,
        9.2,
        bold,
        C.text,
      );
      writeText(
        page,
        transaction.notes ? transaction.notes : '',
        tableX + 40,
        reasonTopY - 30,
        9.2,
        regular,
        C.text,
      );

      // Footer
      const footerY = 14;
      const footerText = 'Printed on ' + formatDate(new Date());
      writeText(
        page,
        'Printed on ' + formatDate(new Date()),
        18 * footerText.length,
        footerY,
        8.7,
        regular,
        C.subtitle,
        undefined,
        'right',
      );
    };

    // ─── Render each page ────────────────────────────────────────────────────
    pages.forEach((group, pageIdx) => {
      const page = pdfDoc.addPage(PageSizes.A4);
      const H = page.getSize().height;

      drawPagePanel(page);

      let cursorY = H; // tracks current Y from top downward

      // ── First page: header + meta cards ──
      if (pageIdx === 0) {
        // Accent top bar already drawn; header text starts just below it
        const headerY = H - 26;

        // Title aligned to left edge (left + 10 for minimal inner pad)
        writeText(
          page,
          'Transaction Invoice',
          10,
          headerY,
          32 / 2.4,
          bold,
          C.title,
        );
        // Subtitle — slightly larger than before
        writeText(
          page,
          'WAREHOUSE MANAGEMENT',
          10,
          headerY - 18,
          6,
          bold,
          C.subtitle,
        );

        drawBadge(
          page,
          uppercase(transaction.approvalStatus),
          panelW - 60,
          headerY + 2,
          bold,
          8,
          C.badgeBg,
          C.badgeText,
        );

        const metaTopY = H - HEADER_BLOCK_H;
        drawMetaCards(page, metaTopY);

        cursorY = metaTopY - META_BLOCK_H + 4;
      } else {
        // Continuation page: small top margin
        cursorY = H - 40;
      }

      // ── Table header ──
      drawTableHeader(page, cursorY);
      cursorY -= TABLE_HEADER_H;

      // ── Table rows ──
      const { startIdx, endIdx } = group;
      const isLastPage = pageIdx === pages.length - 1;

      for (let i = startIdx; i < endIdx; i++) {
        const r = rows[i];
        const rh = rowHeights[i];
        const rowTop = cursorY;
        const globalIdx = i; // for alternating color

        // Row background
        page.drawRectangle({
          x: tableX,
          y: rowTop - rh,
          width: tableW,
          height: rh,
          color: globalIdx % 2 === 0 ? C.panelBg : C.rowAlt,
          borderColor: C.border,
          borderWidth: 0.4,
        });

        // Product name (vertically centred in top half of row)
        const productNameY = rowTop - 12;
        writeText(
          page,
          r.product,
          colProduct,
          productNameY,
          9,
          bold,
          C.text,
          wProduct,
        );

        // Attributes line below product name
        writeText(
          page,
          r.attributes,
          colProduct,
          productNameY - 11,
          7.5,
          regular,
          C.muted,
          wProduct,
        );

        // Category & SKU — vertically centred
        const midY = rowTop - rh / 2 - 4;
        writeText(
          page,
          r.category,
          colCategory,
          midY,
          9,
          regular,
          C.text,
          wCategory,
        );
        writeText(page, r.sku, colSku, midY, 9, regular, C.text, wSku);

        // Total quantity (right-aligned, centred)
        writeText(
          page,
          String(r.totalQty),
          colQty,
          midY,
          9.5,
          bold,
          C.text,
          undefined,
          'right',
        );

        // Batch lines — each on its own line
        r.batches.forEach((b, bi) => {
          const batchLineY = rowTop - 12 - bi * BATCH_LINE_H;
          const batchLabel = `${b.batch}(${b.quantity})`;
          writeText(
            page,
            batchLabel,
            colBatch,
            batchLineY,
            8.5,
            regular,
            C.text,
            wBatch,
          );
        });

        cursorY -= rh;
      }

      // ── Bottom section only on the last page ──
      if (isLastPage) {
        drawBottomSection(page, cursorY - 8);
      }
    });

    return pdfDoc.save();
  }
}
