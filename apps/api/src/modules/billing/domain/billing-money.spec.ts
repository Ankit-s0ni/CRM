import {
  calculateGst,
  gstStateCode,
  majorToMinor,
  minorToMajor,
} from './billing-money';

describe('billing money and GST', () => {
  it('uses integer minor units without floating-point drift', () => {
    expect(majorToMinor('1999.99', 'INR')).toBe(199999n);
    expect(minorToMajor(199999n, 'INR')).toBe('1999.99');
    expect(() => majorToMinor('1.001', 'INR')).toThrow(
      'Money has too many decimal places',
    );
  });

  it('splits intra-state GST and applies IGST across states', () => {
    expect(calculateGst(10000n, '27', '27')).toMatchObject({
      taxMinor: 1800n,
      cgstMinor: 900n,
      sgstMinor: 900n,
      igstMinor: 0n,
      totalMinor: 11800n,
    });
    expect(calculateGst(10000n, '27', '29')).toMatchObject({
      cgstMinor: 0n,
      sgstMinor: 0n,
      igstMinor: 1800n,
    });
  });

  it('normalizes valid GST state codes and rejects malformed GSTINs', () => {
    expect(gstStateCode('27ABCDE1234F1Z5')).toBe('27');
    expect(gstStateCode('not-a-gstin')).toBeNull();
  });
});
