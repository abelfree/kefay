import { PrismaClient, Role, InvoiceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'password123';

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const acme = await prisma.organization.create({
    data: { name: 'Acme Corp' },
  });
  const globex = await prisma.organization.create({
    data: { name: 'Globex Inc' },
  });

  const [acmeStaff, acmeApprover] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'staff@acme.test',
        passwordHash,
        role: Role.STAFF,
        orgId: acme.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'approver@acme.test',
        passwordHash,
        role: Role.APPROVER,
        orgId: acme.id,
      },
    }),
  ]);

  const [globexStaff, globexApprover] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'staff@globex.test',
        passwordHash,
        role: Role.STAFF,
        orgId: globex.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'approver@globex.test',
        passwordHash,
        role: Role.APPROVER,
        orgId: globex.id,
      },
    }),
  ]);

  await seedInvoices(acme.id, [
    {
      number: 'ACM-1001',
      customer: 'Northwind Traders',
      status: InvoiceStatus.APPROVED,
      lineItems: [
        { description: 'Consulting services', quantity: 10, unitPrice: 150 },
        { description: 'On-site support', quantity: 2, unitPrice: 400 },
      ],
    },
    {
      number: 'ACM-1002',
      customer: 'Contoso Ltd',
      status: InvoiceStatus.SUBMITTED,
      lineItems: [{ description: 'Software license', quantity: 5, unitPrice: 199 }],
    },
    {
      number: 'ACM-1003',
      customer: 'Fabrikam Inc',
      status: InvoiceStatus.DRAFT,
      lineItems: [{ description: 'Design services', quantity: 8, unitPrice: 120 }],
    },
  ]);

  await seedInvoices(globex.id, [
    {
      number: 'GLX-2001',
      customer: 'Initech',
      status: InvoiceStatus.APPROVED,
      lineItems: [{ description: 'Cloud hosting', quantity: 12, unitPrice: 89.5 }],
    },
    {
      number: 'GLX-2002',
      customer: 'Umbrella Corp',
      status: InvoiceStatus.REJECTED,
      lineItems: [{ description: 'Custom integration', quantity: 3, unitPrice: 850 }],
    },
  ]);

  console.log('\nSeed complete. Demo logins (all use the same password):\n');
  console.log(`  Password for every account: ${DEMO_PASSWORD}\n`);
  console.log('  Acme Corp');
  console.log(`    STAFF     ${acmeStaff.email}`);
  console.log(`    APPROVER  ${acmeApprover.email}`);
  console.log('  Globex Inc');
  console.log(`    STAFF     ${globexStaff.email}`);
  console.log(`    APPROVER  ${globexApprover.email}\n`);
}

interface SeedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface SeedInvoice {
  number: string;
  customer: string;
  status: InvoiceStatus;
  lineItems: SeedLineItem[];
}

const TAX_RATE = 0.15;

async function seedInvoices(orgId: string, invoices: SeedInvoice[]) {
  for (const inv of invoices) {
    const subtotal = round2(
      inv.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    );
    const tax = round2(subtotal * TAX_RATE);
    const total = round2(subtotal + tax);

    await prisma.invoice.create({
      data: {
        number: inv.number,
        customer: inv.customer,
        status: inv.status,
        subtotal,
        tax,
        total,
        orgId,
        lineItems: { create: inv.lineItems },
      },
    });
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
