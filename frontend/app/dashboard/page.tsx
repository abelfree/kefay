'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '../../components/DataTable';
import { Header } from '../../components/Header';
import { RequireAuth } from '../../components/RequireAuth';
import { StatusBadge } from '../../components/StatusBadge';
import { SummaryCard } from '../../components/SummaryCard';
import { useInvoices } from '../../hooks/useInvoices';
import type { Invoice, InvoiceStatus } from '../../lib/types';

const PAGE_SIZE = 10;
const STATUS_OPTIONS: Array<InvoiceStatus | 'ALL'> = [
  'ALL',
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
];

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function DashboardContent() {
  const [status, setStatus] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const invoicesQuery = useInvoices({ status, page, pageSize: PAGE_SIZE });
  const approvedQuery = useInvoices({ status: 'APPROVED', page: 1, pageSize: 500 });
  const pendingQuery = useInvoices({ status: 'SUBMITTED', page: 1, pageSize: 1 });

  const approvedTotal = useMemo(() => {
    const items = approvedQuery.data?.items ?? [];
    return items.reduce((sum, inv) => sum + Number(inv.total), 0);
  }, [approvedQuery.data]);

  function handleStatusChange(value: InvoiceStatus | 'ALL') {
    setStatus(value);
    setPage(1);
  }

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: 'number',
      header: 'Invoice #',
      render: (row) => <span className="font-medium text-slate-900">{row.number}</span>,
      sortValue: (row) => row.number,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => row.customer,
      sortValue: (row) => row.customer,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => currencyFormatter.format(Number(row.total)),
      sortValue: (row) => Number(row.total),
    },
    {
      key: 'createdAt',
      header: 'Created',
      align: 'right',
      render: (row) => dateFormatter.format(new Date(row.createdAt)),
      sortValue: (row) => row.createdAt,
    },
  ];

  const totalPages = invoicesQuery.data?.totalPages ?? 1;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>
            <p className="text-sm text-slate-500">Track invoices across your organization.</p>
          </div>
          <Link
            href="/invoices/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            New invoice
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total approved amount"
            value={currencyFormatter.format(approvedTotal)}
            accent="emerald"
          />
          <SummaryCard
            label="Pending approval"
            value={String(pendingQuery.data?.total ?? 0)}
            accent="amber"
          />
          <SummaryCard label="All invoices" value={String(invoicesQuery.data?.total ?? 0)} />
        </div>

        <div className="mb-4 flex items-center gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleStatusChange(option)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                status === option
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          rows={invoicesQuery.data?.items ?? []}
          rowKey={(row) => row.id}
          isLoading={invoicesQuery.isLoading}
          isError={invoicesQuery.isError}
          errorMessage="Couldn't load invoices. Please try again."
          emptyMessage="No invoices match this filter."
        />

        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {invoicesQuery.data?.page ?? page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
