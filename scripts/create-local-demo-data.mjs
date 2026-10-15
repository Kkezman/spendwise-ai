import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(
  process.argv[2] ?? `${scriptDirectory}/../.local-demo-data/expenses.json`,
);

const expenses = [
  {
    id: "demo-sep-001",
    description: "Fictional cafe breakfast",
    amountCents: 850,
    category: "Food & Dining",
    date: "2026-09-03",
    notes: "Fictional demo transaction",
  },
  {
    id: "demo-sep-002",
    description: "Fictional train commute",
    amountCents: 240,
    category: "Transport",
    date: "2026-09-08",
    notes: "Fictional demo transaction",
  },
  {
    id: "demo-sep-003",
    description: "Fictional weekly groceries",
    amountCents: 4260,
    category: "Food & Dining",
    date: "2026-09-15",
    notes: "Fictional demo transaction",
  },
  {
    id: "demo-sep-004",
    description: "Fictional music subscription",
    amountCents: 1090,
    category: "Subscriptions",
    date: "2026-09-22",
    notes: "Fictional demo transaction",
  },
  {
    id: "demo-oct-001",
    description: "Fictional coffee with a friend",
    amountCents: 720,
    category: "Food & Dining",
    date: "2026-10-02",
    notes: "Fictional demo transaction",
  },
  {
    id: "demo-oct-002",
    description: "Fictional bus commute",
    amountCents: 180,
    category: "Transport",
    date: "2026-10-06",
    notes: "Fictional demo transaction",
  },
  {
    id: "demo-oct-003",
    description: "Fictional bookstore purchase",
    amountCents: 2350,
    category: "Education",
    date: "2026-10-11",
    notes: "Fictional demo transaction",
  },
  {
    id: "demo-oct-004",
    description: "Fictional family dinner",
    amountCents: 3840,
    category: "Food & Dining",
    date: "2026-10-18",
    notes: "Fictional demo transaction",
  },
  {
    id: "demo-oct-005",
    description: "Fictional household supplies",
    amountCents: 1575,
    category: "Shopping",
    date: "2026-10-24",
    notes: "Fictional demo transaction",
  },
];

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(expenses, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o600,
});

console.log(`Created ${expenses.length} fictional expenses for September and October 2026.`);
console.log(`Local JSON file: ${outputPath}`);
console.log("This script does not connect to Supabase or write to any database.");
