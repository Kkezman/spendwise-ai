"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CircleDollarSign,
  CreditCard,
  Filter,
  LogOut,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateDashboard,
  categoryOptions,
  formatMonthLabel,
  formatSGD,
  getDefaultMonth,
  getMonthOptions,
  getMonthKey,
  toCents,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expense-data";

const formatChartCurrency = (value: number) =>
  new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
  }).format(Number(value));

const chartPalette = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#f97316",
  "#a3e635",
  "#06b6d4",
];

type ExpenseFormState = {
  description: string;
  amount: string;
  category: ExpenseCategory;
  date: string;
  notes: string;
};

type SuggestionState = {
  category: ExpenseCategory;
  explanation: string;
  source: "ai" | "fallback";
};

function getInitialForm(date?: string): ExpenseFormState {
  const resolvedDate =
    date ?? (typeof window !== "undefined" ? new Date().toISOString().slice(0, 10) : "2026-10-12");

  return {
    description: "",
    amount: "",
    category: "Food & Dining",
    date: resolvedDate,
    notes: "",
  };
}

export function DashboardApp() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showForm, setShowForm] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(getInitialForm());
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const lastSuggestionRef = useRef("");
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/expenses")
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return null;
        }
        const payload = (await response.json()) as { expenses?: Expense[]; message?: string };
        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load expenses.");
        }
        return payload.expenses ?? [];
      })
      .then((loaded) => {
        if (!active || !loaded) return;
        setExpenses(loaded);
        setSelectedMonth(getDefaultMonth(loaded));
      })
      .catch((error: unknown) => {
        if (active) setDataError(error instanceof Error ? error.message : "Unable to load expenses.");
      })
      .finally(() => {
        if (active) setIsLoadingExpenses(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    return () => {
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    };
  }, []);

  const handleDescriptionChange = (value: string) => {
    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
    }

    setForm((current) => ({ ...current, description: value }));
    const trimmed = value.trim();

    if (!trimmed || trimmed.length < 3) {
      setSuggestion(null);
      lastSuggestionRef.current = "";
      setIsLoadingSuggestion(false);
      return;
    }

    if (trimmed === lastSuggestionRef.current) {
      return;
    }

    lastSuggestionRef.current = trimmed;
    setIsLoadingSuggestion(true);
    suggestionTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: trimmed }),
        });

        if (!response.ok) {
          throw new Error("Unable to fetch AI suggestion");
        }

        const payload = (await response.json()) as SuggestionState & { category: ExpenseCategory };
        setSuggestion({
          category: payload.category,
          explanation: payload.explanation,
          source: payload.source ?? "fallback",
        });
      } catch {
        setSuggestion({
          category: "Other",
          explanation: "AI unavailable right now. You can still choose a category manually.",
          source: "fallback",
        });
      } finally {
        setIsLoadingSuggestion(false);
      }
    }, 600);
  };

  const dashboard = useMemo(() => {
    if (!selectedMonth) {
      return null;
    }
    return calculateDashboard(expenses, selectedMonth);
  }, [expenses, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((expense) => {
        const matchesSearch =
          search.trim().length === 0 ||
          expense.description.toLowerCase().includes(search.toLowerCase()) ||
          expense.notes.toLowerCase().includes(search.toLowerCase());

        const matchesCategory = categoryFilter === "All" || expense.category === categoryFilter;
        const matchesMonth = !selectedMonth || getMonthKey(expense.date) === selectedMonth;
        return matchesSearch && matchesCategory && matchesMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [categoryFilter, expenses, search, selectedMonth]);

  const monthOptions = useMemo(() => getMonthOptions(expenses), [expenses]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.description.trim() || !form.amount || Number(form.amount) <= 0) {
      return;
    }

    setDataError("");
    setIsSavingExpense(true);
    try {
      const response = await fetch("/api/expenses", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          description: form.description.trim(),
          amountCents: toCents(Number(form.amount)),
          category: form.category,
          date: form.date,
          notes: form.notes.trim(),
        }),
      });
      const payload = (await response.json()) as { expense?: Expense; message?: string };
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok || !payload.expense) {
        throw new Error(payload.message ?? "Unable to save this expense.");
      }

      const savedExpense = payload.expense;
      setExpenses((current) => {
        const next = editingId
          ? current.map((expense) => (expense.id === editingId ? savedExpense : expense))
          : [savedExpense, ...current];
        return next;
      });
      setSelectedMonth(getMonthKey(savedExpense.date));
      setForm(getInitialForm());
      setSuggestion(null);
      setEditingId(null);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to save this expense.");
    } finally {
      setIsSavingExpense(false);
    }
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      description: expense.description,
      amount: (expense.amountCents / 100).toFixed(2),
      category: expense.category,
      date: expense.date,
      notes: expense.notes,
    });
    setShowForm(true);
  };

  const removeExpense = async (id: string) => {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    setDataError("");
    try {
      const response = await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json()) as { message?: string };
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to delete this expense.");
      }
      setExpenses((current) => current.filter((expense) => expense.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(getInitialForm());
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to delete this expense.");
    }
  };

  const monthTrendChart = (dashboard?.monthlyTrend ?? []).map((entry) => ({
    month: formatMonthLabel(entry.monthKey).slice(0, 3),
    total: entry.total / 100,
  }));

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">SpendWise AI</p>
            <h1 className="text-xl font-bold text-slate-900">Expense dashboard</h1>
          </div>
          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
            <Link href="/dashboard" className="text-emerald-700">Dashboard</Link>
          </nav>
          <button
            type="button"
            onClick={async () => {
              const response = await fetch("/api/auth/logout", { method: "POST" });
              if (!response.ok) {
                setDataError("Unable to sign out. Please try again.");
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

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {dataError && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {dataError}
          </div>
        )}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[{
            title: "Total expenses",
            value: dashboard ? formatSGD(dashboard.total) : formatSGD(0),
            icon: <CircleDollarSign className="text-emerald-600" />,
            tone: "emerald",
          }, {
            title: "Transactions",
            value: dashboard ? `${dashboard.transactionCount}` : "0",
            icon: <CreditCard className="text-indigo-600" />,
            tone: "indigo",
          }, {
            title: "Top category",
            value: dashboard?.highestSpendingCategory ? dashboard.highestSpendingCategory.category : "No data",
            icon: <TrendingUp className="text-amber-600" />,
            tone: "amber",
          }, {
            title: "Avg / day",
            value: dashboard ? formatSGD(dashboard.averageDailySpending) : formatSGD(0),
            icon: <BarChart3 className="text-sky-600" />,
            tone: "sky",
          }].map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">{card.title}</div>
                <div className="rounded-xl bg-slate-100 p-2">{card.icon}</div>
              </div>
              <div className="mt-4 text-2xl font-bold text-slate-900">{card.value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? "Edit expense" : "Add expense"}</h2>
              <button type="button" className="text-sm font-medium text-emerald-700" onClick={() => setShowForm((current) => !current)}>
                {showForm ? "Hide form" : "Show form"}
              </button>
            </div>

            {showForm && (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                  <input
                    value={form.description}
                    onChange={(event) => handleDescriptionChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. Grab ride home"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Amount (SGD)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                  <select
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ExpenseCategory }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {form.description.trim().length > 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    <div className="flex items-center gap-2 font-semibold">
                      <Sparkles size={16} />
                      {suggestion?.source === "ai" ? "AI suggested category" : "AI unavailable — fallback category"}
                    </div>
                    <p className="mt-2 leading-relaxed text-emerald-700">
                      {isLoadingSuggestion ? "Checking your description…" : suggestion?.explanation ?? "No suggestion yet."}
                    </p>
                    {suggestion && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-700">
                          {suggestion.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, category: suggestion.category }))}
                          className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Accept suggestion
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setForm(getInitialForm());
                        setSuggestion(null);
                      }}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" disabled={isSavingExpense} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                    {isSavingExpense ? "Saving…" : editingId ? "Save changes" : "Add expense"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Spending overview</h2>
                  <p className="text-sm text-slate-500">Monitor changes, category mix, and recent activity.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                    <Calendar size={15} />
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
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthTrendChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                      <Tooltip formatter={(value) => [formatChartCurrency(Number(Array.isArray(value) ? value[0] : value ?? 0)), "Spent"]} />
                      <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dashboard?.categoryBreakdown ?? []} dataKey="total" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {(dashboard?.categoryBreakdown ?? []).map((entry, index) => (
                          <Cell key={entry.category} fill={chartPalette[index % chartPalette.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatChartCurrency(Number(Array.isArray(value) ? value[0] : value ?? 0)), "Spent"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-slate-900">Expense list</h2>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-40 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Search expenses"
                  />
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <Filter size={15} />
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="bg-transparent pr-1 text-sm font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="All">All categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {isLoadingExpenses && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading your expenses…</td>
                      </tr>
                    )}
                    {!isLoadingExpenses && filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          {expenses.length === 0
                            ? "No expenses yet. Add your first expense to get started."
                            : "No expenses match your filters for this period."}
                        </td>
                      </tr>
                    )}
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="align-middle">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{expense.description}</div>
                          {expense.notes && <div className="mt-1 text-xs text-slate-500">{expense.notes}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{expense.category}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{new Date(expense.date).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatSGD(expense.amountCents)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => startEdit(expense)} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" aria-label={`Edit ${expense.description}`}>
                              <Pencil size={15} />
                            </button>
                            <button type="button" onClick={() => removeExpense(expense.id)} className="rounded-full bg-red-50 p-2 text-red-600 hover:bg-red-100" aria-label={`Delete ${expense.description}`}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
