-- PickUp — game structure / timeline configuration (owner-approved design)
--
-- Adds the `games.game_structure` JSONB column that replaces the hardcoded
-- two-half timeline with a configurable format (halves / quarters / periods /
-- single / first_to) and clock behavior (stopped / running / running_added).
--
-- Also extends the `event_type` enum with `timer_adjust` so the live-match
-- quick-add control can bank soccer stoppage/added time as a signed
-- `{ delta_ms: number }` event. This step is the enum + column only; the timer
-- reducer and UI wiring are later steps.
--
-- Rollback-safe: `rules_penalties.half_duration_mins` is NOT dropped. It remains
-- the legacy field so a rollback can reconstruct the old timeline until a later
-- migration removes it.
--
-- Idempotent: the column and enum value are guarded with IF NOT EXISTS.

-- ============================================================================
-- 1. `games.game_structure` (JSONB, NOT NULL, sensible server default)
--    Default is the "Halves" preset: 2 x 20 min, 5 min break, running clock,
--    no overtime, no score target (time-based).
-- ============================================================================
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS game_structure JSONB NOT NULL DEFAULT '{
    "format": "halves",
    "period_count": 2,
    "period_length_mins": 20,
    "break_length_mins": 5,
    "overtime_length_mins": null,
    "clock_mode": "running",
    "target_score": null,
    "win_by": null
  }'::jsonb;

-- ============================================================================
-- 2. Backfill legacy rows from `rules_penalties.half_duration_mins`.
--    The old "20-minute halves" concept maps to a `halves` structure with
--    `period_length_mins = half_duration_mins`. Legacy rows never encoded a
--    halftime, so `break_length_mins` backfills to 0 (do not invent a 5-min
--    break that did not exist).
-- ============================================================================
UPDATE games
SET game_structure = jsonb_build_object(
  'format', 'halves',
  'period_count', 2,
  'period_length_mins', COALESCE((rules_penalties->>'half_duration_mins')::int, 20),
  'break_length_mins', 0,
  'overtime_length_mins', NULL,
  'clock_mode', 'running',
  'target_score', NULL,
  'win_by', NULL
);

-- ============================================================================
-- 3. Extend `event_type` with `timer_adjust` (added-time quick-add event).
--    Data shape: `{ delta_ms: number }` — signed (positive adds time, negative
--    removes it, so undo is a negative delta). Reducer change is a later step.
-- ============================================================================
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'timer_adjust';
