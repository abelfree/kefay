'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { setSession } from '../lib/auth';
import type { AuthUser } from '../lib/types';

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', values);
      return data;
    },
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      router.push('/dashboard');
    },
  });
}
