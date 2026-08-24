import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { InvoicesService } from './invoices.service';

function buildMockTenantPrisma() {
  const invoice = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const lineItem = {
    createMany: jest.fn(),
  };

  const client = {
    invoice,
    lineItem,
    $transaction: jest.fn(async (callback: (tx: typeof client) => unknown) => callback(client)),
  };

  return client;
}

describe('InvoicesService', () => {
  describe('create', () => {
    it('computes subtotal, 15% tax, and total from line items', async () => {
      const prisma = buildMockTenantPrisma();
      prisma.invoice.create.mockResolvedValue({ id: 'inv-1' });
      prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1' });

      const service = new InvoicesService(prisma as never);

      await service.create({
        number: 'INV-1',
        customer: 'Acme',
        lineItems: [
          { description: 'Widget', quantity: 3, unitPrice: 10 }, // 30
          { description: 'Gadget', quantity: 2, unitPrice: 5 }, // 10
        ],
      });

      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 40,
            tax: 6, // 40 * 0.15
            total: 46,
            status: InvoiceStatus.DRAFT,
          }),
        }),
      );
    });

    it('rounds subtotal, tax, and total to 2 decimal places', async () => {
      const prisma = buildMockTenantPrisma();
      prisma.invoice.create.mockResolvedValue({ id: 'inv-2' });
      prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-2' });

      const service = new InvoicesService(prisma as never);

      // 3 * 3.333 = 9.999 -> rounds to 10.00; tax = 1.4985 -> rounds to 1.5
      await service.create({
        number: 'INV-2',
        customer: 'Acme',
        lineItems: [{ description: 'Odd pricing', quantity: 3, unitPrice: 3.333 }],
      });

      const call = prisma.invoice.create.mock.calls[0][0];
      expect(call.data.subtotal).toBeCloseTo(10, 2);
      expect(call.data.tax).toBeCloseTo(1.5, 2);
      expect(call.data.total).toBeCloseTo(11.5, 2);
    });

    it('creates the invoice and its line items inside a single $transaction', async () => {
      const prisma = buildMockTenantPrisma();
      prisma.invoice.create.mockResolvedValue({ id: 'inv-3' });
      prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-3' });

      const service = new InvoicesService(prisma as never);
      await service.create({
        number: 'INV-3',
        customer: 'Acme',
        lineItems: [{ description: 'Widget', quantity: 1, unitPrice: 10 }],
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
      expect(prisma.lineItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ description: 'Widget', invoiceId: 'inv-3' })],
        }),
      );
    });
  });

  describe('status transitions', () => {
    it('allows DRAFT -> SUBMITTED', async () => {
      const prisma = buildMockTenantPrisma();
      prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-4', status: InvoiceStatus.DRAFT });
      prisma.invoice.update.mockResolvedValue({ id: 'inv-4', status: InvoiceStatus.SUBMITTED });

      const service = new InvoicesService(prisma as never);
      const result = await service.submit('inv-4');

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-4' },
        data: { status: InvoiceStatus.SUBMITTED },
      });
      expect(result.status).toBe(InvoiceStatus.SUBMITTED);
    });

    it('allows SUBMITTED -> APPROVED', async () => {
      const prisma = buildMockTenantPrisma();
      prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-5', status: InvoiceStatus.SUBMITTED });
      prisma.invoice.update.mockResolvedValue({ id: 'inv-5', status: InvoiceStatus.APPROVED });

      const service = new InvoicesService(prisma as never);
      await service.approve('inv-5');

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-5' },
        data: { status: InvoiceStatus.APPROVED },
      });
    });

    it('rejects DRAFT -> APPROVED as an invalid transition', async () => {
      const prisma = buildMockTenantPrisma();
      prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-6', status: InvoiceStatus.DRAFT });

      const service = new InvoicesService(prisma as never);

      await expect(service.approve('inv-6')).rejects.toThrow(BadRequestException);
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('rejects transitions on an already-approved invoice', async () => {
      const prisma = buildMockTenantPrisma();
      prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-7', status: InvoiceStatus.APPROVED });

      const service = new InvoicesService(prisma as never);

      await expect(service.reject('inv-7')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the invoice does not exist in this tenant', async () => {
      const prisma = buildMockTenantPrisma();
      // findFirst resolving to null is exactly what the tenant-scoped
      // extension returns for another org's invoice id — this also
      // documents that cross-tenant access surfaces as "not found",
      // not "forbidden".
      prisma.invoice.findFirst.mockResolvedValue(null);

      const service = new InvoicesService(prisma as never);

      await expect(service.submit('someone-elses-invoice')).rejects.toThrow(NotFoundException);
    });
  });
});
