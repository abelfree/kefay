# Kefay

Multi-tenant invoicing and approvals for small finance teams — every organization's invoices are cryptographically isolated at the data layer, not just filtered in application code.

**Live demo:** _add your deployed URL here_

![Kefay dashboard](./screenshot.png)

## Features

- **JWT authentication** with per-organization tenant identity baked into the token.
- **Tenant-isolated invoicing** — one organization can never read or write another's invoices, enforced centrally at the database-access layer (not per-handler).
- **Invoice creation** with dynamic line items, live-calculated totals, and server-side subtotal/tax(15%)/total computed atomically in a single transaction.
- **Approval workflow** with enforced status transitions (`DRAFT → SUBMITTED → APPROVED | REJECTED`) and a role guard restricting approve/reject to `APPROVER` users.
- **Dashboard** with status filtering, sortable columns, pagination, and summary cards (total approved amount, pending count).

## Architecture

```
kefay/
├── backend/    NestJS + Prisma + PostgreSQL — REST API on :4000
├── frontend/   Next.js (App Router) + TanStack Query — UI on :3000
└── docker-compose.yml
```

**Tenant scoping** is the core piece of this project. A JWT carries `orgId`; `JwtAuthGuard` validates the token and attaches it to the request, then a global `TenantInterceptor` runs every request handler inside an `AsyncLocalStorage`-backed `TenantContext`. A Prisma **Client Extension** on the `invoice` model reads that context and folds `orgId` into every `where` clause and every `create`'s `data` — automatically, for every query, regardless of what an individual service method does or forgets to do. A service method that omits a `where` filter still cannot leak another tenant's rows, because the extension enforces it underneath. `findUnique` is deliberately disabled on the tenant-scoped client (Prisma's `findUnique` only accepts unique-key fields, so `orgId` can't be safely folded in) — the codebase uses `findFirst({ where: { id, ... } })` instead, which the extension does scope.

**Invoice creation** runs inside a single `$transaction`: the invoice row and its line items are created together, with subtotal/tax(15%)/total computed server-side — the client never gets to dictate a total.

**Role-based access** for approve/reject is a separate, endpoint-scoped `RolesGuard` driven by an `@Roles()` decorator — unlike tenant scoping, this genuinely is endpoint-specific (only two routes need it), so a per-handler guard is the right granularity, deliberately different from the always-on tenant mechanism.

## Running locally

### With Docker (recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:4000
- Postgres: localhost:5432

The API container runs `prisma migrate deploy` automatically on start. Seed demo data once the stack is up:

```bash
docker compose exec api npm run seed
```

### Without Docker

Requires a local PostgreSQL instance.

```bash
# backend
cd backend
cp .env.example .env   # adjust DATABASE_URL if needed
npm install
npx prisma migrate dev
npm run seed
npm run start:dev       # http://localhost:4000

# frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev              # http://localhost:3000
```

### Tests

```bash
cd backend
npm test
```

## Demo logins

Seeded by `npm run seed` — two tenants, each with a STAFF and an APPROVER user. Password is the same for every account.

| Organization | Role     | Email                  | Password      |
| ------------ | -------- | ----------------------- | ------------- |
| Acme Corp    | STAFF    | staff@acme.test         | password123   |
| Acme Corp    | APPROVER | approver@acme.test      | password123   |
| Globex Inc   | STAFF    | staff@globex.test       | password123   |
| Globex Inc   | APPROVER | approver@globex.test    | password123   |

Log in as `staff@acme.test` and `staff@globex.test` in two different browser sessions to see the tenant isolation directly — each sees a completely disjoint set of invoices from the same API.

## What this demonstrates

This project is scoped to one module done carefully rather than many modules done shallowly. The four things it's built to get right:

1. **Tenant scoping enforced centrally**, at the Prisma layer via a Client Extension driven by request-scoped `AsyncLocalStorage` — not sprinkled as `where: { orgId }` in every service method, where it's one missed line away from a cross-tenant data leak.
2. **Atomic invoice creation** — invoice + line items + server-computed totals in one `$transaction`, so a partial write (invoice created, line items failed) can't happen, and the client can't submit its own total.
3. **Explicit state machine** for invoice status, validated server-side on every transition, plus a role guard scoped to exactly the two endpoints that need it.
4. **Tests that target the actual mechanisms**, not just the service's happy path: the tenant-scoping extension is unit-tested directly (orgId injection, cross-tenant-id spoofing resistance, `findUnique` rejection), the role guard is unit-tested directly (allow/deny/no-metadata), and the invoice service is unit-tested for total calculation and status-transition validation.
