import { parse } from 'csv-parse/sync';

/**
 * CSV → typed product rows. Framework-free: no NestJS, no Prisma. Resolving names to ids
 * (category, tax group, unit) is the application layer's job — this module only proves the
 * shape and the numbers.
 *
 * The column order here is also the export order, so an export round-trips through import.
 */
export const PRODUCT_IMPORT_COLUMNS = [
  'sku',
  'name',
  'barcode',
  'description',
  'brand',
  'category',
  'taxGroup',
  'unit',
  'costPrice',
  'sellingPrice',
  'mrp',
  'wholesalePrice',
  'trackInventory',
  'reorderPoint',
  'reorderQuantity',
] as const;

export type ProductImportColumn = (typeof PRODUCT_IMPORT_COLUMNS)[number];

export interface ParsedProductRow {
  readonly rowNumber: number;
  readonly raw: Record<string, string>;
  readonly sku: string;
  readonly name: string;
  readonly barcode?: string;
  readonly description?: string;
  readonly brand?: string;
  readonly category?: string;
  readonly taxGroup?: string;
  readonly unit?: string;
  readonly costPrice: string;
  readonly sellingPrice: string;
  readonly mrp?: string;
  readonly wholesalePrice?: string;
  readonly trackInventory: boolean;
  readonly reorderPoint?: number;
  readonly reorderQuantity?: number;
}

export interface ProductRowError {
  readonly rowNumber: number;
  readonly column: string;
  readonly message: string;
}

export interface ParseResult {
  readonly rows: ParsedProductRow[];
  readonly errors: ProductRowError[];
}

export class ProductImportFormatError extends Error {}

export const MAX_IMPORT_ROWS = 10_000;

// Money is Decimal(12,3); quantities are whole numbers. Validate as strings so a value
// never round-trips through a JS float on its way to the database.
const DECIMAL = /^\d{1,9}(\.\d{1,3})?$/;
const INTEGER = /^\d{1,9}$/;

function normaliseHeader(header: string) {
  return header.trim().replace(/\s+/g, '').toLowerCase();
}

function truthy(value: string) {
  return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
}

function falsy(value: string) {
  return ['0', 'false', 'no', 'n'].includes(value.trim().toLowerCase());
}

/**
 * @throws ProductImportFormatError when the file itself is unusable (bad CSV, missing
 * required headers, too many rows). Per-row problems are returned as errors instead, so one
 * bad row never rejects the file.
 */
export function parseProductCsv(text: string): ParseResult {
  let records: Record<string, string>[];
  try {
    records = parse(text, {
      columns: (header: string[]) => header.map(normaliseHeader),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (error) {
    throw new ProductImportFormatError(
      `Could not read the CSV: ${(error as Error).message}`,
    );
  }

  if (records.length === 0) {
    throw new ProductImportFormatError('The file contains no data rows');
  }
  if (records.length > MAX_IMPORT_ROWS) {
    throw new ProductImportFormatError(
      `The file has ${records.length} rows; the limit is ${MAX_IMPORT_ROWS}`,
    );
  }

  const present = new Set(Object.keys(records[0]));
  for (const required of ['sku', 'name', 'costprice', 'sellingprice']) {
    if (!present.has(required)) {
      throw new ProductImportFormatError(
        `Missing required column "${required}"`,
      );
    }
  }

  const rows: ParsedProductRow[] = [];
  const errors: ProductRowError[] = [];
  const seenSku = new Map<string, number>();
  const seenBarcode = new Map<string, number>();

  records.forEach((record, index) => {
    // +2: one for the header line, one to make it 1-based like a spreadsheet.
    const rowNumber = index + 2;
    const value = (column: string) => (record[column] ?? '').trim();
    const rowErrors: ProductRowError[] = [];
    const fail = (column: string, message: string) =>
      rowErrors.push({ rowNumber, column, message });

    const sku = value('sku');
    const name = value('name');
    if (!sku) fail('sku', 'SKU is required');
    if (!name) fail('name', 'Name is required');

    if (sku) {
      const previous = seenSku.get(sku.toLowerCase());
      if (previous) fail('sku', `Duplicate of row ${previous} in this file`);
      else seenSku.set(sku.toLowerCase(), rowNumber);
    }

    const barcode = value('barcode');
    if (barcode) {
      const previous = seenBarcode.get(barcode);
      if (previous)
        fail('barcode', `Duplicate of row ${previous} in this file`);
      else seenBarcode.set(barcode, rowNumber);
    }

    const money: Record<string, string | undefined> = {};
    for (const column of [
      'costprice',
      'sellingprice',
      'mrp',
      'wholesaleprice',
    ]) {
      const raw = value(column);
      const required = column === 'costprice' || column === 'sellingprice';
      if (!raw) {
        if (required) fail(column, 'A price is required');
        continue;
      }
      if (!DECIMAL.test(raw)) {
        fail(column, 'Must be a number with up to 3 decimal places');
        continue;
      }
      money[column] = raw;
    }

    const counts: Record<string, number | undefined> = {};
    for (const column of ['reorderpoint', 'reorderquantity']) {
      const raw = value(column);
      if (!raw) continue;
      if (!INTEGER.test(raw)) {
        fail(column, 'Must be a whole number');
        continue;
      }
      counts[column] = Number(raw);
    }

    const trackRaw = value('trackinventory');
    if (trackRaw && !truthy(trackRaw) && !falsy(trackRaw)) {
      fail('trackinventory', 'Must be true or false');
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    rows.push({
      rowNumber,
      raw: record,
      sku,
      name,
      barcode: barcode || undefined,
      description: value('description') || undefined,
      brand: value('brand') || undefined,
      category: value('category') || undefined,
      taxGroup: value('taxgroup') || undefined,
      unit: value('unit') || undefined,
      costPrice: money.costprice!,
      sellingPrice: money.sellingprice!,
      mrp: money.mrp,
      wholesalePrice: money.wholesaleprice,
      trackInventory: trackRaw ? truthy(trackRaw) : true,
      reorderPoint: counts.reorderpoint,
      reorderQuantity: counts.reorderquantity,
    });
  });

  return { rows, errors };
}
