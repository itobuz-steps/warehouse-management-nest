import { Injectable } from '@nestjs/common';
import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import * as fontkit from 'fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WarehouseDocument } from '../../warehouse/schemas/warehouse.schema';
import {
  FlattenedItem,
  PopulatedTransactionForPdfGeneration,
  PopulatedVariant,
} from '../types/types';
import { drawImage, writeLine, writeText, drawBadge } from '../utils/pdf.utils';
import { Fontkit } from 'pdf-lib/cjs/types/fontkit';
import { urlsConstant } from '../constants/urlPathConstants';

@Injectable()
export class PdfService {
  async generateTransactionPdf(
    transaction: PopulatedTransactionForPdfGeneration,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit as unknown as Fontkit);

    const rootPath = process.cwd();

    const imageBytes = await fs.readFile(
      path.join(rootPath, urlsConstant.warehouseImage),
    );

    const regularFontBytes = await fs.readFile(
      path.join(rootPath, urlsConstant.regularFontPath),
    );

    const boldFontBytes = await fs.readFile(
      path.join(rootPath, urlsConstant.boldFontPath),
    );

    const pngImage = await pdfDoc.embedPng(imageBytes);
    const font = await pdfDoc.embedFont(regularFontBytes);
    const boldFont = await pdfDoc.embedFont(boldFontBytes);

    let page = pdfDoc.addPage(PageSizes.A4);
    let { height } = page.getSize();
    const { width } = page.getSize();

    const lineGap = 40;
    const margin = 20;
    const tableStartX = margin;
    const tableWidth = width - margin * 2;
    const tableEndX = tableStartX + tableWidth;
    const bottomLimit = 80;

    // const colSkuWidth = 250;
    const colAttrWidth = 250;
    const colQtyWidth = 30;
    const colUnitWidth = 80;
    const colTotalWidth = 85;

    const colSkuX = tableStartX + 20;
    const colAttrX = tableStartX + 20;
    const colQtyX = colAttrX + colAttrWidth + 50;
    const colUnitX = colQtyX + colQtyWidth - 40;
    const colTotalX = colUnitX + colUnitWidth;

    const headerColor = rgb(0.725, 0.478, 0.529);

    const drawHeader = () => {
      drawImage(page, pngImage, margin, height - 80, 110, 55);

      drawImage(page, pngImage, 150, 250, 300, 300, 0.08);

      writeText(
        page,
        `TRANSACTION - ${transaction.type}`,
        tableStartX + 130,
        height - 60,
        18,
        boldFont,
        headerColor,
      );
    };

    drawHeader();

    let cursorY = height - 120;

    /** ---------------- BASIC INFO ---------------- */

    writeText(page, 'Transaction ID:', 50, cursorY, 12, font);
    writeText(page, String(transaction._id), 160, cursorY, 12, boldFont);

    cursorY -= lineGap;
    writeText(page, 'Date:', 50, cursorY, 12, font);
    writeText(
      page,
      new Date(transaction.createdAt).toLocaleString(),
      160,
      cursorY,
      12,
      boldFont,
    );

    cursorY -= lineGap * 2;
    writeLine(
      page,
      { x: tableStartX, y: cursorY },
      { x: tableEndX, y: cursorY },
      1,
    );

    /** ---------------- TABLE HEADER ---------------- */

    const drawTableHeader = () => {
      cursorY -= lineGap;

      writeText(page, 'Products', colAttrX, cursorY, 11, boldFont);

      writeText(page, 'Qty', colQtyX + colQtyWidth - 10, cursorY, 11, boldFont);
      writeText(
        page,
        'Unit Price',
        colUnitX + colUnitWidth - 5,
        cursorY,
        11,
        boldFont,
      );
      writeText(
        page,
        'Total',
        colTotalX + colTotalWidth - 5,
        cursorY,
        11,
        boldFont,
      );

      cursorY -= 8;

      writeLine(
        page,
        { x: tableStartX, y: cursorY },
        { x: tableEndX, y: cursorY },
        1,
      );
    };

    drawTableHeader();

    /** ---------------- FLATTEN ITEMS ---------------- */

    const flattened: FlattenedItem[] = [];

    for (const product of transaction.products ?? []) {
      for (const variantEntry of product.variants ?? []) {
        const variant = variantEntry.variant as PopulatedVariant;
        if (!variant) continue;

        const markup = variant.markup ?? 0;
        const basePrice = variant.price ?? 0;
        const price = basePrice + (basePrice * markup) / 100;

        flattened.push({
          sku: variant.sku,
          attributes: Object.entries(variant.attributes ?? {})
            .map(([k, v]) => `${k}:${v}`)
            .join(', '),
          quantity: variantEntry.quantity,
          price,
          total: price * variantEntry.quantity,
        });
      }
    }

    /** ---------------- TABLE BODY ---------------- */

    let grandTotal = 0;

    for (const item of flattened) {
      if (cursorY < bottomLimit) {
        page = pdfDoc.addPage(PageSizes.A4);
        height = page.getSize().height;
        cursorY = height - 100;
        drawHeader();
        drawTableHeader();
      }

      cursorY -= lineGap;

      // SKU
      writeText(page, `SKU: ${item.sku}`, colSkuX, cursorY, 10, font);

      // Attributes (bounded width prevents overlap)
      writeText(
        page,
        `Attributes: ${item.attributes}`,
        colAttrX,
        cursorY - 15,
        10,
        font,
        undefined,
        colAttrWidth - 10,
      );

      // Qty (right aligned)
      writeText(
        page,
        String(item.quantity),
        colQtyX + colQtyWidth - 5,
        cursorY,
        10,
        font,
      );

      // Unit price (right aligned)
      writeText(
        page,
        `₹${item.price.toFixed(2)}`,
        colUnitX + colUnitWidth - 5,
        cursorY,
        10,
        font,
      );

      // Total (right aligned bold)
      writeText(
        page,
        `₹${item.total.toFixed(2)}`,
        colTotalX + colTotalWidth - 5,
        cursorY,
        10,
        boldFont,
      );

      grandTotal += item.total;
    }

    /** ---------------- TOTAL ---------------- */

    cursorY -= lineGap;
    writeLine(
      page,
      { x: tableStartX, y: cursorY },
      { x: tableEndX, y: cursorY },
      1,
    );

    cursorY -= lineGap;

    writeText(
      page,
      'Grand Total:',
      colUnitX,
      cursorY,
      12,
      boldFont,
      headerColor,
    );

    writeText(
      page,
      `₹${grandTotal.toFixed(2)}`,
      colTotalX + colTotalWidth - 5,
      cursorY,
      12,
      boldFont,
      headerColor,
    );

    /** ---------------- FOOTER INFO ---------------- */

    const sourceWarehouse = transaction.sourceWarehouse as WarehouseDocument;
    const performedBy = transaction.performedBy;
    console.log({ sourceWarehouse, performedBy });

    cursorY -= lineGap * 2;

    writeText(page, 'Warehouse:', 60, cursorY, 11, boldFont);
    writeText(page, sourceWarehouse?.name ?? 'N/A', 150, cursorY, 11, font);

    cursorY -= lineGap;
    writeText(page, 'Performed By:', 60, cursorY, 11, boldFont);
    writeText(page, performedBy?.name ?? 'N/A', 150, cursorY, 11, font);

    cursorY -= lineGap;
    writeText(page, 'Shipment Status:', 60, cursorY, 11, boldFont);

    drawBadge(
      page,
      transaction.shipment ?? 'N/A',
      170,
      cursorY,
      boldFont,
      10,
      headerColor,
      rgb(1, 1, 1),
    );

    return pdfDoc.save();
  }
}
