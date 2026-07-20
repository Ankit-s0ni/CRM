const DANGEROUS_FORMULA = /^[\t\r ]*[=+\-@]/;

export function csvCell(value: unknown): string {
  let text =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
      ? String(value)
      : '';
  if (DANGEROUS_FORMULA.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function createCsv(headers: string[], rows: unknown[][]): Buffer {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','));
  return Buffer.from(`\uFEFF${lines.join('\r\n')}\r\n`, 'utf8');
}
