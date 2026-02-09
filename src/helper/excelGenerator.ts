// excel.service.ts
import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelService {
  async generateTwoProductQuantityExcel(data: any): Promise<Buffer> {
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
}
