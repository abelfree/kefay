'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Invoice } from '../lib/types';

type Action = 'submit' | 'approve' | 'reject';

export function useInvoiceAction(action: Action) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<Invoice>(`/invoices/${id}/${action}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
