'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { InvoiceStatus, PaginatedInvoices } from '../lib/types';

export function useInvoices(params: { status?: InvoiceStatus | 'ALL'; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedInvoices>('/invoices', {
        params: {
          status: params.status && params.status !== 'ALL' ? params.status : undefined,
          page: params.page,
          pageSize: params.pageSize,
        },
      });
      return data;
    },
  });
}
