import { UnprocessableEntityException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

export type RosterCsvRow = {
  employee_code?: string;
  shift_name?: string;
  roster_date?: string;
};

export type NormalizedRosterRow = {
  employeeCode: string;
  shiftName: string;
  rosterDate: string;
};

export function parseRosterCsv(content: string): RosterCsvRow[] {
  try {
    const rows: RosterCsvRow[] = parse(content, {
      columns: (headers: string[]) =>
        headers.map((header) => header.trim().toLowerCase()),
      bom: true,
      skip_empty_lines: true,
      trim: true,
    });
    if (!rows.length) throw new Error('EMPTY');
    return rows;
  } catch {
    throw new UnprocessableEntityException({
      code: 'ROSTER_IMPORT_INVALID',
      message: 'Roster CSV is empty or malformed',
    });
  }
}

export function normalizeRosterRow(row: RosterCsvRow): NormalizedRosterRow {
  const employeeCode = row.employee_code?.trim();
  const shiftName = row.shift_name?.trim();
  const rosterDate = row.roster_date?.trim();
  if (
    !employeeCode ||
    !shiftName ||
    !rosterDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(rosterDate)
  ) {
    throw new Error('ROSTER_ROW_MALFORMED');
  }
  const parsed = new Date(`${rosterDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== rosterDate
  ) {
    throw new Error('ROSTER_DATE_INVALID');
  }
  return { employeeCode, shiftName, rosterDate };
}
