# SpendWise AI demo script

## Before recording

- Use a dedicated demo account and clearly fictional expenses; do not expose personal transactions.
- Set the Vercel/local environment variables listed in [DEPLOYMENT.md](./DEPLOYMENT.md).
- Confirm the Supabase project URL configuration allows the app's `/auth/callback`.
- Configure the apiyi key on the server if demonstrating live categorisation. AI Spending Insights is currently paused and must not be presented as working.
- Check that the recording contains no credentials, recovery links, tokens, or dashboard secrets.

## 3–4 minute walkthrough

1. **Problem and sign-in (20 sec):** Introduce SpendWise AI as an authenticated expense tracker with per-user data access.
2. **Add an expense (40 sec):** Enter a fictional expense such as “Grab ride home,” show the category suggestion, change the category manually, and save.
3. **Dashboard (45 sec):** Show the saved transaction, monthly total, count, top category, average/day, and monthly/category charts. Search the transaction and filter by its category.
4. **Persistence (20 sec):** Refresh and show the same saved data remains.
5. **Insights status (15 sec):** If showing the Insights page, point out its temporary unavailable notice. Do not request or present AI-generated spending recommendations; provider behavior has not yet been verified after the timeout adjustment.
6. **Security and close (30 sec):** Explain authenticated server routes, Supabase RLS, server-only apiyi credentials, and that displayed financial totals are deterministic calculations.

Only demonstrate live AI categorisation when the configured apiyi request is confirmed to return `source: "ai"`. The deterministic categorisation fallback is labelled as fallback and must not be presented as AI-generated.

## Submission assets to fill in

- Public demo video: `ADD_RECORDING_URL`
- Deployed app: `ADD_DEPLOYED_URL`
- Source repository: `ADD_PUBLIC_REPOSITORY_URL`
