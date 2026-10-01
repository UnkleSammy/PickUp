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
 * `{ fouls_limit: integer, penalty_type: string, half_duration_mins: integer }`
 */
export interface RulesPenalties {
  fouls_limit: number;
  penalty_type: string;
  half_duration_mins: number;
}

/**
 * `games.roles_required`
 * `{ referee: boolean, timekeeper: boolean }`
 */
export interface RolesRequired {
  referee: boolean;
  timekeeper: boolean;
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

export type EventDataMap = {
  score_change: ScoreChangeData;
  timer_start: TimerStartData;
  timer_pause: TimerPauseData;
  penalty_foul: PenaltyFoulData;
  game_end: GameEndData;
};

/** Typed view of a game row with the JSONB columns narrowed. */
export type Game = Omit<
  Database['public']['Tables']['games']['Row'],
  'rules_penalties' | 'roles_required' | 'status'
> & {
  rules_penalties: RulesPenalties;
  roles_required: RolesRequired;
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
