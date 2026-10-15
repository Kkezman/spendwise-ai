import { z } from "zod";
import { categoryOptions } from "@/lib/expense-data";

export const ExpenseInputSchema = z.object({
  description: z.string().trim().min(1).max(180),
  amountCents: z.number().int().positive().max(100_000_000),
  category: z.enum(categoryOptions),
  date: z.iso.date(),
  notes: z.string().trim().max(1000).default(""),
});

export const ExpenseUpdateSchema = ExpenseInputSchema.extend({
  id: z.uuid(),
});
