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
  /**
   * Banked stoppage/added time in milliseconds — the running sum of `delta_ms`
   * across all `timer_adjust` events. This is a *separate, additive* quantity:
   * it must survive pauses (unlike `accumulated`, which `timer_pause.elapsed_ms`
   * overwrites), so added time is never folded into — or erased by — the elapsed
   * clock. A negative delta removes time (undo/reset).
   */
  added_ms: number;
}

export const INITIAL_TIMER_STATE: TimerState = {
  accumulated: 0,
  runningSince: null,
  added_ms: 0,
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
 *   - `timer_adjust` → add (or, with a negative `delta_ms`, remove) banked added
 *     time. It never touches `accumulated`/`runningSince`; `added_ms` is a separate
 *     quantity that survives pauses (see `TimerState.added_ms`).
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
    } else if (event.event_type === 'timer_adjust') {
      const { delta_ms } = eventData(event, 'timer_adjust');
      // Added time is additive and independent of the run segment: folding it
      // into `accumulated` would be erased by the next `timer_pause.elapsed_ms`
      // overwrite. A reset is expressed by the caller as a negative delta
      // (`-added_ms`), which lands `added_ms` back at 0 for the next period.
      state = { ...state, added_ms: state.added_ms + delta_ms };
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
 * Remaining time in the current period at `now`, with banked added time included.
 *
 * The elapsed clock keeps counting up truthfully; added time extends the *target*
 * (`periodMs + added_ms`) rather than rewinding the elapsed readout — the same way
 * soccer presents stoppage time ("3 minutes added" on top of the scheduled period).
 * Never returns below zero.
 */
export function remainingMs(
  state: TimerState,
  now: number,
  periodMs: number,
): number {
  return Math.max(0, periodMs + state.added_ms - liveElapsedMs(state, now));
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
