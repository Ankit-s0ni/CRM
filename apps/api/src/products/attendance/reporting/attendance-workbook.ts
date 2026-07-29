import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';

export type DailyAttendanceSheet = {
  date: string;
  rows: unknown[][];
};

export async function createAttendanceWorkbook(
  headers: string[],
  sheets: DailyAttendanceSheet[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DeltCRM';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  if (!sheets.length) {
    const worksheet = workbook.addWorksheet('No working days');
    worksheet.getCell('A1').value = 'No working days in the selected period';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getColumn(1).width = 42;
  }

  for (const sheet of sheets) {
    const date = DateTime.fromISO(sheet.date, { zone: 'utc' });
    const worksheet = workbook.addWorksheet(date.toFormat('dd-MMM'), {
      properties: { defaultRowHeight: 20 },
      views: [{ state: 'frozen', ySplit: 3 }],
    });

    worksheet.mergeCells(1, 1, 1, headers.length);
    const title = worksheet.getCell(1, 1);
    title.value = `Attendance details - ${date.toFormat('dd LLLL yyyy')}`;
    title.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 15 };
    title.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF126E68' },
    };
    title.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(1).height = 30;
    worksheet.addRow([]);

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF30343B' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = thinBorder();
    });

    for (const row of sheet.rows) {
      const excelRow = worksheet.addRow(row);
      excelRow.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = thinBorder();
      });
      styleStatusCell(excelRow.getCell(7));
      styleProvenanceCell(excelRow.getCell(10));
    }

    worksheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: Math.max(3, worksheet.rowCount), column: headers.length },
    };
    worksheet.columns = headers.map((header) => ({
      width: columnWidth(header),
    }));
    worksheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = {
    style: 'thin',
    color: { argb: 'FFD9DEE5' },
  };
  return { top: side, left: side, bottom: side, right: side };
}

function styleStatusCell(cell: ExcelJS.Cell) {
  const status = String(cell.value ?? '');
  const color =
    status === 'Present'
      ? 'FFDDF7EA'
      : status === 'Absent'
        ? 'FFFDE2E2'
        : status === 'Half day' || status.includes('pending')
          ? 'FFFFF0C2'
          : status === 'On leave' || status === 'Holiday'
            ? 'FFDDEEFF'
            : 'FFF1F3F5';
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  cell.font = { bold: true };
}

function styleProvenanceCell(cell: ExcelJS.Cell) {
  const value = String(cell.value ?? '');
  if (value === 'Marked by HR') {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE4C7' },
    };
    cell.font = { bold: true, color: { argb: 'FF8A4300' } };
  } else if (value === 'Self marked') {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDDF7EA' },
    };
  }
}

function columnWidth(header: string) {
  const widths: Record<string, number> = {
    'Employee code': 18,
    'Employee name': 26,
    Department: 20,
    Designation: 20,
    Office: 20,
    'Attendance date': 17,
    Status: 24,
    'Day label': 24,
    'Status source': 18,
    'Marked by': 18,
    Shift: 18,
    Timezone: 20,
    'Check-in': 14,
    Checkout: 14,
    'Worked (HH:MM)': 18,
    'Worked minutes': 18,
    'Break minutes': 16,
    'Late minutes': 15,
    'Early leave minutes': 20,
    'Overtime minutes': 19,
    'Record state': 16,
  };
  return widths[header] ?? Math.max(14, Math.min(32, header.length + 4));
}
