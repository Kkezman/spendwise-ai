"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarRange, LogOut, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  calculateDashboard,
  formatMonthLabel,
  formatSGD,
  getDefaultMonth,
  getMonthOptions,
  type Expense,
} from "@/lib/expense-data";

type InsightResult = {
  overview: string;
  patterns: { title: string; detail: string }[];
  savings: { title: string; detail: string }[];
  recommendations: { title: string; detail: string }[];
  source: "ai";
};

const INSIGHTS_AVAILABLE = false;

export function InsightsPanel() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [analysis, setAnalysis] = useState<InsightResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/expenses")
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return null;
        }
        const payload = (await response.json()) as { expenses?: Expense[]; message?: string };
        if (!response.ok) throw new Error(payload.message ?? "Unable to load expenses.");
        return payload.expenses ?? [];
      })
      .then((loaded) => {
        if (!active || !loaded) return;
        setExpenses(loaded);
        setSelectedMonth(getDefaultMonth(loaded));
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load expenses.");
      })
      .finally(() => {
        if (active) setIsLoadingExpenses(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  const monthOptions = useMemo(() => getMonthOptions(expenses), [expenses]);

  const dashboard = useMemo(() => {
    if (!selectedMonth) {
      return null;
    }
    return calculateDashboard(expenses, selectedMonth);
  }, [expenses, selectedMonth]);

  const handleAnalyze = async () => {
    if (!selectedMonth) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "AI insight analysis failed.");
      }

      const payload = (await response.json()) as InsightResult;
      setAnalysis(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI analysis is not available right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const monthSummary = dashboard
    ? `${formatMonthLabel(selectedMonth)} • ${dashboard.transactionCount} transactions • ${formatSGD(dashboard.total)}`
    : "No spending data available";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">SpendWise AI</p>
            <h1 className="text-xl font-bold text-slate-900">AI Insights</h1>
          </div>
          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/insights" className="text-emerald-700">AI Insights</Link>
          </nav>
          <button
            type="button"
            onClick={async () => {
              const response = await fetch("/api/auth/logout", { method: "POST" });
              if (!response.ok) {
                setError("Unable to sign out. Please try again.");
                return;
              }
              router.push("/login");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Spending analysis</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Review your monthly habits</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                <CalendarRange size={15} />
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                >
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>{formatMonthLabel(month)}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
              onClick={handleAnalyze}
              disabled={!INSIGHTS_AVAILABLE || isLoading || isLoadingExpenses || !selectedMonth || expenses.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
              {INSIGHTS_AVAILABLE ? (isLoading ? "Analysing…" : "Analyse My Spending") : "AI insights temporarily unavailable"}
              </button>
            </div>
          </div>

          <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            AI spending insights are paused while provider reliability is verified. Monthly totals below are calculated from your expenses; no generated recommendations are being shown.
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5" size={16} />
              <p>{monthSummary}</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {!analysis && !isLoading && !error && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            {isLoadingExpenses
              ? "Loading your expenses…"
              : expenses.length === 0
                ? "Add expenses in your dashboard before analysing your spending."
                : "Choose a month and click “Analyse My Spending” to generate AI insights from your expense data."}
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">Spending Overview</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {analysis.source === "ai" ? "AI-generated" : "Fallback summary"}
                </span>
              </div>
              <p className="leading-7 text-slate-700">{analysis.overview}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Key Spending Patterns</h3>
                <ul className="space-y-3">
                  {analysis.patterns.map((pattern) => (
                    <li key={pattern.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-semibold text-slate-900">{pattern.title}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{pattern.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Potential Areas to Save</h3>
                <ul className="space-y-3">
                  {analysis.savings.map((saving) => (
                    <li key={saving.title} className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <div className="text-sm font-semibold text-amber-900">{saving.title}</div>
                      <p className="mt-1 text-sm leading-6 text-amber-800">{saving.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Actionable Recommendations</h3>
                <ul className="space-y-3">
                  {analysis.recommendations.map((recommendation) => (
                    <li key={recommendation.title} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="text-sm font-semibold text-emerald-900">{recommendation.title}</div>
                      <p className="mt-1 text-sm leading-6 text-emerald-800">{recommendation.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              AI insights are informational and may be imperfect. They are separate from verified spending statistics and should be treated as an interpretation rather than a factual financial verdict.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
