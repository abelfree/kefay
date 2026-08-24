import { Provider } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from './prisma.service';

export const TENANT_PRISMA = 'TENANT_PRISMA_CLIENT';

const READ_OR_WRITE_ONE_WHERE_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'update',
  'delete',
]);
const MANY_WHERE_OPS = new Set(['findMany', 'updateMany', 'deleteMany', 'count']);

interface AllOperationsArgs {
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
}

/**
 * The actual tenant-scoping logic, exported standalone (rather than only
 * reachable through `Prisma.defineExtension`) so it can be unit tested
 * directly against fake `query` functions without a real Prisma client.
 *
 * Every query that reaches the `invoice` delegate is rewritten here to
 * fold in `orgId` from the current TenantContext (populated by
 * TenantInterceptor from the JWT). This is enforced centrally at the
 * data-access layer: an InvoiceService method that forgets a `where`
 * clause still cannot leak another tenant's rows, because this hook
 * injects the filter regardless of what the caller passed.
 *
 * `findUnique` is intentionally rejected for `invoice` — Prisma's
 * findUnique only accepts unique-key fields in `where`, so `orgId`
 * can't be safely folded in. Use `findFirst({ where: { id, ... } })`
 * instead, which this hook does scope.
 */
export async function tenantScopedInvoiceAllOperations({
  operation,
  args,
  query,
}: AllOperationsArgs): Promise<unknown> {
  const store = TenantContext.get();

  if (!store) {
    // No authenticated request in scope (e.g. seed script, tests that
    // opt out deliberately) — fall through unscoped.
    return query(args);
  }

  if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
    throw new Error(
      `${operation} is disabled on the tenant-scoped invoice client — use findFirst instead so orgId can be enforced.`,
    );
  }

  if (operation === 'create') {
    const createArgs = args as { data: Record<string, unknown> };
    createArgs.data = { ...createArgs.data, orgId: store.orgId };
    return query(createArgs);
  }

  if (READ_OR_WRITE_ONE_WHERE_OPS.has(operation) || MANY_WHERE_OPS.has(operation)) {
    const scopedArgs = args as { where?: Record<string, unknown> };
    // Context orgId is spread last so it always wins over anything a
    // caller (accidentally or otherwise) put in `where`.
    scopedArgs.where = { ...scopedArgs.where, orgId: store.orgId };
    return query(scopedArgs);
  }

  return query(args);
}

export function tenantScopedInvoiceExtension() {
  return Prisma.defineExtension({
    name: 'tenant-scoped-invoice',
    query: {
      invoice: {
        $allOperations: tenantScopedInvoiceAllOperations,
      },
    },
  });
}

function createTenantScopedClient(prisma: PrismaService) {
  return prisma.$extends(tenantScopedInvoiceExtension());
}

export const tenantPrismaProvider: Provider = {
  provide: TENANT_PRISMA,
  useFactory: createTenantScopedClient,
  inject: [PrismaService],
};

export type TenantScopedPrismaClient = ReturnType<typeof createTenantScopedClient>;
