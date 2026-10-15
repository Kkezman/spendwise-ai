export const categoryOptions = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Health & Fitness",
  "Education",
  "Travel",
  "Subscriptions",
  "Personal Care",
  "Other",
] as const;

export type ExpenseCategory = (typeof categoryOptions)[number];

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  category: ExpenseCategory;
  date: string;
  notes: string;
  createdAt: string;
};

export const getMonthKey = (date: string) => date.slice(0, 7);

export const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("en-SG", {
    month: "long",
    year: "numeric",
  }).format(date);
};

export function formatSGD(value: number) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
  }).format(value / 100);
}

export function toCents(value: number) {
  return Math.round(value * 100);
}

export function getMonthExpenses(expenses: Expense[], monthKey: string) {
  return expenses.filter((expense) => getMonthKey(expense.date) === monthKey);
}

export function getCategoryTotals(expenses: Expense[]) {
  const totals = new Map<string, number>();
  for (const category of categoryOptions) {
    totals.set(category, 0);
  }

  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amountCents);
  }
  return [...categoryOptions]
    .map((category) => ({ category, total: totals.get(category) ?? 0 }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function getRecentTransactions(expenses: Expense[], limit = 5) {
  return [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function getMonthlyTrend(expenses: Expense[]) {
  const monthMap = new Map<string, number>();
  for (const expense of expenses) {
    const monthKey = getMonthKey(expense.date);
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + expense.amountCents);
  }

  return [...monthMap.entries()]
    .map(([monthKey, total]) => ({ monthKey, total }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export function calculateDashboard(expenses: Expense[], selectedMonth: string) {
  const monthExpenses = getMonthExpenses(expenses, selectedMonth);
  const total = monthExpenses.reduce((sum, item) => sum + item.amountCents, 0);
  const previousMonthDate = new Date(`${selectedMonth}-01T00:00:00Z`);
  previousMonthDate.setUTCMonth(previousMonthDate.getUTCMonth() - 1);
  const previousMonth = `${previousMonthDate.getUTCFullYear()}-${String(previousMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const previousMonthExpenses = getMonthExpenses(expenses, previousMonth);
  const previousMonthTotal = previousMonthExpenses.reduce((sum, item) => sum + item.amountCents, 0);
  const categoryTotals = getCategoryTotals(monthExpenses);
  const highest = categoryTotals[0];
  const daysInMonth = new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0).getDate();
  const dailyAverage = monthExpenses.length ? total / Math.max(daysInMonth, 1) : 0;

  return {
    total,
    transactionCount: monthExpenses.length,
    highestSpendingCategory: highest ? { category: highest.category, total: highest.total } : null,
    averageDailySpending: dailyAverage,
    categoryBreakdown: categoryTotals,
    monthlyTrend: getMonthlyTrend(expenses),
    previousMonthTotal,
    recentTransactions: getRecentTransactions(monthExpenses, 6),
  };
}

export function getMonthOptions(expenses: Expense[]) {
  const months = new Set(expenses.map((expense) => getMonthKey(expense.date)));
  return [...months].sort().reverse();
}

export function getDefaultMonth(expenses: Expense[]) {
  const monthOptions = getMonthOptions(expenses);
  return monthOptions[0] ?? new Date().toISOString().slice(0, 7);
}
