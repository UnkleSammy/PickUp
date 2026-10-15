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
