'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLogin } from '../../hooks/useLogin';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginValues) {
    login.mutate(values);
  }

  const errorMessage = axios.isAxiosError(login.error)
    ? (login.error.response?.data as { message?: string })?.message
    : undefined;

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            K
          </span>
          <h1 className="text-2xl font-semibold text-slate-900">Kefay</h1>
          <p className="mt-1 text-sm text-slate-500">Invoicing &amp; approvals</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
          noValidate
        >
          <div>
            <label className="block text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              {...register('email')}
              placeholder="staff@acme.test"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              {...register('password')}
              placeholder="password123"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
            )}
          </div>

          {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}

          <button
            type="submit"
            disabled={isSubmitting || login.isPending}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Demo: staff@acme.test / approver@acme.test — password123
        </p>
      </div>
    </div>
  );
}
