import { createHash } from 'node:crypto';
import { renderInvoicePdf } from './invoice-pdf';

describe('invoice PDF renderer', () => {
  it('renders deterministic immutable PDF bytes', () => {
    const input = {
      invoiceNumber: 'DCRM/FY2026-27/000001',
      issuedOn: '2026-07-18',
      dueOn: '2026-07-25',
      sellerName: 'DeltCRM Solutions',
      sellerGstin: '27ABCDE1234F1Z5',
      customerName: 'Acme Logistics',
      customerGstin: '27ABCDE1234F1Z5',
      currency: 'INR',
      subtotal: '1000.00',
      cgst: '90.00',
      sgst: '90.00',
      igst: '0.00',
      total: '1180.00',
      description: 'Attendance plan subscription',
      quantity: '10',
      unitAmount: '100.00',
    };
    const first = renderInvoicePdf(input);
    const second = renderInvoicePdf(input);
    expect(first.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(createHash('sha256').update(first).digest('hex')).toBe(
      createHash('sha256').update(second).digest('hex'),
    );
  });
});
