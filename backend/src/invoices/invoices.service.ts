import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { TENANT_PRISMA } from '../prisma/tenant-prisma.provider';
import type { TenantScopedPrismaClient } from '../prisma/tenant-prisma.provider';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';

const TAX_RATE = 0.15;

const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: [InvoiceStatus.SUBMITTED],
  SUBMITTED: [InvoiceStatus.APPROVED, InvoiceStatus.REJECTED],
  APPROVED: [],
  REJECTED: [],
};

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(TENANT_PRISMA) private readonly tenantPrisma: TenantScopedPrismaClient,
  ) {}

  async findAll(query: QueryInvoicesDto) {
    const { status, page, pageSize } = query;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.tenantPrisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { lineItems: true },
      }),
      this.tenantPrisma.invoice.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async create(dto: CreateInvoiceDto) {
    const subtotal = dto.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const tax = round2(subtotal * TAX_RATE);
    const total = round2(subtotal + tax);

    return this.tenantPrisma.$transaction(async (tx) => {
      // `orgId` is intentionally omitted here — the tenant-scoped Prisma
      // extension injects it from TenantContext before this reaches the
      // database. The cast reflects that the extension, not this call
      // site, is responsible for satisfying the full create input type.
      const invoice = await tx.invoice.create({
        data: {
          number: dto.number,
          customer: dto.customer,
          subtotal: round2(subtotal),
          tax,
          total,
          status: InvoiceStatus.DRAFT,
        } as Prisma.InvoiceUncheckedCreateInput,
      });

      await tx.lineItem.createMany({
        data: dto.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          invoiceId: invoice.id,
        })),
      });

      return tx.invoice.findFirst({
        where: { id: invoice.id },
        include: { lineItems: true },
      });
    });
  }

  async submit(id: string) {
    return this.transition(id, InvoiceStatus.SUBMITTED);
  }

  async approve(id: string) {
    return this.transition(id, InvoiceStatus.APPROVED);
  }

  async reject(id: string) {
    return this.transition(id, InvoiceStatus.REJECTED);
  }

  private async transition(id: string, target: InvoiceStatus) {
    const invoice = await this.tenantPrisma.invoice.findFirst({ where: { id } });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const allowed = VALID_TRANSITIONS[invoice.status];
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `Cannot transition invoice from ${invoice.status} to ${target}`,
      );
    }

    return this.tenantPrisma.invoice.update({
      where: { id },
      data: { status: target },
    });
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
