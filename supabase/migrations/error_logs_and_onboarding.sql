-- Run in Supabase SQL editor.

-- Error logs for production error reporting (Part 2)
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  context text,
  message text,
  created_at timestamp DEFAULT now()
);

-- RLS: users can insert their own; no select for clients (server-only or admin)
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own error_logs"
  ON error_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Onboarding baseline (Part 3 Feature F)
CREATE TABLE IF NOT EXISTS onboarding_baseline (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  projects_started_last_6m int,
  projects_completed_last_6m int,
  common_abandonment_reason text,
  self_consistency_rating int,
  three_month_goal text,
  created_at timestamp DEFAULT now()
);

ALTER TABLE onboarding_baseline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own onboarding_baseline"
  ON onboarding_baseline FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Profiles: onboarding_complete flag
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;
