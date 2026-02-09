// excel.service.ts
import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

type TwoProductTransactionExcelRow = {
  date: string;
  productATransactions: number;
  productBTransactions: number;
};

export type TwoProductHistoryResult = {
  warehouse: string;
  productA: {
    id: string;
    name: string;
    history: TransactionHistoryItem[];
  };
  productB: {
    id: string;
    name: string;
    history: TransactionHistoryItem[];
  };
};

export type TransactionHistoryItem = {
  date: string;
  transactions: number;
};

export type TwoProductQuantityResult = {
  warehouse: string;
  productA: {
    id: string;
    name: string;
    quantity: number;
  };
  productB: {
    id: string;
    name: string;
    quantity: number;
  };
};

@Injectable()
export class ExcelService {
  async generateTwoProductQuantityExcel(
    data: TwoProductQuantityResult,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Two Product - Quantities');

    const dataArray = [data.productA, data.productB];
    const header = ['ID', 'Name', 'Quantity'];
    const headerRow = worksheet.addRow(header);

    // Styling logic
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
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

    dataArray.forEach((item) => {
      const row = worksheet.addRow([item.id, item.name, item.quantity]);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 20; // Simplified for brevity
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateTwoProductTransactionExcel(
    data: TwoProductHistoryResult,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Two Product - Transactions');

    // Header row
    const header = ['Date', data.productA.name, data.productB.name];
    const headerRow = worksheet.addRow(header);

    // IMPORTANT FIX: use slice(), NOT splice()
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

    // ✅ Header styling
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

    // ✅ Add rows
    dataArray.forEach((item) => {
      const row = worksheet.addRow([
        item.date,
        item.productATransactions,
        item.productBTransactions,
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

    //  Auto column width
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

    //  Return Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
