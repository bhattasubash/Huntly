-- ============================================================
--  Huntly — Phase 2 Migration
--  Run this in: Supabase Dashboard → SQL Editor → New Query
--
--  Purpose: Convert product_context from plain TEXT to JSONB
--  so Supabase stores and indexes the structured ProductProfile
--  as a real JSON object.
--
--  NOTE: If the column has existing TEXT data, this migration
--  will attempt to cast it to JSONB. If any row contains a
--  non-JSON string (e.g. old plain-text summaries), it will
--  fail on that row. The scraper will regenerate profiles as
--  needed on the next poll cycle.
-- ============================================================

-- Step 1: Safely clear any old plain-text (non-JSON) product_context values
-- This prevents the ALTER TYPE from failing on invalid JSON rows.
UPDATE public.projects
SET product_context = NULL
WHERE product_context IS NOT NULL
  AND product_context !~ '^\s*\{';

-- Step 2: Convert the column from TEXT to JSONB
ALTER TABLE public.projects
  ALTER COLUMN product_context TYPE JSONB
  USING product_context::JSONB;

-- Step 3: Add a GIN index for fast JSONB queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_projects_product_context
  ON public.projects USING GIN (product_context);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'product_context';
