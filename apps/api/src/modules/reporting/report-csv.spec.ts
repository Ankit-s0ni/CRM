import { createCsv, csvCell } from './report-csv';

describe('report CSV safety', () => {
  it.each(['=SUM(A1:A2)', '+cmd', '-1+2', '@import'])(
    'neutralizes spreadsheet formula %s',
    (value) => {
      expect(csvCell(value)).toBe(`"'${value}"`);
    },
  );

  it('uses explicit stable columns, escaping quotes and UTF-8 BOM', () => {
    const output = createCsv(
      ['Name', 'Value'],
      [['A "quoted" name', 'safe']],
    ).toString('utf8');
    expect(output.startsWith('\uFEFF')).toBe(true);
    expect(output).toContain('"A ""quoted"" name","safe"');
  });
});
