import { VariantMatrixError, generateVariantMatrix } from './variant-matrix';

describe('generateVariantMatrix', () => {
  it('produces the cartesian product in declaration order', () => {
    const rows = generateVariantMatrix('COF', [
      { name: 'Size', values: ['250g', '500g'] },
      { name: 'Grind', values: ['Whole', 'Fine'] },
    ]);

    expect(rows).toHaveLength(4);
    expect(rows.map(({ name }) => name)).toEqual([
      '250g / Whole',
      '250g / Fine',
      '500g / Whole',
      '500g / Fine',
    ]);
    expect(rows[0]).toEqual({
      name: '250g / Whole',
      sku: 'COF-250G-WHOLE',
      attributes: { Size: '250g', Grind: 'Whole' },
    });
  });

  it('is deterministic so regeneration can be diffed instead of duplicated', () => {
    const attributes = [{ name: 'Colour', values: ['Red', 'Blue'] }];
    expect(generateVariantMatrix('T', attributes)).toEqual(
      generateVariantMatrix('T', attributes),
    );
  });

  it('rejects a matrix whose values collide into the same SKU', () => {
    expect(() =>
      generateVariantMatrix('T', [{ name: 'Size', values: ['X L', 'X-L'] }]),
    ).toThrow(VariantMatrixError);
  });

  it('rejects empty attributes, empty values and duplicates', () => {
    expect(() => generateVariantMatrix('T', [])).toThrow(VariantMatrixError);
    expect(() =>
      generateVariantMatrix('T', [{ name: 'Size', values: [] }]),
    ).toThrow(VariantMatrixError);
    expect(() =>
      generateVariantMatrix('T', [{ name: '  ', values: ['A'] }]),
    ).toThrow(VariantMatrixError);
    expect(() =>
      generateVariantMatrix('T', [{ name: 'Size', values: ['A', 'A'] }]),
    ).toThrow(VariantMatrixError);
  });

  it('refuses to generate an unbounded matrix', () => {
    expect(() =>
      generateVariantMatrix('T', [
        { name: 'A', values: Array.from({ length: 15 }, (_, i) => `a${i}`) },
        { name: 'B', values: Array.from({ length: 15 }, (_, i) => `b${i}`) },
      ]),
    ).toThrow(/limit is 200/);
  });
});
