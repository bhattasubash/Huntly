# Huntly 🎯

**Real-time Reddit social listening & lead routing co-pilot for solo founders.**

Huntly monitors Reddit for high-intent buying signals, classifies them with Gemini AI, and fires structured alerts — complete with 3 copy-paste reply drafts — directly to your Telegram.

The Human-In-The-Loop model keeps your Reddit account completely safe: you copy the drafts and post replies natively inside your browser. No automation, no bans.

---

## Architecture

```
Reddit JSON API (every 5 min)
        ↓  rotating User-Agents
   scraper.ts
        ↓  single-query dedup (Supabase)
        ↓  heuristic keyword filter (zero AI cost)
   contextScraper.ts  ←→  Supabase cache
        ↓  Gemini landing page synthesis
   intentProcessor.ts
        ↓  Gemini structured JSON classification
        ↓  confidence > 0.75 gate
   telegramRouter.ts
        ↓
   Telegram alert with 3 reply drafts
```

---

## Quick Start

### 1. Set up the database

Open the **Supabase SQL Editor** (`supabase.com/dashboard → SQL Editor → New Query`) and paste + run the entire contents of [`supabase_schema.sql`](./supabase_schema.sql).

This creates:
- `public.projects` — one row per product you want to monitor (with RLS)
- `public.ingested_posts` — deduplication ledger

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → `service_role` secret |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |
| `TELEGRAM_BOT_TOKEN` | Message `@BotFather` on Telegram → `/newbot` |
| `TELEGRAM_CHAT_ID` | Message your bot, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates` |

### 3. Add your first project

In the Supabase SQL Editor (or Table Editor), insert a row into `public.projects`:

```sql
INSERT INTO public.projects (
  user_id,
  company_name,
  website_url,
  keywords,
  subreddits,
  webhook_url
) VALUES (
  gen_random_uuid(),          -- replace with your auth.users id if using auth
  'YourCompany',
  'https://yourproduct.com',
  ARRAY['your-keyword', 'competitor-name', 'pain-point'],
  ARRAY['SaaS', 'startups', 'entrepreneur', 'nocode'],
  ''                          -- leave blank to use TELEGRAM_BOT_TOKEN env var
);
```

### 4. Run Huntly

```bash
npm run dev
```

You'll see the banner, env validation, and the first poll cycle begin immediately. Every 5 minutes it will scan all tracked subreddits and fire Telegram alerts for any post that scores > 75% confidence.

---

## File Reference

| File | Role |
|---|---|
| `src/index.ts` | Entry point — validates env, starts the loop |
| `src/scraper.ts` | Reddit fetcher, dedup, orchestrator |
| `src/contextScraper.ts` | Landing page HTML → Gemini product profile |
| `src/intentProcessor.ts` | Gemini structured JSON intent classifier |
| `src/telegramRouter.ts` | Formats and dispatches Telegram alerts |
| `src/types.ts` | Shared TypeScript interfaces |
| `supabase_schema.sql` | Run once in Supabase SQL Editor |

---

## How the Pipeline Works

### Stage 1 — Heuristic Pre-Filter (free)
Every fetched post is checked against 14 transactional phrases (`recommend`, `alternative`, `looking for`, `anyone know`, etc.) **and** your project's keywords. Posts that match neither are discarded instantly — zero AI API cost.

### Stage 2 — Product Context (cached)
The first time a project is processed, Huntly scrapes your `website_url`, strips navigation/footers/scripts, and sends the distilled text to Gemini for a one-paragraph product profile. This profile is cached in the `product_context` column — subsequent runs use the cache.

### Stage 3 — Intent Classification
Surviving posts are sent to Gemini with a strict JSON schema. The response guarantees:
- `isHighIntent` — boolean
- `confidenceScore` — 0.0–1.0
- `reasoning` — 1-2 sentence explanation
- `suggestedReplies` — exactly 3 human-sounding drafts

### Stage 4 — Threshold Gate
Only posts where `isHighIntent = true` **and** `confidenceScore > 0.75` fire a Telegram alert.

---

## Telegram Alert Format

```
🎯 Huntly Lead Alert

📌 Project: YourCompany
🔴 Subreddit: r/SaaS
📊 Confidence: 89%

━━━━━━━━━━━━━━━━━━━━━━━━

Post: [What's the best alternative to HubSpot for a 2-person team?](reddit.com/...)

Original Post:
> We're a tiny team and HubSpot is killing us on cost...

━━━━━━━━━━━━━━━━━━━━━━━━

🧠 Intent Reasoning:
The author is actively evaluating CRM alternatives due to pricing pain...

━━━━━━━━━━━━━━━━━━━━━━━━

💬 Reply Drafts (copy-paste inside Reddit):

Draft 1 — Direct:
[copy-paste ready text]

Draft 2 — Value-First:
[copy-paste ready text]

Draft 3 — Casual:
[copy-paste ready text]
```

---

## Cost Profile

| Operation | Cost |
|---|---|
| Reddit JSON fetch | Free |
| Heuristic filter | Free |
| `contextScraper` Gemini call | One-time per project (cached) |
| `intentProcessor` Gemini call | Per post that passes heuristic filter |
| Telegram dispatch | Free |

On the Gemini free tier (gemini-2.5-flash): ~1500 free requests/day. A typical run monitoring 5 subreddits processes ~5-15 posts/cycle after heuristic filtering.

---

## Safety Notes

- **Never commit `.env`** — it's in `.gitignore`
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — only use server-side
- All Reddit requests are read-only (no posting, no auth)
- Huntly never posts to Reddit — you always do that manually

---

## License

MIT
