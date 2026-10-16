import type { ClockMode, GameFormat, GameStructure } from '@/types/domain';

/**
 * Validation bounds for `games.game_structure` (design §1.5 + the owner-approved
 * `first_to` "run to score" extension). These are the min/max the create-game
 * steppers enforce, so the form can never produce an invalid structure
 * (constraint by construction, not by error message).
 */

/** `period_count` inclusive range (1–8). */
export const PERIOD_COUNT_MIN = 1;
export const PERIOD_COUNT_MAX = 8;

/** `period_count` is LOCKED per format; `periods` is the only free-count format. */
export const PERIOD_COUNT_BY_FORMAT: Partial<Record<GameFormat, number>> = {
  halves: 2,
  quarters: 4,
  single: 1,
};

export const PERIOD_LENGTH_MIN_MINS = 1;
export const PERIOD_LENGTH_MAX_MINS = 90;

export const BREAK_LENGTH_MIN_MINS = 0;
export const BREAK_LENGTH_MAX_MINS = 30;

export const OVERTIME_LENGTH_MIN_MINS = 1;
export const OVERTIME_LENGTH_MAX_MINS = 15;

/** Allowed `target_score` values for `format: 'first_to'`. */
export const TARGET_SCORE_VALUES = [5, 7, 11, 15, 21] as const;

/** `win_by` inclusive range for `format: 'first_to'` (default 2). */
export const WIN_BY_MIN = 1;
export const WIN_BY_MAX = 5;

export type GameStructureValidation =
  | { ok: true }
  | { ok: false; errors: string[] };

const GAME_FORMATS: readonly GameFormat[] = [
  'halves',
  'quarters',
  'periods',
  'single',
  'first_to',
];

const CLOCK_MODES: readonly ClockMode[] = ['stopped', 'running', 'running_added'];

function isInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Pure validation of a `GameStructure`. Returns `{ ok: true }` or
 * `{ ok: false, errors: string[] }` — no UI, no side effects, safe to call from
 * the create-game wizard (later step) or before an INSERT.
 *
 * `first_to` is score-based: `target_score` and `win_by` are required and the
 * time-based fields (`period_count`, `period_length_mins`, `break_length_mins`,
 * `overtime_length_mins`, `clock_mode`) are ignored. For every timed format the
 * reverse holds: `target_score`/`win_by` must be `null` and the time fields are
 * bounded.
 */
export function validateGameStructure(
  structure: GameStructure,
): GameStructureValidation {
  const errors: string[] = [];
  const { format } = structure;

  if (!GAME_FORMATS.includes(format)) {
    errors.push(`format must be one of ${GAME_FORMATS.join(', ')}`);
    // Cannot meaningfully validate the rest without a known format.
    return { ok: false, errors };
  }

  if (format === 'first_to') {
    // Score-based: only target_score and win_by are authoritative.
    if (
      structure.target_score === null ||
      !(TARGET_SCORE_VALUES as readonly number[]).includes(structure.target_score)
    ) {
      errors.push(
        `target_score must be one of ${TARGET_SCORE_VALUES.join(', ')} for 'first_to'`,
      );
    }
    if (structure.win_by === null || !isInRange(structure.win_by, WIN_BY_MIN, WIN_BY_MAX)) {
      errors.push(`win_by must be ${WIN_BY_MIN}–${WIN_BY_MAX} for 'first_to'`);
    }
    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  // Time-based formats.
  const lockedCount = PERIOD_COUNT_BY_FORMAT[format];
  if (lockedCount !== undefined) {
    if (structure.period_count !== lockedCount) {
      errors.push(`period_count must be ${lockedCount} for '${format}'`);
    }
  } else if (!isInRange(structure.period_count, PERIOD_COUNT_MIN, PERIOD_COUNT_MAX)) {
    errors.push(`period_count must be ${PERIOD_COUNT_MIN}–${PERIOD_COUNT_MAX}`);
  }

  if (!isInRange(structure.period_length_mins, PERIOD_LENGTH_MIN_MINS, PERIOD_LENGTH_MAX_MINS)) {
    errors.push(
      `period_length_mins must be ${PERIOD_LENGTH_MIN_MINS}–${PERIOD_LENGTH_MAX_MINS}`,
    );
  }

  if (!isInRange(structure.break_length_mins, BREAK_LENGTH_MIN_MINS, BREAK_LENGTH_MAX_MINS)) {
    errors.push(
      `break_length_mins must be ${BREAK_LENGTH_MIN_MINS}–${BREAK_LENGTH_MAX_MINS}`,
    );
  }

  if (
    structure.overtime_length_mins !== null &&
    !isInRange(structure.overtime_length_mins, OVERTIME_LENGTH_MIN_MINS, OVERTIME_LENGTH_MAX_MINS)
  ) {
    errors.push(
      `overtime_length_mins must be ${OVERTIME_LENGTH_MIN_MINS}–${OVERTIME_LENGTH_MAX_MINS} or null`,
    );
  }

  if (!CLOCK_MODES.includes(structure.clock_mode)) {
    errors.push(`clock_mode must be one of ${CLOCK_MODES.join(', ')}`);
  }

  if (structure.target_score !== null) {
    errors.push(`target_score must be null for timed formats`);
  }
  if (structure.win_by !== null) {
    errors.push(`win_by must be null for timed formats`);
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Short, plain-language restatement of a game structure for summary surfaces
 * (game lobby, live-match rules checklist). Distinct from create-game's longer
 * "read a sentence" line, which also carries the clock phrase + overtime.
 *
 *   halves    → "2 × 20 min halves"
 *   quarters  → "4 × 10 min quarters"
 *   periods   → "3 × 15 min periods"
 *   single    → "60 min running block"
 *   first_to  → "First to 11 · win by 2"
 */
export function structureSummary(s: GameStructure): string {
  if (s.format === 'first_to') {
    return `First to ${s.target_score ?? 11} · win by ${s.win_by ?? 2}`;
  }
  switch (s.format) {
    case 'halves':
      return `${s.period_count} × ${s.period_length_mins} min halves`;
    case 'quarters':
      return `${s.period_count} × ${s.period_length_mins} min quarters`;
    case 'periods':
      return `${s.period_count} × ${s.period_length_mins} min periods`;
    case 'single':
      return `${s.period_length_mins} min running block`;
  }
}

/**
 * The phase of the live clock at a given elapsed time, derived purely from
 * `game_structure` + the single monotonic elapsed clock (`lib/live-timer.ts`).
 * `first_to` games have no clock and are handled by the caller before this runs.
 */
export type LivePhaseKind = 'period' | 'break' | 'overtime' | 'final';

export interface LivePhase {
  kind: LivePhaseKind;
  /** Human label: "Half 1 of 2", "Halftime", "Overtime", "Final", … */
  label: string;
  /** Cumulative elapsed (ms) at which this phase begins in the running clock. */
  startMs: number;
  /** Phase duration in ms (0 for `final`). */
  durationMs: number;
}

/** "Half 1 of 2" / "Quarter 3 of 4" / "Period 2 of 3". */
function periodLabel(format: GameFormat, index: number, total: number): string {
  switch (format) {
    case 'halves':
      return `Half ${index} of ${total}`;
    case 'quarters':
      return `Quarter ${index} of ${total}`;
    case 'periods':
      return `Period ${index} of ${total}`;
    case 'single':
      return 'Game clock';
    case 'first_to':
      // Not reached — first_to games have no clock (guarded by the caller).
      return `Period ${index} of ${total}`;
  }
}

/** The intermission between periods: "Halftime" for halves, "Break" otherwise. */
function breakLabel(format: GameFormat): string {
  return format === 'halves' ? 'Halftime' : 'Break';
}

/**
 * Resolve which phase of a timed game the clock is in, by walking the timeline
 * `[period, (break), period, …, (break), period]` (+ optional overtime) against
 * a single continuously-accumulating elapsed clock.
 *
 * The caller already derives `elapsedMs` from `lib/live-timer` and passes it in;
 * no wall clock is consulted here, so the phase is deterministic across devices.
 *
 * Overtime: an OT phase is rendered whenever `overtime_length_mins` is set. The
 * "tied after regulation" precondition from the design can't be evaluated against
 * the current single-total-score scoreboard (there is no home/away split), so OT
 * is shown whenever the host configured it. When two-team scores land, gate this
 * on an actual tie.
 */
export function resolveGamePhase(structure: GameStructure, elapsedMs: number): LivePhase {
  const periodMs = structure.period_length_mins * 60_000;
  const breakMs = structure.break_length_mins * 60_000;
  const overtimeMs = (structure.overtime_length_mins ?? 0) * 60_000;

  let cursor = 0;
  for (let i = 1; i <= structure.period_count; i++) {
    const start = cursor;
    const end = start + periodMs;
    if (elapsedMs < end) {
      return {
        kind: 'period',
        label: periodLabel(structure.format, i, structure.period_count),
        startMs: start,
        durationMs: periodMs,
      };
    }
    cursor = end;

    // Intermission only between periods (never after the last), and only when
    // a break was actually configured.
    if (i < structure.period_count && breakMs > 0) {
      const breakEnd = cursor + breakMs;
      if (elapsedMs < breakEnd) {
        return {
          kind: 'break',
          label: breakLabel(structure.format),
          startMs: cursor,
          durationMs: breakMs,
        };
      }
      cursor = breakEnd;
    }
  }

  // Regulation is over. An OT period extends the timeline when configured.
  if (overtimeMs > 0) {
    const overtimeEnd = cursor + overtimeMs;
    if (elapsedMs < overtimeEnd) {
      return {
        kind: 'overtime',
        label: 'Overtime',
        startMs: cursor,
        durationMs: overtimeMs,
      };
    }
    cursor = overtimeEnd;
  }

  return { kind: 'final', label: 'Final', startMs: cursor, durationMs: 0 };
}
