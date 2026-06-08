-- ============================================================
--  SignalHop — Supabase Database Schema
--  Paste and execute the entire contents of this file in:
--  Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  TABLE: public.projects
--  One row per user project / product being monitored.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL    DEFAULT now(),
  user_id         UUID        NOT NULL,   -- references auth.users.id
  company_name    TEXT        NOT NULL,
  website_url     TEXT        NOT NULL,
  product_context TEXT,                   -- cached Gemini-generated summary
  keywords        TEXT[]      NOT NULL DEFAULT '{}',
  subreddits      TEXT[]      NOT NULL DEFAULT '{}',
  webhook_url     TEXT        NOT NULL    DEFAULT ''
);

-- Enable Row-Level Security on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: users can only SELECT their own rows
CREATE POLICY "Users can view own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can only INSERT rows they own
CREATE POLICY "Users can create own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can only UPDATE their own rows
CREATE POLICY "Users can update own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can only DELETE their own rows
CREATE POLICY "Users can delete own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
--  TABLE: public.ingested_posts
--  Deduplication ledger — tracks every Reddit post already seen.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ingested_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processed_at    TIMESTAMPTZ NOT NULL    DEFAULT now(),
  reddit_post_id  TEXT        NOT NULL    UNIQUE,  -- e.g. "t3_abc123"
  subreddit       TEXT        NOT NULL
);

-- Index for fast single-query dedup lookups
CREATE INDEX IF NOT EXISTS idx_ingested_posts_reddit_post_id
  ON public.ingested_posts (reddit_post_id);

-- ────────────────────────────────────────────────────────────
--  GRANT: Allow the service role full access (used by backend)
--  The service role bypasses RLS automatically — this is correct
--  behaviour for a background worker operating across all tenants.
-- ────────────────────────────────────────────────────────────
GRANT ALL ON public.projects      TO service_role;
GRANT ALL ON public.ingested_posts TO service_role;
