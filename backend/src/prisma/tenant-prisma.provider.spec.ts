import { TenantContext } from '../common/tenant/tenant-context';
import { tenantScopedInvoiceAllOperations } from './tenant-prisma.provider';

describe('tenantScopedInvoiceAllOperations', () => {
  it('injects orgId into findMany where clause from TenantContext', async () => {
    const query = jest.fn().mockResolvedValue([]);

    await TenantContext.run({ orgId: 'org-a', userId: 'u1', role: 'STAFF' }, () =>
      tenantScopedInvoiceAllOperations({ operation: 'findMany', args: { where: { status: 'DRAFT' } }, query }),
    );

    expect(query).toHaveBeenCalledWith({ where: { status: 'DRAFT', orgId: 'org-a' } });
  });

  it("cannot be tricked into reading another tenant's data by a caller-supplied orgId", async () => {
    const query = jest.fn().mockResolvedValue([]);

    // Even if a caller (bug or otherwise) passed a different orgId in
    // `where`, the context's orgId wins because it's spread last.
    await TenantContext.run({ orgId: 'org-a', userId: 'u1', role: 'STAFF' }, () =>
      tenantScopedInvoiceAllOperations({
        operation: 'findFirst',
        args: { where: { id: 'inv-1', orgId: 'org-b' } },
        query,
      }),
    );

    expect(query).toHaveBeenCalledWith({ where: { id: 'inv-1', orgId: 'org-a' } });
  });

  it('injects orgId into create data', async () => {
    const query = jest.fn().mockResolvedValue({});

    await TenantContext.run({ orgId: 'org-a', userId: 'u1', role: 'STAFF' }, () =>
      tenantScopedInvoiceAllOperations({ operation: 'create', args: { data: { number: 'INV-1' } }, query }),
    );

    expect(query).toHaveBeenCalledWith({ data: { number: 'INV-1', orgId: 'org-a' } });
  });

  it('scopes count and update the same way as reads', async () => {
    const countQuery = jest.fn().mockResolvedValue(3);
    const updateQuery = jest.fn().mockResolvedValue({});

    await TenantContext.run({ orgId: 'org-a', userId: 'u1', role: 'APPROVER' }, async () => {
      await tenantScopedInvoiceAllOperations({ operation: 'count', args: { where: {} }, query: countQuery });
      await tenantScopedInvoiceAllOperations({
        operation: 'update',
        args: { where: { id: 'inv-9' }, data: { status: 'APPROVED' } },
        query: updateQuery,
      });
    });

    expect(countQuery).toHaveBeenCalledWith({ where: { orgId: 'org-a' } });
    expect(updateQuery).toHaveBeenCalledWith({
      where: { id: 'inv-9', orgId: 'org-a' },
      data: { status: 'APPROVED' },
    });
  });

  it('rejects findUnique so an unscoped read cannot slip through', async () => {
    const query = jest.fn();

    await expect(
      TenantContext.run({ orgId: 'org-a', userId: 'u1', role: 'STAFF' }, () =>
        tenantScopedInvoiceAllOperations({ operation: 'findUnique', args: { where: { id: 'inv-1' } }, query }),
      ),
    ).rejects.toThrow(/findUnique is disabled/);

    expect(query).not.toHaveBeenCalled();
  });

  it('passes queries through unscoped when there is no request in context (e.g. seed scripts)', async () => {
    const query = jest.fn().mockResolvedValue([]);

    await tenantScopedInvoiceAllOperations({ operation: 'findMany', args: { where: { status: 'DRAFT' } }, query });

    expect(query).toHaveBeenCalledWith({ where: { status: 'DRAFT' } });
  });
});
