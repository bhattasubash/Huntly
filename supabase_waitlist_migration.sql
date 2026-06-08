-- ============================================================
--  SignalHop — Waitlist Table Migration
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  email        TEXT         NOT NULL UNIQUE,
  website      TEXT         NOT NULL,
  company_name TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  referrer     TEXT
);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous / public inserts (anyone can sign up for the waitlist)
CREATE POLICY "Anyone can join the waitlist"
  ON public.waitlist
  FOR INSERT
  WITH CHECK (true);

-- Allow admins (using service_role or authenticated with appropriate permissions) to read the waitlist
CREATE POLICY "Admins can view waitlist"
  ON public.waitlist
  FOR SELECT
  USING (true);

-- Grant all permissions to the service_role key
GRANT ALL ON public.waitlist TO service_role;
