import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TenantContextService } from '../../../platform/tenancy/public';
import puppeteer from 'puppeteer';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async findAll() {
    return this.prisma.forTenant(async (tx) => {
      const orders = await tx.productOrder.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return { data: orders };
    });
  }

  async findOne(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const order = await tx.productOrder.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      return order;
    });
  }

  async generateInvoicePdf(id: string): Promise<Buffer> {
    const order = await this.findOne(id);
    
    // Retrieve tenant details for the invoice header
    const tenant = await this.prisma.forAdmin(async tx => {
      return tx.tenant.findUnique({ where: { id: order.tenantId } });
    });

    const companyName = tenant?.companyName || 'Our Store';
    
    // Generate HTML Template
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice #${order.orderNumber}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 40px; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
        table { width: 100%; text-align: left; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; border-bottom: 1px solid #eee; }
        th { background-color: #f9f9f9; font-weight: bold; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .header .company-info { text-align: right; }
        .title { font-size: 32px; font-weight: bold; color: #333; margin-bottom: 5px; }
        .totals { margin-top: 30px; border-top: 2px solid #333; padding-top: 20px; text-align: right; }
        .totals p { margin: 5px 0; font-size: 16px; }
        .totals .grand-total { font-size: 20px; font-weight: bold; color: #000; }
        .footer { margin-top: 50px; text-align: center; color: #777; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <div>
            <div class="title">INVOICE</div>
            <p><strong>Invoice #:</strong> ${order.orderNumber}<br>
            <strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}<br>
            <strong>Payment Method:</strong> ${order.paymentMethod}<br>
            <strong>Status:</strong> ${order.status}</p>
          </div>
          <div class="company-info">
            <h2>${companyName}</h2>
            <p>Customer: Walk-in</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
            <tr>
              <td>${item.product.name}</td>
              <td>${item.quantity}</td>
              <td>$${Number(item.unitPrice).toFixed(2)}</td>
              <td>$${Number(item.subtotal).toFixed(2)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <p>Subtotal: $${Number(order.subtotal).toFixed(2)}</p>
          <p>Tax: $${Number(order.taxTotal).toFixed(2)}</p>
          <p class="grand-total">Grand Total: $${Number(order.total).toFixed(2)}</p>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>This is a permanent non-editable record.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdf = await page.pdf({ 
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
