'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearSession, getUser } from '../lib/auth';
import type { AuthUser } from '../lib/types';

export function Header() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  function handleLogout() {
    clearSession();
    window.location.href = '/login';
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            K
          </span>
          <span className="text-lg font-semibold text-slate-900">Kefay</span>
        </Link>

        {user && (
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="font-medium text-slate-900">{user.email}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
