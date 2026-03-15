-- ============================================================
-- PsikoPanel — Team Invitation System Migration
-- Adds status column to team_members table for invitation approval workflow
-- ============================================================

-- 1. Add status column to team_members table
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'));

-- 2. Update existing members to 'accepted' status
-- Set all existing members (especially owners) to accepted status
UPDATE public.team_members 
SET status = 'accepted' 
WHERE status IS NULL OR role = 'owner';

-- 3. Add NOT NULL constraint after updating existing records
ALTER TABLE public.team_members 
ALTER COLUMN status SET NOT NULL;

-- 4. Update RLS policies to allow users to update their own invitation status
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "tm_owner_select_update_delete" ON public.team_members;
DROP POLICY IF EXISTS "tm_insert" ON public.team_members;
DROP POLICY IF EXISTS "tm_owner_delete" ON public.team_members;

-- Create new comprehensive policies
-- Policy for team owners (full access)
CREATE POLICY "tm_owner_all" ON public.team_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
      AND t.owner_id = auth.uid()
  )
);

-- Policy for team members to read and update their own status
CREATE POLICY "tm_member_read_update" ON public.team_members
FOR SELECT
USING (psychologist_id = auth.uid());

CREATE POLICY "tm_member_update_status" ON public.team_members
FOR UPDATE
USING (psychologist_id = auth.uid())
WITH CHECK (
  psychologist_id = auth.uid() 
  AND status IN ('accepted', 'rejected')
);

-- Policy for inserting new members (by team owners)
CREATE POLICY "tm_insert_by_owner" ON public.team_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
      AND t.owner_id = auth.uid()
  )
);

-- 5. Add index for better query performance on status
CREATE INDEX IF NOT EXISTS idx_team_members_status 
ON public.team_members (status);

-- 6. Add composite index for team_id + status for efficient queries
CREATE INDEX IF NOT EXISTS idx_team_members_team_status 
ON public.team_members (team_id, status);
