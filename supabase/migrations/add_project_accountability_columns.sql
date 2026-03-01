-- Add accountability contract columns to projects (Item 9).
-- Run this in the Supabase SQL editor.

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS success_definition text,
ADD COLUMN IF NOT EXISTS abandonment_risk text;
