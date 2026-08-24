'use client';

import { useInvoiceAction } from '../hooks/useInvoiceActions';
import type { AuthUser, Invoice } from '../lib/types';

export function InvoiceActions({ invoice, user }: { invoice: Invoice; user: AuthUser | null }) {
  const submit = useInvoiceAction('submit');
  const approve = useInvoiceAction('approve');
  const reject = useInvoiceAction('reject');

  const pending = submit.isPending || approve.isPending || reject.isPending;

  if (invoice.status === 'DRAFT') {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => submit.mutate(invoice.id)}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-50"
      >
        Submit
      </button>
    );
  }

  if (invoice.status === 'SUBMITTED' && user?.role === 'APPROVER') {
    return (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => approve.mutate(invoice.id)}
          className="rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => reject.mutate(invoice.id)}
          className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    );
  }

  return <span className="text-xs text-slate-400">—</span>;
}
