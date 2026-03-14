-- ============================================================
-- PsikoPanel — RLS Backdoor Fix Migration
-- Removes public insert policy that could allow direct database access
-- ============================================================

-- Drop the dangerous public insert policy for appointments
drop policy if exists "appts_public_insert" on public.appointments;

-- Note: Appointments should only be created through the API route
-- which has proper authentication and rate limiting
