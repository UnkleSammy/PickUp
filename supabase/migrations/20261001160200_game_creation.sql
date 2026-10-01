-- PickUp — game creation schema additions (owner-ratified 2026-10-01)
--
-- Closes two gaps that blocked the game creation wizard:
--   1. `games` gains `roles_required` (which roles the host requires to run the
--      game) and `player_limit` (NULL = no limit).
--   2. `games` gains the missing host-only INSERT and DELETE policies. The spec's
--      "host can update/delete" comment only ever defined UPDATE, so a host could
--      never create a game (or remove one).
--
-- Idempotent: ALTERs are guarded with IF NOT EXISTS; policies are dropped and
-- re-created so re-running the migration is safe. No existing policy is altered.
-- Zero Trust: every client write continues to pass through RLS.

-- ============================================================================
-- Columns
-- ============================================================================
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS roles_required JSONB NOT NULL DEFAULT '{"referee": false, "timekeeper": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS player_limit INTEGER; -- NULL = no limit

-- ============================================================================
-- Host-only write policies
-- ============================================================================
DROP POLICY IF EXISTS "Allow hosts to insert games" ON games;
CREATE POLICY "Allow hosts to insert games" ON games FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Allow hosts to delete games" ON games;
CREATE POLICY "Allow hosts to delete games" ON games FOR DELETE TO authenticated USING (auth.uid() = host_id);
