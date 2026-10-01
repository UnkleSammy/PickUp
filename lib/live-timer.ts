import type { EventDataMap, EventType, GameEventRow } from '@/types/domain';

/**
 * Pure, framework-free timer engine for the Live Match Hub.
 *
 * The clock is never derived from the wall clock of whoever is looking at it.
 * Instead, every start/pause is a persisted `game_events` row, and this module
 * folds those rows into a deterministic state. Network latency therefore cannot
 * skew the timer: two devices that have seen the same ordered event list will
 * always compute the same elapsed time.
 */

/** The reduced state of the game clock. */
export interface TimerState {
  /** Milliseconds accumulated from completed (i.e. since-paused) run segments. */
  accumulated: number;
  /**
   * Epoch milliseconds captured when the clock last started, or `null` while the
   * clock is paused/stopped. A non-null value means "running".
   */
  runningSince: number | null;
}

export const INITIAL_TIMER_STATE: TimerState = {
  accumulated: 0,
  runningSince: null,
};

/**
 * Narrow a raw `game_events.event_data` (JSONB → `Json`) to the shape that
 * corresponds to `event_type`. The caller has already confirmed `event_type`
 * matches `type`; this is the same `as unknown as` narrowing the rest of the
 * codebase uses for JSONB columns.
 */
export function eventData<T extends EventType>(
  event: GameEventRow,
  _type: T,
): EventDataMap[T] {
  return event.event_data as unknown as EventDataMap[T];
}

/**
 * Stable, deterministic event ordering: by `created_at` ascending, tie-broken by
 * `id` so events written in the same timestamp still reduce in a fixed order.
 */
export function sortEvents(events: GameEventRow[]): GameEventRow[] {
  return [...events].sort((a, b) => {
    const aTime = Date.parse(a.created_at);
    const bTime = Date.parse(b.created_at);
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Pure reducer over the ordered event list.
 *
 *   - `timer_start`  → begin (or restart) a run segment from the recorded wall time.
 *   - `timer_pause`  → commit the recorded elapsed milliseconds and stop the segment.
 *
 * All other event types are ignored by the timer. Replaying the same list always
 * yields the same `TimerState`, which is what makes the clock trustworthy.
 */
export function reduceTimer(events: GameEventRow[]): TimerState {
  let state: TimerState = INITIAL_TIMER_STATE;

  for (const event of sortEvents(events)) {
    if (event.event_type === 'timer_start') {
      const { started_at } = eventData(event, 'timer_start');
      // `started_at` is an ISO timestamp captured at the moment of "Start".
      state = { ...state, runningSince: Date.parse(started_at) };
    } else if (event.event_type === 'timer_pause') {
      const { elapsed_ms } = eventData(event, 'timer_pause');
      // A pause carries the authoritative elapsed total at that instant, so any
      // clock drift during the run segment is corrected here.
      state = { ...state, accumulated: elapsed_ms, runningSince: null };
    }
  }

  return state;
}

/**
 * Live elapsed milliseconds at `now`. While running, the open run segment is
 * appended to the accumulated total; while paused, the accumulated total alone
 * is returned (and is already the recorded authoritative elapsed).
 */
export function liveElapsedMs(state: TimerState, now: number = Date.now()): number {
  if (state.runningSince == null) {
    return state.accumulated;
  }
  return state.accumulated + Math.max(0, now - state.runningSince);
}

/**
 * Render milliseconds as `MM:SS`. Minutes are not capped (a period that runs
 * long simply reads `75:00`); seconds are zero-padded to two digits.
 */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
