import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type {
  TwoProductTransactionExcelRow,
  TwoProductHistoryResult,
  TwoProductQuantityResult,
  TopProductExcelItem,
  InventoryCategoryExcelItem,
  WeeklyTransactionExcelItem,
} from './types/exceldata.types';
import { EXCEL_THIN_BORDER, EXCEL_PRIMARY_FILL } from './excel.constants';

@Injectable()
export class ExcelService {
  generateProductTransactionExcel = async (
    transactions: WeeklyTransactionExcelItem[],
  ): Promise<Buffer> => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Weekly Transactions');

    // Header
    const header = ['Date', 'Stock In', 'Stock Out'];
    const headerRow = worksheet.addRow(header);

    // Header styling
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDEBF7' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Rows
    transactions.forEach((transaction) => {
      const row = worksheet.addRow([
        transaction._id,
        transaction.IN,
        transaction.OUT,
      ]);

      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // ✅ Safe cell text extractor
    const getCellText = (value: ExcelJS.CellValue): string => {
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toString();
      if (value instanceof Date) return value.toISOString();
      if (value && typeof value === 'object' && 'text' in value) {
        return String(value.text);
      }
      return '';
    };

    // Auto column width
    worksheet.columns.forEach((column) => {
      if (!column?.eachCell) return;

      let maxLength = 12;

      column.eachCell({ includeEmpty: true }, (cell) => {
        const text = getCellText(cell.value);
        maxLength = Math.max(maxLength, text.length);
      });

      column.width = maxLength + 2;
    });

    // Return Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  };

  generateInventoryByCategoryExcel = async (
    categories: InventoryCategoryExcelItem[],
  ): Promise<Buffer> => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Category');

    // Header
    const header = ['Category', 'Total Quantity'];

    const headerRow = worksheet.addRow(header);

    // Header styling
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDEBF7' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Rows
    categories.forEach((category) => {
      const row = worksheet.addRow([category._id, category.totalProducts]);

      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // ✅ Safe cell text extractor
    const getCellText = (value: ExcelJS.CellValue): string => {
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toString();
      if (value instanceof Date) return value.toISOString();
      if (value && typeof value === 'object' && 'text' in value) {
        return String(value.text);
      }
      return '';
    };

    worksheet.columns.forEach((column) => {
      if (!column?.eachCell) return;

      let maxLength = 12;

      column.eachCell({ includeEmpty: true }, (cell) => {
        const text = getCellText(cell.value);
        maxLength = Math.max(maxLength, text.length);
      });

      column.width = maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  };

  generateTopFiveProductsExcel = async (
    products: TopProductExcelItem[],
  ): Promise<Buffer> => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Top Products');

    const header = [
      'Product ID',
      'Product Name',
      'Category',
      'Price',
      'Total Quantity',
    ];

    const headerRow = worksheet.addRow(header);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDEBF7' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    products.forEach((p) => {
      const row = worksheet.addRow([
        p.productId.toString(),
        p.productName,
        p.category,
        p.price,
        p.totalQuantity,
      ]);

      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    worksheet.columns.forEach((column) => {
      if (!column.eachCell) {
        return;
      }
      let maxLength = 12;

      column.eachCell({ includeEmpty: true }, (cell) => {
        let text = '';

        const value = cell.value;

        if (typeof value === 'string') {
          text = value;
        } else if (typeof value === 'number') {
          text = value.toString();
        } else if (value instanceof Date) {
          text = value.toISOString();
        } else if (value && typeof value === 'object' && 'text' in value) {
          text = String(value.text);
        }

        maxLength = Math.max(maxLength, text.length);
      });

      column.width = maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  };

  async generateTwoProductQuantityExcel(
    data: TwoProductQuantityResult,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Two Product - Quantities');

    const dataArray = [data.productA, data.productB];
    const header = ['ID', 'Name', 'Quantity'];
    const headerRow = worksheet.addRow(header);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.fill = EXCEL_PRIMARY_FILL;
      cell.border = EXCEL_THIN_BORDER;
    });

    dataArray.forEach((item) => {
      const row = worksheet.addRow([item.id, item.name, item.quantity]);
      row.eachCell((cell) => {
        cell.border = EXCEL_THIN_BORDER;
      });
    });

    worksheet.columns.forEach((column) => {
      column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateTwoProductTransactionExcel(
    data: TwoProductHistoryResult,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Two Product - Transactions');

    const header = ['Date', data.productA.name, data.productB.name];
    const headerRow = worksheet.addRow(header);

    const dataA = data.productA.history.slice(-7);
    const dataB = data.productB.history.slice(-7);

    const dataArray: TwoProductTransactionExcelRow[] = [];

    for (let i = 0; i < dataA.length; i++) {
      dataArray.push({
        date: dataA[i].date,
        productATransactions: dataA[i].transactions,
        productBTransactions: dataB[i]?.transactions ?? 0,
      });
    }

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = EXCEL_PRIMARY_FILL;
      cell.border = EXCEL_THIN_BORDER;
    });

    dataArray.forEach((item) => {
      const row = worksheet.addRow([
        item.date,
        item.productATransactions,
        item.productBTransactions,
      ]);

      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = EXCEL_THIN_BORDER;
      });
    });

    worksheet.columns.forEach((column) => {
      let maxLength = 12;

      (column as ExcelJS.Column).eachCell({ includeEmpty: true }, (cell) => {
        const length =
          typeof cell.value === 'string' || typeof cell.value === 'number'
            ? String(cell.value).length
            : 0;
        if (length > maxLength) maxLength = length;
      });

      column.width = maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
