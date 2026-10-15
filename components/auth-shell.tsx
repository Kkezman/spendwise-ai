import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">SpendWise AI</p>
            <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          </div>
          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Supabase Auth</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
          <p className="mb-6 text-sm text-slate-600">{subtitle}</p>
          {children}
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Need help? <Link href="/login" className="font-medium text-emerald-700">Return to sign in</Link>
        </p>
      </div>
    </main>
  );
}
