import { Injectable } from '@nestjs/common';
import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import * as fontkit from 'fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Fontkit } from 'pdf-lib/cjs/types/fontkit';

import { WarehouseDocument } from '../../warehouse/schemas/warehouse.schema';
import {
  FlattenedItem,
  PopulatedTransactionForPdfGeneration,
  PopulatedVariant,
} from '../types/types';

import { drawImage, writeLine, writeText, drawBadge } from '../utils/pdf.utils';

import { urlsConstant } from '../constants/urlPathConstants';

@Injectable()
export class PdfService {
  async generateTransactionPdf(
    transaction: PopulatedTransactionForPdfGeneration,
  ): Promise<Uint8Array> {
    /** ---------------- DOCUMENT SETUP ---------------- */

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit as unknown as Fontkit);

    const rootPath = process.cwd();

    const [imageBytes, regularFontBytes, boldFontBytes] = await Promise.all([
      fs.readFile(path.join(rootPath, urlsConstant.warehouseImage)),
      fs.readFile(path.join(rootPath, urlsConstant.regularFontPath)),
      fs.readFile(path.join(rootPath, urlsConstant.boldFontPath)),
    ]);

    const pngImage = await pdfDoc.embedPng(imageBytes);
    const font = await pdfDoc.embedFont(regularFontBytes);
    const boldFont = await pdfDoc.embedFont(boldFontBytes);

    let page = pdfDoc.addPage(PageSizes.A4);
    let { width, height } = page.getSize();

    /** ---------------- DESIGN TOKENS ---------------- */

    const INDIGO = rgb(0.31, 0.27, 0.9);
    const INDIGO_LIGHT = rgb(0.9, 0.9, 1);
    const TEXT_PRIMARY = rgb(0.15, 0.15, 0.2);
    const TEXT_SECONDARY = rgb(0.45, 0.45, 0.5);
    const BORDER = rgb(0.85, 0.85, 0.9);

    const SPACING = {
      xs: 6,
      sm: 10,
      md: 18,
      lg: 28,
      xl: 40,
    };

    const margin = 40;
    const tableWidth = width - margin * 2;
    // const tableStartX = margin;
    const tableEndX = width - margin;
    const bottomLimit = 80;

    let cursorY = height - 40;

    /** ---------------- HELPERS ---------------- */

    const drawHeader = () => {
      drawImage(page, pngImage, margin, height - 60, 90, 40);

      writeText(
        page,
        'INVOICE',
        width - margin,
        height - 40,
        20,
        boldFont,
        INDIGO,
        undefined,
        'right',
      );

      writeText(
        page,
        `Txn ID: ${transaction._id.toString()}`,
        width - margin,
        height - 60,
        10,
        font,
        TEXT_SECONDARY,
        undefined,
        'right',
      );

      writeText(
        page,
        new Date(transaction.createdAt).toLocaleString(),
        width - margin,
        height - 75,
        10,
        font,
        TEXT_SECONDARY,
        undefined,
        'right',
      );
    };

    const drawSectionTitle = (title: string) => {
      cursorY -= SPACING.lg;

      writeText(
        page,
        title.toUpperCase(),
        margin,
        cursorY,
        11,
        boldFont,
        INDIGO,
      );

      cursorY -= SPACING.xs;

      writeLine(
        page,
        { x: margin, y: cursorY },
        { x: tableEndX, y: cursorY },
        0.5,
        BORDER,
      );

      cursorY -= SPACING.md;
    };

    const ensurePage = () => {
      if (cursorY < bottomLimit) {
        page = pdfDoc.addPage(PageSizes.A4);
        ({ width, height } = page.getSize());
        cursorY = height - 60;
        drawHeader();
      }
    };

    /** ---------------- HEADER ---------------- */

    drawHeader();

    /** ---------------- TRANSACTION ---------------- */

    drawSectionTitle('Transaction');

    writeText(page, 'Type', margin, cursorY, 10, font, TEXT_SECONDARY);
    writeText(page, transaction.type, margin + 120, cursorY, 10, boldFont);

    drawBadge(
      page,
      transaction.approvalStatus,
      margin + 250,
      cursorY,
      boldFont,
      9,
      INDIGO_LIGHT,
      INDIGO,
    );

    cursorY -= SPACING.md;

    writeText(
      page,
      'Requires Approval',
      margin,
      cursorY,
      10,
      font,
      TEXT_SECONDARY,
    );
    writeText(
      page,
      transaction.requiresApproval ? 'Yes' : 'No',
      margin + 120,
      cursorY,
      10,
      boldFont,
    );

    if (transaction.notes) {
      cursorY -= SPACING.md;
      writeText(page, 'Notes', margin, cursorY, 10, font, TEXT_SECONDARY);
      writeText(
        page,
        transaction.notes,
        margin + 120,
        cursorY,
        10,
        font,
        TEXT_PRIMARY,
        tableWidth - 120,
      );
    }

    /** ---------------- PARTIES ---------------- */

    drawSectionTitle('Parties');

    const sourceWarehouse = transaction.sourceWarehouse as WarehouseDocument;
    const destinationWarehouse =
      transaction.destinationWarehouse as WarehouseDocument;

    writeText(page, 'Source', margin, cursorY, 10, font);
    writeText(
      page,
      sourceWarehouse?.name ?? '-',
      margin + 120,
      cursorY,
      10,
      boldFont,
    );

    cursorY -= SPACING.sm;

    writeText(page, 'Destination', margin, cursorY, 10, font);
    writeText(
      page,
      destinationWarehouse?.name ?? '-',
      margin + 120,
      cursorY,
      10,
      boldFont,
    );

    cursorY -= SPACING.sm;

    writeText(page, 'Performed By', margin, cursorY, 10, font);
    writeText(
      page,
      transaction.performedBy?.name ?? '-',
      margin + 120,
      cursorY,
      10,
      boldFont,
    );

    /** ---------------- FLATTEN ITEMS ---------------- */

    const flattened: FlattenedItem[] = [];

    for (const product of transaction.products ?? []) {
      for (const variantEntry of product.variants ?? []) {
        const variant = variantEntry.variant as PopulatedVariant;
        if (!variant) continue;

        const markup = variant.markup ?? 0;
        const basePrice = variant.price ?? 0;
        const price = basePrice + (basePrice * markup) / 100;
        const batchObj = variantEntry.batches?.[0]?.batch;

        let batch: string | null = null;

        if (batchObj) {
          if (typeof batchObj.code === 'string') {
            batch = batchObj.code;
          } else if (typeof batchObj._id === 'string') {
            batch = batchObj._id;
          } else {
            batch = batchObj._id.toHexString();
          }
        }

        flattened.push({
          sku: variant.sku,
          attributes: Object.entries(variant.attributes ?? {})
            .map(([k, v]) => `${k}:${v}`)
            .join(', '),
          quantity: variantEntry.quantity,
          price,
          total: price * variantEntry.quantity,
          batch,
        });
      }
    }

    /** ---------------- TABLE ---------------- */

    drawSectionTitle('Items');

    const colSkuX = margin;
    const colQtyX = width - margin - 200;
    const colUnitX = width - margin - 120;
    const colTotalX = width - margin;

    // header background
    page.drawRectangle({
      x: margin,
      y: cursorY - 10,
      width: tableWidth,
      height: 18,
      color: INDIGO_LIGHT,
    });

    writeText(page, 'SKU', colSkuX, cursorY, 10, boldFont);
    writeText(
      page,
      'Qty',
      colQtyX,
      cursorY,
      10,
      boldFont,
      undefined,
      undefined,
      'right',
    );
    writeText(
      page,
      'Unit',
      colUnitX,
      cursorY,
      10,
      boldFont,
      undefined,
      undefined,
      'right',
    );
    writeText(
      page,
      'Total',
      colTotalX,
      cursorY,
      10,
      boldFont,
      undefined,
      undefined,
      'right',
    );

    cursorY -= SPACING.md;

    let grandTotal = 0;

    for (const item of flattened) {
      ensurePage();

      writeText(page, item.sku, colSkuX, cursorY, 10, boldFont);

      writeText(
        page,
        `${item.quantity}`,
        colQtyX,
        cursorY,
        10,
        font,
        TEXT_PRIMARY,
        undefined,
        'right',
      );

      writeText(
        page,
        `₹${item.price.toFixed(2)}`,
        colUnitX,
        cursorY,
        10,
        font,
        TEXT_PRIMARY,
        undefined,
        'right',
      );

      writeText(
        page,
        `₹${item.total.toFixed(2)}`,
        colTotalX,
        cursorY,
        10,
        boldFont,
        TEXT_PRIMARY,
        undefined,
        'right',
      );

      cursorY -= 12;

      writeText(
        page,
        `Attr: ${item.attributes}`,
        colSkuX,
        cursorY,
        9,
        font,
        TEXT_SECONDARY,
        250,
      );

      if (item.batch) {
        writeText(
          page,
          `Batch: ${item.batch.toString()}`,
          colUnitX,
          cursorY,
          9,
          font,
          TEXT_SECONDARY,
          undefined,
          'right',
        );
      }

      cursorY -= SPACING.md;

      grandTotal += item.total;
    }

    /** ---------------- TOTAL ---------------- */

    cursorY -= SPACING.lg;

    writeLine(
      page,
      { x: width - 200, y: cursorY },
      { x: width - margin, y: cursorY },
      1,
      BORDER,
    );

    cursorY -= SPACING.md;

    writeText(
      page,
      'Total Amount',
      width - 200,
      cursorY,
      11,
      font,
      TEXT_SECONDARY,
    );

    writeText(
      page,
      `₹${(transaction.totalAmount ?? grandTotal).toFixed(2)}`,
      width - margin,
      cursorY,
      14,
      boldFont,
      INDIGO,
      undefined,
      'right',
    );

    /** ---------------- APPROVAL ---------------- */

    if (transaction.requiresApproval) {
      drawSectionTitle('Approval');

      writeText(page, 'Approved By', margin, cursorY, 10, font);
      writeText(
        page,
        transaction.approvedBy?.name ?? '-',
        margin + 120,
        cursorY,
        10,
        boldFont,
      );

      cursorY -= SPACING.sm;

      writeText(page, 'Approved At', margin, cursorY, 10, font);
      writeText(
        page,
        transaction?.approvedAt?.toLocaleString() ?? '-',
        margin + 120,
        cursorY,
        10,
        boldFont,
      );
    }

    /** ---------------- OUTPUT ---------------- */

    return pdfDoc.save();
  }
}
