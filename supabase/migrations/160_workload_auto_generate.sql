-- Migration: Add auto-generate workload support
-- Created: 2026-03-05

-- ============================================
-- STEP 1: Add columns for project linkage
-- ============================================

-- Link workload items to projects (nullable = manual items have no project_id)
ALTER TABLE workload_items ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE CASCADE;

-- Source: 'auto' (generated from projects) or 'manual' (added by user)
ALTER TABLE workload_items ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' CHECK (source IN ('auto', 'manual'));

-- Track the role within the project (lead/member/helper)
ALTER TABLE workload_items ADD COLUMN IF NOT EXISTS role_in_project text CHECK (role_in_project IN ('lead', 'member', 'helper'));

-- ============================================
-- STEP 2: Expand category constraint for Event & Internal
-- ============================================

ALTER TABLE workload_items DROP CONSTRAINT IF EXISTS workload_items_category_check;
ALTER TABLE workload_items ADD CONSTRAINT workload_items_category_check 
  CHECK (category IN ('Project', 'Proposal', 'Presentation', 'Support', 'Etc', 'Event', 'Internal'));
