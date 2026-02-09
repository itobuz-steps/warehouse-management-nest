import { Injectable } from '@nestjs/common';
import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import * as fontkit from 'fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';

import { ProductDocument } from 'src/products/entities/product.entity';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { WarehouseDocument } from '../../warehouse/schemas/warehouse.schema';
import { PopulatedTransaction } from '../types/types';
import { drawImage, writeLine, writeText, drawBadge } from '../utils/pdf.utils';
import { Fontkit } from 'pdf-lib/cjs/types/fontkit';

@Injectable()
export class PdfService {
  async generateTransactionPdf(
    transaction: PopulatedTransaction,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);

    /** ---- PATHS (Nest-safe) ---- */
    const rootPath = process.cwd();

    const imagePath = path.join(
      rootPath,
      'src/assets/images/warehouse-logo-removebg-preview.png',
    );

    const regularFontPath = path.join(
      rootPath,
      'src/assets/fonts/NotoSans-Regular.ttf',
    );

    const boldFontPath = path.join(
      rootPath,
      'src/assets/fonts/NotoSans-Bold.ttf',
    );

    /** ---- LOGO ---- */
    const imageBytes = await fs.readFile(imagePath);
    const pngImage = await pdfDoc.embedPng(imageBytes);

    const imgWidth = 120;
    const imgHeight = (pngImage.height / pngImage.width) * imgWidth;

    // Header logo
    drawImage(page, pngImage, 100, 710, imgWidth, imgHeight);

    // Background watermark
    drawImage(page, pngImage, 150, 250, 300, 300, 0.2);

    /** ---- FONTS ---- */
    pdfDoc.registerFontkit(fontkit as unknown as Fontkit);

    const regularFontBytes = await fs.readFile(regularFontPath);
    const boldFontBytes = await fs.readFile(boldFontPath);

    const font = await pdfDoc.embedFont(regularFontBytes);
    const boldFont = await pdfDoc.embedFont(boldFontBytes);

    const height = page.getSize().height;

    /** ---- DATA ---- */
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      quantity,
      createdAt,
      _id,
      shipment,
    } = transaction;

    const product = transaction.product as ProductDocument;
    const sourceWarehouse = transaction.sourceWarehouse as WarehouseDocument;
    const performedBy = transaction.performedBy as UserDocument;

    /** ---- CURSOR ---- */
    const lineGap = 20;
    let cursorY = height - 80;

    /** ---- HEADER ---- */
    writeText(
      page,
      'STOCK OUT INVOICE',
      200,
      cursorY,
      24,
      boldFont,
      rgb(0.725, 0.478, 0.529),
    );

    cursorY -= 40;
    writeText(page, 'Transaction ID:', 50, cursorY, 12, font);
    writeText(page, String(_id), 140, cursorY, 12, boldFont);

    cursorY -= lineGap;
    writeLine(page, { x: 50, y: cursorY }, { x: 550, y: cursorY }, 1);

    /** ---- CUSTOMER DETAILS ---- */
    cursorY -= lineGap * 2;
    writeText(
      page,
      'CUSTOMER DETAILS',
      230,
      cursorY,
      14,
      boldFont,
      rgb(0.725, 0.478, 0.529),
    );

    cursorY -= lineGap;
    writeText(page, 'Name:', 60, cursorY, 12, font);
    writeText(page, customerName ?? 'N/A', 100, cursorY, 12, boldFont);

    cursorY -= lineGap;
    writeText(page, 'Email:', 60, cursorY, 12, font);
    writeText(page, customerEmail ?? 'N/A', 100, cursorY, 12, boldFont);

    cursorY -= lineGap;
    writeText(page, 'Phone:', 60, cursorY, 12, font);
    writeText(
      page,
      customerPhone ? `+91 ${customerPhone}` : 'N/A',
      105,
      cursorY,
      12,
      boldFont,
    );

    cursorY -= lineGap;
    writeText(page, 'Address:', 60, cursorY, 12, font);
    writeText(page, customerAddress ?? 'N/A', 115, cursorY, 12, boldFont);

    /** ---- TRANSACTION DETAILS ---- */
    cursorY -= lineGap * 2;
    writeLine(page, { x: 50, y: cursorY }, { x: 550, y: cursorY }, 1);

    cursorY -= lineGap * 2;
    writeText(
      page,
      'TRANSACTION DETAILS',
      220,
      cursorY,
      14,
      boldFont,
      rgb(0.725, 0.478, 0.529),
    );

    const unitPrice = product?.price ?? 0;
    const markupPercent = product?.markup ?? 10;
    const unitPriceWithMarkup = unitPrice + (unitPrice * markupPercent) / 100;

    const totalPrice = unitPriceWithMarkup * quantity;

    cursorY -= lineGap;
    writeText(page, 'Product:', 80, cursorY, 12, font);
    writeText(page, product.name, 450, cursorY, 12, boldFont);

    cursorY -= lineGap;
    writeText(page, 'Unit Price:', 80, cursorY, 12, font);
    writeText(
      page,
      `₹${unitPriceWithMarkup.toFixed(2)}`,
      450,
      cursorY,
      12,
      boldFont,
    );

    cursorY -= lineGap;
    writeText(page, 'Quantity:', 80, cursorY, 12, font);
    writeText(page, String(quantity), 450, cursorY, 12, boldFont);

    cursorY -= lineGap;
    writeLine(page, { x: 50, y: cursorY }, { x: 550, y: cursorY }, 1);

    cursorY -= lineGap;
    writeText(
      page,
      'Total:',
      80,
      cursorY,
      12,
      boldFont,
      rgb(0.725, 0.478, 0.529),
    );
    writeText(
      page,
      `₹${totalPrice.toFixed(2)}`,
      450,
      cursorY,
      12,
      boldFont,
      rgb(0.725, 0.478, 0.529),
    );

    /** ---- STATUS ---- */
    const formattedDate = new Date(createdAt).toLocaleString();

    cursorY -= lineGap * 2;
    writeText(page, 'Status:', 60, cursorY, 12, boldFont);

    drawBadge(
      page,
      shipment ?? 'N/A',
      110,
      cursorY,
      boldFont,
      12,
      rgb(0.725, 0.478, 0.529),
      rgb(1, 1, 1),
    );

    /** ---- WAREHOUSE ---- */
    cursorY -= lineGap;
    writeText(page, 'Supplied From:', 60, cursorY, 12, boldFont);
    writeText(page, sourceWarehouse?.name ?? 'N/A', 160, cursorY, 12, font);

    cursorY -= lineGap;
    writeText(page, 'Address:', 60, cursorY, 12, boldFont);
    writeText(page, sourceWarehouse?.address ?? 'N/A', 120, cursorY, 12, font);

    /** ---- USER ---- */
    cursorY -= lineGap;
    writeText(page, 'Performed By:', 60, cursorY, 12, boldFont);
    writeText(page, performedBy?.name ?? 'N/A', 150, cursorY, 12, font);

    cursorY -= lineGap;
    writeText(page, 'Email:', 60, cursorY, 12, boldFont);
    writeText(page, performedBy?.email ?? 'N/A', 105, cursorY, 12, font);

    /** ---- DATE ---- */
    cursorY -= lineGap;
    writeText(page, 'Date:', 60, cursorY, 12, boldFont);
    writeText(page, formattedDate, 104, cursorY, 12, font);

    /** ---- FOOTER ---- */
    cursorY -= lineGap * 3;
    writeLine(page, { x: 50, y: cursorY }, { x: 550, y: cursorY }, 1);

    cursorY -= 20;
    writeText(
      page,
      'Thank you for your business!',
      210,
      cursorY,
      12,
      font,
      rgb(0.725, 0.478, 0.529),
    );

    return pdfDoc.save();
  }
}
