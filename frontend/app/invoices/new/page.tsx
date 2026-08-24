'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Header } from '../../../components/Header';
import { extractApiErrorMessage, InvoiceForm, type InvoiceFormValues } from '../../../components/InvoiceForm';
import { RequireAuth } from '../../../components/RequireAuth';
import { useCreateInvoice } from '../../../hooks/useCreateInvoice';

function NewInvoiceContent() {
  const router = useRouter();
  const createInvoice = useCreateInvoice();
  const [submitError, setSubmitError] = useState<string>();

  async function handleSubmit(values: InvoiceFormValues) {
    setSubmitError(undefined);
    try {
      await createInvoice.mutateAsync(values);
      router.push('/dashboard');
    } catch (error) {
      setSubmitError(extractApiErrorMessage(error) ?? 'Could not create invoice. Please try again.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <h1 className="text-xl font-semibold text-slate-900">New invoice</h1>
        <p className="mb-6 text-sm text-slate-500">
          Line items are totaled live. Tax is calculated at 15% automatically.
        </p>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <InvoiceForm onSubmit={handleSubmit} submitError={submitError} />
        </div>
      </main>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <RequireAuth>
      <NewInvoiceContent />
    </RequireAuth>
  );
}
