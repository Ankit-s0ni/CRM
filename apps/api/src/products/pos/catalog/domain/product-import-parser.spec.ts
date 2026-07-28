import {
  ProductImportFormatError,
  parseProductCsv,
} from './product-import-parser';

const HEADER = 'sku,name,costPrice,sellingPrice,barcode,category,unit';

describe('parseProductCsv', () => {
  it('parses a valid file and keeps money as strings', () => {
    const { rows, errors } = parseProductCsv(
      `${HEADER}\nCOF-250,Coffee 250g,2.500,4.500,8901234567890,Beverages,PCS`,
    );

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      sku: 'COF-250',
      name: 'Coffee 250g',
      costPrice: '2.500',
      sellingPrice: '4.500',
      barcode: '8901234567890',
      category: 'Beverages',
      unit: 'PCS',
      trackInventory: true,
    });
    expect(typeof rows[0].costPrice).toBe('string');
  });

  it('is tolerant of header spacing and casing', () => {
    const { rows } = parseProductCsv(
      'SKU, Name ,Cost Price,Selling Price\nA,Item A,1.000,2.000',
    );
    expect(rows[0].sku).toBe('A');
  });

  it('reports per-row errors without discarding the good rows', () => {
    const { rows, errors } = parseProductCsv(
      `${HEADER}\nA,Item A,1.000,2.000,,,\n,Missing SKU,1.000,2.000,,,\nC,Item C,nope,2.000,,,`,
    );

    expect(rows.map(({ sku }) => sku)).toEqual(['A']);
    expect(errors).toEqual(
      expect.arrayContaining([
        { rowNumber: 3, column: 'sku', message: 'SKU is required' },
        {
          rowNumber: 4,
          column: 'costprice',
          message: 'Must be a number with up to 3 decimal places',
        },
      ]),
    );
  });

  it('flags duplicate SKUs and barcodes within the same file', () => {
    const { errors } = parseProductCsv(
      `${HEADER}\nA,Item A,1.000,2.000,111,,\nA,Item A again,1.000,2.000,111,,`,
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        {
          rowNumber: 3,
          column: 'sku',
          message: 'Duplicate of row 2 in this file',
        },
        {
          rowNumber: 3,
          column: 'barcode',
          message: 'Duplicate of row 2 in this file',
        },
      ]),
    );
  });

  it('rejects more than 3 decimal places on money', () => {
    const { errors } = parseProductCsv(`${HEADER}\nA,Item A,1.0001,2.000,,,`);
    expect(errors[0]).toMatchObject({ column: 'costprice' });
  });

  it('throws on a structurally unusable file', () => {
    expect(() => parseProductCsv('name,costPrice\nOnly,1.000')).toThrow(
      ProductImportFormatError,
    );
    expect(() => parseProductCsv(HEADER)).toThrow(/no data rows/);
  });
});
