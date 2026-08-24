import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantStore {
  orgId: string;
  userId: string;
  role: 'STAFF' | 'APPROVER';
}

/**
 * Request-scoped tenant context backed by AsyncLocalStorage.
 *
 * Set once per request by TenantInterceptor (after JwtAuthGuard has
 * validated the token) and read by the tenant-scoped Prisma client
 * extension. Nothing downstream — controllers, services, Prisma —
 * has to thread orgId through function signatures by hand.
 */
export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<TenantStore>();

  static run<T>(store: TenantStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  static get(): TenantStore | undefined {
    return this.storage.getStore();
  }

  static getOrgIdOrThrow(): string {
    const store = this.storage.getStore();
    if (!store) {
      throw new Error(
        'TenantContext accessed outside of a request scope. ' +
          'Every invoice-touching request must pass through TenantInterceptor.',
      );
    }
    return store.orgId;
  }
}
