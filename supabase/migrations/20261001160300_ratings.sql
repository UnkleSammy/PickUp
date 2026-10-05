-- PickUp — ratings & trust score (Phase 2, item #1)
--
-- Turns the Phase-2 `ratings` scaffolding into a working post-game rating flow:
--   1. `ratings` gains `no_show` and a UNIQUE(game_id, rater_id, target_id)
--      so each participant can rate a given target at most once per game.
--   2. Zero-Trust RLS policies: any authenticated user may read ratings; a rater
--      may INSERT only for a *completed* game where both they and the target are
--      distinct, checked-in participants (and never themselves).
--   3. A trigger recomputes the target's `profiles.trust_score` after any
--      INSERT/UPDATE/DELETE on ratings, using no-show as a 1.0 and otherwise the
--      star score, clamped to [0,5], resetting to 5.0 when there are no ratings.
--
-- Idempotent: columns/constraints/policies/trigger are guarded so re-running is
-- safe. No existing policy is altered or weakened — every client write still
-- passes through Row-Level Security.

-- ============================================================================
-- 1. Columns + uniqueness
-- ============================================================================
ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS no_show BOOLEAN NOT NULL DEFAULT false;

-- Enforce one rating per (game, rater, target). `target_id` is NULLable (court
-- ratings are a later slice), and Postgres treats NULLs as distinct, so this
-- only dedupes actual player ratings — which is exactly what we want today.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ratings_game_rater_target_key'
      AND conrelid = 'ratings'::regclass
  ) THEN
    ALTER TABLE ratings
      ADD CONSTRAINT ratings_game_rater_target_key UNIQUE (game_id, rater_id, target_id);
  END IF;
END $$;

-- ============================================================================
-- 2. RLS policies (Zero Trust — deny-by-default remains the baseline)
-- ============================================================================
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access to ratings" ON ratings;
CREATE POLICY "Allow authenticated read access to ratings" ON ratings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Rate checked-in players of a completed game" ON ratings;
CREATE POLICY "Rate checked-in players of a completed game" ON ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    -- The rater is the authenticated user, and ratings are never self-cast
    -- (`rater_id <> target_id` is NULL for a NULL target, which also blocks
    -- court-only rows until that slice lands).
    auth.uid() = rater_id
    AND rater_id <> target_id
    -- The game must be completed.
    AND EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_id AND g.status = 'completed'
    )
    -- The rater is a checked-in participant of that game.
    AND EXISTS (
      SELECT 1 FROM game_participants rp
      WHERE rp.game_id = game_id AND rp.user_id = rater_id AND rp.status = 'checked_in'
    )
    -- The target is a distinct, checked-in participant of that game.
    AND EXISTS (
      SELECT 1 FROM game_participants tp
      WHERE tp.game_id = game_id AND tp.user_id = target_id AND tp.status = 'checked_in'
    )
  );

-- ============================================================================
-- 3. Trust score recompute trigger
-- ============================================================================
-- Runs as the migration owner (SECURITY DEFINER) so the write to `profiles`
-- cannot be blocked by the target's own profile RLS; only ever updates the
-- target's trust_score. No policy is weakened.
CREATE OR REPLACE FUNCTION public.recompute_trust_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected := OLD.target_id;
  ELSE
    affected := NEW.target_id;
  END IF;

  -- No-show counts as a 1.0; otherwise use the star score. AVG skips NULLs, and
  -- COALESCE resets the score to the default 5.0 when no ratings remain.
  IF affected IS NOT NULL THEN
    UPDATE profiles
      SET trust_score = LEAST(5.0, GREATEST(0.0, COALESCE((
        SELECT AVG(CASE WHEN no_show THEN 1 ELSE rating_score END)
        FROM ratings
        WHERE target_id = affected
      ), 5.0)))
      WHERE id = affected;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS ratings_recompute_trust ON ratings;
CREATE TRIGGER ratings_recompute_trust
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.recompute_trust_score();
