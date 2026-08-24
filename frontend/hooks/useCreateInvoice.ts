'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Invoice } from '../lib/types';

export interface CreateInvoicePayload {
  number: string;
  customer: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload) => {
      const { data } = await apiClient.post<Invoice>('/invoices', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
