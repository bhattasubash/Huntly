-- ============================================================
--  Huntly — Phase 4 SQL Migration
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Step 1: Create opportunity status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_status') THEN
    CREATE TYPE opportunity_status AS ENUM ('new', 'reviewing', 'approved', 'dismissed', 'posted');
  END IF;
END
$$;

-- Step 2: Create user feedback type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_feedback_type') THEN
    CREATE TYPE user_feedback_type AS ENUM ('good_lead', 'bad_lead', 'irrelevant', 'converted');
  END IF;
END
$$;

-- Step 3: Create opportunities table
CREATE TABLE IF NOT EXISTS public.opportunities (
  id                  UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ        NOT NULL DEFAULT now(),
  user_id             UUID               NOT NULL, -- references auth.users.id
  project_id          UUID               NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reddit_post_id      TEXT               NOT NULL,
  title               TEXT               NOT NULL,
  selftext            TEXT               NOT NULL,
  author              TEXT               NOT NULL,
  permalink           TEXT               NOT NULL,
  subreddit           TEXT               NOT NULL,
  priority_score      INTEGER            NOT NULL,
  intent_type         TEXT               NOT NULL,
  opportunity_summary TEXT               NOT NULL,
  fit_reason          TEXT               NOT NULL,
  suggested_replies   JSONB              NOT NULL, -- List of suggested reply objects
  status              opportunity_status NOT NULL DEFAULT 'new',
  selected_reply      TEXT,
  custom_reply        TEXT,
  user_feedback       user_feedback_type,
  viewed_at           TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  dismissed_at        TIMESTAMPTZ,
  posted_at           TIMESTAMPTZ
);

-- Step 4: Enable Row-Level Security (RLS)
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for opportunities
-- Select: users can read their own opportunities
CREATE POLICY "Users can view own opportunities"
  ON public.opportunities
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert: users can insert their own opportunities
CREATE POLICY "Users can create own opportunities"
  ON public.opportunities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update: users can update their own opportunities
CREATE POLICY "Users can update own opportunities"
  ON public.opportunities
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete: users can delete their own opportunities
CREATE POLICY "Users can delete own opportunities"
  ON public.opportunities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Step 6: Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunities_project_id ON public.opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON public.opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);

-- Step 7: Grant permissions to service role (used by scraper)
GRANT ALL ON public.opportunities TO service_role;
