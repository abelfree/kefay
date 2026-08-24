'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

const TAX_RATE = 0.15;

const lineItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.coerce.number().int().positive('Must be positive'),
  unitPrice: z.coerce.number().positive('Must be positive'),
});

const invoiceSchema = z.object({
  number: z.string().min(1, 'Invoice number is required'),
  customer: z.string().min(1, 'Customer is required'),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

type InvoiceFormInput = z.input<typeof invoiceSchema>;
export type InvoiceFormValues = z.output<typeof invoiceSchema>;

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface InvoiceFormProps {
  onSubmit: (values: InvoiceFormValues) => Promise<unknown>;
  submitError?: string;
}

export function InvoiceForm({ onSubmit, submitError }: InvoiceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      number: '',
      customer: '',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const lineItems = watch('lineItems');

  const { subtotal, tax, total } = useMemo(() => {
    const sub = lineItems.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
    const taxAmount = sub * TAX_RATE;
    return { subtotal: sub, tax: taxAmount, total: sub + taxAmount };
  }, [lineItems]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Invoice number</label>
          <input
            {...register('number')}
            placeholder="INV-1004"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {errors.number && <p className="mt-1 text-xs text-rose-600">{errors.number.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Customer</label>
          <input
            {...register('customer')}
            placeholder="Acme Retail"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {errors.customer && (
            <p className="mt-1 text-xs text-rose-600">{errors.customer.message}</p>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600">Line items</label>
          <button
            type="button"
            onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
          >
            + Add line item
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 items-start gap-2">
              <div className="col-span-6">
                <input
                  {...register(`lineItems.${index}.description`)}
                  placeholder="Description"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                {errors.lineItems?.[index]?.description && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.lineItems[index]?.description?.message}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  step="1"
                  {...register(`lineItems.${index}.quantity`)}
                  placeholder="Qty"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  step="0.01"
                  {...register(`lineItems.${index}.unitPrice`)}
                  placeholder="Unit price"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="col-span-1 flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="text-xs text-slate-400 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Remove line item"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        {errors.lineItems?.root && (
          <p className="mt-1 text-xs text-rose-600">{errors.lineItems.root.message}</p>
        )}
      </div>

      <div className="ml-auto w-full max-w-xs space-y-1 rounded-lg bg-slate-50 p-4 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span>{currencyFormatter.format(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Tax (15%)</span>
          <span>{currencyFormatter.format(tax)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
          <span>Total</span>
          <span>{currencyFormatter.format(total)}</span>
        </div>
      </div>

      {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSubmitting ? 'Creating...' : 'Create invoice'}
      </button>
    </form>
  );
}

export function extractApiErrorMessage(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message;
  }
  return undefined;
}
