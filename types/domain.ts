import type { Database } from './database.types';

// --- Enums ---
export type AthleticRole = Database['public']['Enums']['athletic_role'];
export type GameStatus = Database['public']['Enums']['game_status'];
export type ParticipantRole = Database['public']['Enums']['participant_role'];
export type InviteStatus = Database['public']['Enums']['invite_status'];
export type EventType = Database['public']['Enums']['event_type'];

// --- Table rows ---
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type GameParticipantRow = Database['public']['Tables']['game_participants']['Row'];
export type GameEventRow = Database['public']['Tables']['game_events']['Row'];
export type RatingRow = Database['public']['Tables']['ratings']['Row'];

// --- JSONB shapes ---

/**
 * `games.rules_penalties`
 * `{ fouls_limit: integer, penalty_types: string[] }`
 *
 * `half_duration_mins` is LEGACY and no longer written on create (the timeline
 * now lives in `games.game_structure`). It stays typed as REQUIRED here because
 * `live-match.tsx` still reads it as the authoritative period length until the
 * live-match wiring step lands; a later PR will drop it.
 */
export interface RulesPenalties {
  fouls_limit: number;
  penalty_types: string[];
  half_duration_mins: number;
}

/**
 * Normalize `rules_penalties` penalty types across old (single `penalty_type`
 * string) and new (`penalty_types` array) rows. Never throws and always returns
 * an array, so renderers can safely call `.join(...)`.
 */
export function penaltyTypesOf(rules: RulesPenalties | null | undefined): string[] {
  if (!rules) return [];
  if (Array.isArray(rules.penalty_types)) {
    return rules.penalty_types.filter((t): t is string => typeof t === 'string' && t.length > 0);
  }
  const legacy = (rules as unknown as { penalty_type?: unknown }).penalty_type;
  return typeof legacy === 'string' && legacy.length > 0 ? [legacy] : [];
}

/**
 * `games.roles_required`
 * `{ referee: boolean, timekeeper: boolean }`
 */
export interface RolesRequired {
  referee: boolean;
  timekeeper: boolean;
}
// --- Game structure (timeline / clock configuration) ---
/**
 * The period type that seeds `period_count`.
 *   - 'halves'   → 2 periods (halftime = break_length_mins)
 *   - 'quarters' → 4 periods
 *   - 'periods'  → custom period count (1–8)
 *   - 'single'   → one running-clock block
 *   - 'first_to' → SCORE-BASED "run to score": play to `target_score`, win by
 *     `win_by`. This is the owner-approved extension for volleyball/tennis-style
 *     and "first to 21" pickup. The time-based fields (`period_count`,
 *     `period_length_mins`, `break_length_mins`, `overtime_length_mins`,
 *     `clock_mode`) are MEANINGLESS for `first_to` and MUST be ignored — they
 *     may carry benign defaults/null where the type allows. Only `target_score`
 *     and `win_by` are authoritative for this format.
 */
export type GameFormat = 'halves' | 'quarters' | 'periods' | 'single' | 'first_to';
/**
 * The clock's dead-ball behavior — three mutually-exclusive states (a boolean
 * cannot distinguish "running with no added time" from "running with banked
 * added time").
 *   - 'stopped'       → freezes on dead balls / whistles (basketball style).
 *   - 'running'       → continuous, no added time (pickup basketball).
 *   - 'running_added' → continuous, with stoppage/added time banked by the ref
 *     (soccer); this is what surfaces the live-match quick-add control.
 */
export type ClockMode = 'stopped' | 'running' | 'running_added';
/**
 * `games.game_structure` — the configurable timeline replacing the hardcoded
 * two-half layout.
 *
 * For `format: 'first_to'` (score-based), only `target_score` and `win_by` are
 * meaningful; the time-based fields are ignored and should be left at benign
 * defaults (or `null` where the type allows).
 */
export interface GameStructure {
  /** Period type. Seeds `period_count` (ignored for `first_to`). */
  format: GameFormat;
  /** Number of periods: 2 (halves), 4 (quarters), 1 (single), or N (periods). */
  period_count: number;
  /** Length of one period, in minutes (1–90). Ignored for `first_to`. */
  period_length_mins: number;
  /** Break between periods / halftime, in minutes (0–30). 0 = no break. */
  break_length_mins: number;
  /** Timed overtime period length in minutes, or null = no overtime (1–15). */
  overtime_length_mins: number | null;
  /** Dead-ball behavior (ignored for `first_to`). */
  clock_mode: ClockMode;
  /** Score target for `first_to` (one of 5/7/11/15/21), or null for timed play. */
  target_score: number | null;
  /** Win-by margin for `first_to` (1–5, default 2), or null for timed play. */
  win_by: number | null;
}

/**
 * `game_events.event_data`, discriminated by `event_type`.
 */
export interface ScoreChangeData {
  player_id: string;
  points: number;
}

export interface TimerStartData {
  /** ISO timestamp captured when the clock started. */
  started_at: string;
}

export interface TimerPauseData {
  /** Elapsed milliseconds at the moment of pause. */
  elapsed_ms: number;
}

export interface PenaltyFoulData {
  player_id: string;
  penalty_name: string;
}

export interface GameEndData {
  final_score?: { home: number; away: number };
}

/**
 * `timer_adjust` — banked stoppage/added time. `delta_ms` is SIGNED: positive
 * adds time, negative removes it (undo is a negative delta). It never touches
 * the running clock segment; the timer reducer folds it into a separate
 * `added_ms` sum (wired in a later step).
 */
export interface TimerAdjustData {
  delta_ms: number;
}

export type EventDataMap = {
  score_change: ScoreChangeData;
  timer_start: TimerStartData;
  timer_pause: TimerPauseData;
  penalty_foul: PenaltyFoulData;
  game_end: GameEndData;
  timer_adjust: TimerAdjustData;
};

/** Typed view of a game row with the JSONB columns narrowed. */
export type Game = Omit<
  Database['public']['Tables']['games']['Row'],
  'rules_penalties' | 'roles_required' | 'game_structure' | 'status'
> & {
  rules_penalties: RulesPenalties;
  roles_required: RolesRequired;
  game_structure: GameStructure;
  status: GameStatus;
};

/** Typed view of an event row with `event_data` narrowed to the `event_type` shape. */
export type GameEvent<T extends EventType = EventType> = Omit<
  Database['public']['Tables']['game_events']['Row'],
  'event_type' | 'event_data'
> & {
  event_type: T;
  event_data: EventDataMap[T];
};
