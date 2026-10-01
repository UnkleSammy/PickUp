/**
 * Supabase generated-style database types for the PickUp `public` schema.
 * Keep in sync with `supabase/migrations/*.sql`.
 *
 * JSONB columns (`rules_penalties`, `event_data`) are typed as `Json` here,
 * matching `supabase gen types`. The strongly-typed JSONB shapes live in
 * `types/domain.ts`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          trust_score: number;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          trust_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          trust_score?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          host_id: string;
          sport: string;
          rules_text: string;
          rules_penalties: Json;
          latitude: number;
          longitude: number;
          court_name: string;
          scheduled_at: string;
          status: Database['public']['Enums']['game_status'];
          created_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          sport: string;
          rules_text: string;
          rules_penalties: Json;
          latitude: number;
          longitude: number;
          court_name: string;
          scheduled_at: string;
          status?: Database['public']['Enums']['game_status'];
          created_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          sport?: string;
          rules_text?: string;
          rules_penalties?: Json;
          latitude?: number;
          longitude?: number;
          court_name?: string;
          scheduled_at?: string;
          status?: Database['public']['Enums']['game_status'];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'games_host_id_fkey';
            columns: ['host_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      game_participants: {
        Row: {
          id: string;
          game_id: string;
          user_id: string;
          role: Database['public']['Enums']['participant_role'];
          status: Database['public']['Enums']['invite_status'];
          joined_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          user_id: string;
          role?: Database['public']['Enums']['participant_role'];
          status?: Database['public']['Enums']['invite_status'];
          joined_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['participant_role'];
          status?: Database['public']['Enums']['invite_status'];
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_participants_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      game_events: {
        Row: {
          id: string;
          game_id: string;
          created_by: string;
          event_type: Database['public']['Enums']['event_type'];
          event_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          created_by: string;
          event_type: Database['public']['Enums']['event_type'];
          event_data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          created_by?: string;
          event_type?: Database['public']['Enums']['event_type'];
          event_data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_events_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_events_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ratings: {
        Row: {
          id: string;
          game_id: string;
          rater_id: string;
          target_id: string | null;
          target_court: string | null;
          rating_score: number | null;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          rater_id: string;
          target_id?: string | null;
          target_court?: string | null;
          rating_score?: number | null;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          rater_id?: string;
          target_id?: string | null;
          target_court?: string | null;
          rating_score?: number | null;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ratings_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ratings_rater_id_fkey';
            columns: ['rater_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ratings_target_id_fkey';
            columns: ['target_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      athletic_role: 'player' | 'referee' | 'timekeeper' | 'admin';
      game_status: 'scheduling' | 'lobby' | 'live' | 'completed' | 'cancelled';
      participant_role: 'player' | 'referee' | 'timekeeper';
      invite_status: 'invited' | 'accepted' | 'declined' | 'checked_in';
      event_type:
        | 'score_change'
        | 'timer_start'
        | 'timer_pause'
        | 'penalty_foul'
        | 'game_end';
    };
    CompositeTypes: {};
  };
}
