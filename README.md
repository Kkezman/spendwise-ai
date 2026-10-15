# SpendWise AI

SpendWise AI is a responsive expense tracker for recording personal spending, reviewing deterministic monthly statistics, and suggesting categories with AI assistance. It was prepared for the AI Lodge Hackathon.

## Problem Statement

Recording expenses is only useful when it is quick and the resulting spending data is easy to review. People need a simple way to capture transactions, understand where their money goes, and keep their financial data private.

## Solution Overview

SpendWise AI combines authenticated expense management with a dashboard of totals, category breakdowns, charts, search, and filtering. Supabase stores each user's expenses. The app calculates all financial statistics from those saved records; AI is used only for qualitative category assistance and, when available, optional spending commentary.

## Key Features

- Supabase email/password authentication, protected application routes, and password recovery.
- Create, view, edit, delete, search, and filter expenses stored in Supabase.
- Owner-scoped expense queries and PostgreSQL row-level security.
- Dashboard totals, category summaries, and monthly charts calculated from saved transactions.
- AI-assisted expense categorisation with a clearly labelled deterministic fallback and manual category override.
- Responsive interface for desktop and mobile.
- Local-only fictional demo-data generator; it writes JSON and never connects to Supabase.

AI Spending Insights is implemented but currently paused in the interface. Previous live requests through apiyi failed with HTTP 429 and a client timeout; a timeout adjustment has not yet been confirmed with a successful response. The app therefore does not show or claim generated insight recommendations. Its monthly expense totals remain available.

## AI Integration

Categorisation calls an OpenAI-compatible chat completion endpoint from a server route. SpendWise AI was configured for the AI Lodge Hackathon's **apiyi** provider, which is selected with `OPENAI_BASE_URL`; `OPENAI_MODEL` supplies the model identifier. A live categorisation request through apiyi previously succeeded. Provider availability depends on valid server-side credentials, model access, and account limits.

Categorisation output is validated against the app's approved categories. If the provider is unavailable, the app can return a clearly labelled rule-based fallback; that fallback is not represented as AI output. AI Spending Insights remains unverified and is disabled in the interface until a real provider response can be validated.

## External Tools & Datasets

- **AI Lodge apiyi** provides the OpenAI-compatible AI API used for categorisation.
- **OpenAI Node SDK** sends requests from server-side Next.js routes.
- **Supabase** provides authentication and PostgreSQL storage with row-level security.
- **Next.js, React, and TypeScript** power the web application.
- No external financial dataset is used. Analysis is based only on the authenticated user's saved expense records. The optional demo-data script generates fictional local JSON data.

## Installation & Setup

Requirements: Node.js and an existing Supabase project.

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` and configure:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (locally, `http://localhost:3000`)
   - `AUTH_RECOVERY_SECRET` (generate a private value with `openssl rand -hex 32`)
   - `OPENAI_API_KEY`
   - `OPENAI_BASE_URL` (for apiyi, `https://api.apiyi.com/v1`)
   - `OPENAI_MODEL` (a model enabled for your apiyi account)
3. Keep `.env.local` private; the API key and recovery secret must not use a `NEXT_PUBLIC_` prefix.
4. In the Supabase SQL Editor, apply [`supabase/migrations/20261012000000_spendwise_expenses.sql`](./supabase/migrations/20261012000000_spendwise_expenses.sql).
5. In Supabase **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs. For production, add the exact HTTPS callback URL for the deployed app and set `NEXT_PUBLIC_SITE_URL` accordingly.
6. Keep email confirmation enabled. Configure a verified custom SMTP sender for reliable delivery; the Supabase default email service is restricted and rate-limited.
7. For custom Supabase email templates, use the callback redirect URL and token hash. Recovery link: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`; signup confirmation link: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`. The callback also supports PKCE authorization-code links.
8. Start the app with `npm run dev`.

To check a signup or recovery email, inspect **Authentication → Users** and **Authentication → Logs** in Supabase, then check the configured email provider's delivery/bounce logs. An accepted signup request does not prove the email reached the inbox.

Optional local-only fictional data: `node scripts/create-local-demo-data.mjs` writes September and October examples to the ignored `.local-demo-data/expenses.json`. It does not import or insert anything into Supabase.

Run checks with `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## AI Safety & Limitations

- OpenAI-compatible API calls run server-side. Never expose the provider key, Supabase secrets, or recovery secret in browser code or public configuration.
- Authenticated routes and Supabase RLS limit access to the signed-in user's expense records. Cross-account RLS isolation has not been verified with separate live accounts.
- Numeric totals and chart data are calculated by application code, not generated by a language model.
- AI categorisation can be overridden by the user; provider failures may use the explicitly labelled rule-based categorisation fallback.
- AI Spending Insights is currently paused because live provider reliability has not been established. Do not present a fallback, placeholder, or unverified response as AI-generated.
- AI output is advisory and may be imperfect. The application is not financial, tax, or investment advice.
- Live email delivery, production deployment, and end-to-end recovery have not been certified by this README.
