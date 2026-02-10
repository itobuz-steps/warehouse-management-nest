import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type {
  TwoProductTransactionExcelRow,
  TwoProductHistoryResult,
  TwoProductQuantityResult,
} from './types/exceldata.types';
import { EXCEL_THIN_BORDER } from './excel.constants';
import { EXCEL_PRIMARY_FILL } from './excel.constants';

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
