import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedClient } from "@/lib/server-auth";
import { ExpenseInputSchema, ExpenseUpdateSchema } from "@/lib/expense-validation";
import type { Expense } from "@/lib/expense-data";

const ExpenseIdSchema = z.object({ id: z.uuid() });

type ExpenseRow = {
  id: string;
  description: string;
  amount_cents: number;
  category: Expense["category"];
  date: string;
  notes: string;
  created_at: string;
};

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    description: row.description,
    amountCents: Number(row.amount_cents),
    category: row.category,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

async function readJson(request: Request) {
  try {
    return { value: await request.json(), error: null };
  } catch {
    return { value: null, error: NextResponse.json({ message: "Invalid request body." }, { status: 400 }) };
  }
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const expenses: ExpenseRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("spendwise_expenses")
      .select("id, description, amount_cents, category, date, notes, created_at")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .range(offset, offset + 499);

    if (error) {
      console.error("Failed to read expenses:", error.message);
      return NextResponse.json({ message: "Unable to load expenses." }, { status: 500 });
    }

    const page = data as ExpenseRow[];
    expenses.push(...page);
    if (page.length < 500) break;
  }

  return NextResponse.json({ expenses: expenses.map(toExpense) });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const body = await readJson(request);
  if (body.error) return body.error;

  const parsed = ExpenseInputSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ message: "Expense details are invalid.", issues: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("spendwise_expenses")
    .insert({
      user_id: user.id,
      description: parsed.data.description,
      amount_cents: parsed.data.amountCents,
      category: parsed.data.category,
      date: parsed.data.date,
      notes: parsed.data.notes,
    })
    .select("id, description, amount_cents, category, date, notes, created_at")
    .single();

  if (error) {
    console.error("Failed to create expense:", error.message);
    return NextResponse.json({ message: "Unable to save this expense." }, { status: 500 });
  }

  return NextResponse.json({ expense: toExpense(data as ExpenseRow) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const body = await readJson(request);
  if (body.error) return body.error;

  const parsed = ExpenseUpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ message: "Expense details are invalid.", issues: parsed.error.issues }, { status: 400 });
  }

  const { id, ...expense } = parsed.data;
  const { data, error } = await supabase
    .from("spendwise_expenses")
    .update({
      description: expense.description,
      amount_cents: expense.amountCents,
      category: expense.category,
      date: expense.date,
      notes: expense.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, description, amount_cents, category, date, notes, created_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to update expense:", error.message);
    return NextResponse.json({ message: "Unable to update this expense." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ message: "Expense not found." }, { status: 404 });
  }

  return NextResponse.json({ expense: toExpense(data as ExpenseRow) });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const body = await readJson(request);
  if (body.error) return body.error;

  const parsed = ExpenseIdSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ message: "A valid expense ID is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("spendwise_expenses")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to delete expense:", error.message);
    return NextResponse.json({ message: "Unable to delete this expense." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ message: "Expense not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
