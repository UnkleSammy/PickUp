import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { withErrorNotification } from '@/lib/async-mutation';
import { useAuth } from '@/lib/auth-context';
import { toErrorMessage } from '@/lib/errors';
import {
  eventData,
  formatClock,
  liveElapsedMs,
  reduceTimer,
  sortEvents,
} from '@/lib/live-timer';
import { getSupabase, isSupabaseConfigured, SUPABASE_CONFIG_ERROR } from '@/lib/supabase';
import type { Database, Json } from '@/types/database.types';
import type {
  EventDataMap,
  EventType,
  Game,
  GameEventRow,
  GameParticipantRow,
  RolesRequired,
  RulesPenalties,
} from '@/types/domain';

type GamesRow = Database['public']['Tables']['games']['Row'];

/** A participant row joined with its profile (username + avatar). */
interface Participant extends GameParticipantRow {
  profiles: { username: string; avatar_url: string | null } | null;
}

type ViewMode = 'player' | 'timekeeper' | 'referee';

/** Preset infractions for the referee's "Log foul" quick action. */
const FOUL_PRESETS = ['Personal', 'Technical', 'Flagrant', 'Unsportsmanlike', 'Other'];

function toGame(row: GamesRow): Game {
  return {
    ...row,
    rules_penalties: row.rules_penalties as unknown as RulesPenalties,
    roles_required: row.roles_required as unknown as RolesRequired,
  };
}

/** Hermes-safe `HH:MM AM/PM` from an ISO timestamp (avoids Intl/toLocaleTimeString). */
function formatClockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  const hour12 = date.getHours() % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
}

/** One of the timekeeper's big buttons (Start / Pause / Reset / Period End). */
function TimeButton({
  label,
  onPress,
  disabled,
  tone,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  tone: 'start' | 'pause' | 'reset' | 'period';
}) {
  const activeColor: Record<typeof tone, string> = {
    start: 'bg-emerald-500',
    pause: 'bg-amber-500',
    reset: 'bg-gray-500',
    period: 'bg-red-500',
  };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 items-center justify-center rounded-xl py-4 ${
        disabled ? 'bg-gray-200' : activeColor[tone]
      }`}
    >
      <Text className={`text-base font-semibold ${disabled ? 'text-gray-400' : 'text-white'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function LiveMatchScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading, configured } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<GameEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single in-flight mutation flag keeps taps predictable (same pattern as the lobby).
  const [mutating, setMutating] = useState(false);
  const [foulDraft, setFoulDraft] = useState<{ playerId: string; penaltyName: string } | null>(
    null,
  );

  const [inlineError, setInlineError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'error' | 'success' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, tone: 'error' | 'success' = 'error') => {
    setToast({ message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const notifyError = useCallback(
    (message: string) => {
      setInlineError(message);
      showToast(message, 'error');
    },
    [showToast],
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // --- Data loading ---------------------------------------------------------------
  const loadGame = useCallback(async (): Promise<Game | null> => {
    if (!id) return null;
    const supabase = getSupabase();
    const { data, error } = await supabase.from('games').select('*').eq('id', id).single();
    if (error) {
      // PGRST116 == "0 rows" from .single()
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    if (!data) return null;
    return toGame(data as GamesRow);
  }, [id]);

  const fetchParticipants = useCallback(async (): Promise<Participant[]> => {
    if (!id) return [];
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('game_participants')
      .select('*, profiles(username, avatar_url)')
      .eq('game_id', id)
      .order('joined_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Participant[];
  }, [id]);

  const fetchEvents = useCallback(async (): Promise<GameEventRow[]> => {
    if (!id) return [];
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('game_events')
      .select('*')
      .eq('game_id', id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as GameEventRow[];
  }, [id]);

  const refreshParticipants = useCallback(async (): Promise<void> => {
    try {
      const rows = await fetchParticipants();
      setParticipants(rows);
    } catch {
      // Best-effort refresh — the realtime subscription keeps the roster fresh.
    }
  }, [fetchParticipants]);

  // Initial load — game, participants, and the full event history, in parallel.
  useEffect(() => {
    if (!id || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const [loadedGame, loadedParticipants, loadedEvents] = await Promise.all([
          loadGame(),
          fetchParticipants(),
          fetchEvents(),
        ]);
        if (!active) return;
        if (!loadedGame) {
          setError('Game not found. It may have been cancelled or removed.');
          setLoading(false);
          return;
        }
        setGame(loadedGame);
        setParticipants(loadedParticipants);
        setEvents(loadedEvents);
      } catch (err) {
        if (!active) return;
        setError(toErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, loadGame, fetchParticipants, fetchEvents]);

  // --- Realtime -------------------------------------------------------------------
  // New events appear immediately (INSERT on game_events for this game); the
  // checked-in roster refreshes on participant INSERT/UPDATE. Channels are removed
  // on unmount and skipped entirely when Supabase is unconfigured.
  useEffect(() => {
    if (!id || !isSupabaseConfigured) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`live-match:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_events', filter: `game_id=eq.${id}` },
        (payload) => {
          const row = payload.new as unknown as GameEventRow;
          // De-dupe by id: a realtime insert can race the initial fetch.
          setEvents((prev) => (prev.some((e) => e.id === row.id) ? prev : [...prev, row]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_participants', filter: `game_id=eq.${id}` },
        () => {
          void refreshParticipants();
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_participants', filter: `game_id=eq.${id}` },
        () => {
          void refreshParticipants();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, refreshParticipants]);

  // --- Role resolution -------------------------------------------------------------
  const isHost = user != null && game != null && user.id === game.host_id;
  const myParticipant = useMemo(
    () => participants.find((p) => p.user_id === user?.id) ?? null,
    [participants, user],
  );

  const checkedIn = useMemo(() => participants.filter((p) => p.status === 'checked_in'), [participants]);

  const canTimekeep = isHost || (myParticipant?.role === 'timekeeper' && myParticipant.status === 'checked_in');
  const canReferee = isHost || (myParticipant?.role === 'referee' && myParticipant.status === 'checked_in');

  const viewMode: ViewMode = canTimekeep
    ? 'timekeeper'
    : canReferee
      ? 'referee'
      : 'player';
  const viewLabel = isHost
    ? 'Host — full control'
    : viewMode === 'timekeeper'
      ? 'Timekeeper'
      : viewMode === 'referee'
        ? 'Referee'
        : 'Player (read-only)';

  // --- Timer engine ----------------------------------------------------------------
  // `now` is ticked once per second only while the clock is running.
  const timerState = useMemo(() => reduceTimer(events), [events]);
  const running = timerState.runningSince != null;
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!running) {
      setNow(Date.now());
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const elapsedMs = useMemo(() => liveElapsedMs(timerState, now), [timerState, now]);
  const periodMs = game ? game.rules_penalties.half_duration_mins * 60_000 : 0;
  const remainingMs = Math.max(0, periodMs - elapsedMs);

  // --- Score / foul derivation ------------------------------------------------------
  const totalScore = useMemo(() => {
    let sum = 0;
    for (const e of events) {
      if (e.event_type === 'score_change') sum += eventData(e, 'score_change').points;
    }
    return sum;
  }, [events]);

  const pointsByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === 'score_change') {
        const d = eventData(e, 'score_change');
        map.set(d.player_id, (map.get(d.player_id) ?? 0) + d.points);
      }
    }
    return map;
  }, [events]);

  const foulsByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === 'penalty_foul') {
        const d = eventData(e, 'penalty_foul');
        map.set(d.player_id, (map.get(d.player_id) ?? 0) + 1);
      }
    }
    return map;
  }, [events]);

  const nameFor = useCallback(
    (userId: string): string => {
      const p = participants.find((pp) => pp.user_id === userId);
      return p?.profiles?.username ?? 'Player';
    },
    [participants],
  );

  const describeEvent = useCallback(
    (e: GameEventRow): { text: string; tone: 'score' | 'foul' } => {
      if (e.event_type === 'score_change') {
        const d = eventData(e, 'score_change');
        return {
          text: `${nameFor(d.player_id)} scored ${d.points > 0 ? `+${d.points}` : d.points}`,
          tone: 'score',
        };
      }
      const d = eventData(e, 'penalty_foul');
      return { text: `Foul — ${nameFor(d.player_id)} · ${d.penalty_name}`, tone: 'foul' };
    },
    [nameFor],
  );

  const sortedEvents = useMemo(() => sortEvents(events), [events]);
  const feedEvents = useMemo(
    () =>
      sortedEvents
        .filter((e) => e.event_type === 'score_change' || e.event_type === 'penalty_foul')
        .reverse(), // newest first for a live-feed feel
    [sortedEvents],
  );

  // --- Writes -----------------------------------------------------------------------
  const insertEvent = useCallback(
    async function insertEvent<T extends EventType>(type: T, data: EventDataMap[T]): Promise<void> {
      if (!id || !user) {
        throw new Error('Sign in to record live events.');
      }
      const supabase = getSupabase();
      const { error } = await supabase.from('game_events').insert({
        game_id: id,
        created_by: user.id,
        event_type: type,
        event_data: data as unknown as Json,
      });
      if (error) throw new Error(error.message);
    },
    [id, user],
  );

  const runMutation = useCallback(
    async (action: () => Promise<unknown>, successMessage: string): Promise<void> => {
      if (mutating) return;
      setMutating(true);
      setInlineError(null);
      const result = await withErrorNotification(action, notifyError);
      if (!result.error) showToast(successMessage, 'success');
      setMutating(false);
    },
    [mutating, notifyError, showToast],
  );

  const handleTimer = useCallback(
    (kind: 'start' | 'pause' | 'reset' | 'period_end') => {
      // Compute the authoritative elapsed at the instant of the tap, so the pause
      // record reflects the true clock, not the last 1s render tick.
      const elapsed = liveElapsedMs(timerState, Date.now());
      if (kind === 'start') {
        void runMutation(
          () => insertEvent('timer_start', { started_at: new Date().toISOString() }),
          'Timer started',
        );
      } else if (kind === 'pause') {
        void runMutation(() => insertEvent('timer_pause', { elapsed_ms: elapsed }), 'Timer paused');
      } else if (kind === 'reset') {
        void runMutation(() => insertEvent('timer_pause', { elapsed_ms: 0 }), 'Timer reset');
      } else {
        void runMutation(() => insertEvent('timer_pause', { elapsed_ms: elapsed }), 'Period ended');
      }
    },
    [runMutation, insertEvent, timerState],
  );

  const handleScore = useCallback(
    (playerId: string, points: number) => {
      void runMutation(
        () => insertEvent('score_change', { player_id: playerId, points }),
        `+${points} recorded`,
      );
    },
    [runMutation, insertEvent],
  );

  const handleFoul = useCallback(
    (playerId: string, penaltyName: string) => {
      const name = penaltyName.trim() || 'Foul';
      void runMutation(
        () => insertEvent('penalty_foul', { player_id: playerId, penalty_name: name }),
        'Foul recorded',
      );
    },
    [runMutation, insertEvent],
  );

  // --- Render guards ----------------------------------------------------------------
  if (authLoading || (loading && isSupabaseConfigured)) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!configured) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-lg font-bold text-gray-900">PickUp isn&apos;t set up yet</Text>
        <Text className="mt-3 text-center leading-6 text-gray-500">{SUPABASE_CONFIG_ERROR}</Text>
      </View>
    );
  }

  if (!id) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-lg font-bold text-gray-900">Missing game</Text>
        <Text className="mt-3 text-center text-gray-500">
          No game id was provided. Go back to the lobby and open the live hub from there.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-lg font-bold text-gray-900">Couldn&apos;t load the game</Text>
        <Text className="mt-3 text-center leading-6 text-gray-500">{error}</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 items-center justify-center rounded-xl border border-gray-200 px-6 py-3"
        >
          <Text className="text-sm font-semibold text-gray-700">Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!game) {
    return null;
  }

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-5 pb-4 pt-16">
        <Text className="text-2xl font-bold text-gray-900">Live Match Hub</Text>
        <Text className="mt-1 text-sm text-gray-500">
          {game.sport} · {game.court_name}
        </Text>
        <View className="mt-2 flex-row items-center gap-2">
          <View className="rounded-full bg-brand-100 px-3 py-1">
            <Text className="text-xs font-semibold text-brand-700">{viewLabel}</Text>
          </View>
          <View className="rounded-full bg-gray-100 px-3 py-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              {game.status}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Timer */}
        <View className="px-5 pt-5">
          <View className="rounded-2xl bg-gray-900 px-6 py-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Game clock
              </Text>
              <View
                className={`rounded-full px-3 py-1 ${running ? 'bg-emerald-500' : 'bg-gray-700'}`}
              >
                <Text className="text-xs font-semibold text-white">
                  {running ? 'Running' : 'Paused'}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-center text-6xl font-bold tabular-nums text-white">
              {formatClock(elapsedMs)}
            </Text>
            {periodMs > 0 ? (
              <Text className="mt-2 text-center text-sm text-gray-400">
                Period {game.rules_penalties.half_duration_mins} min · Remaining{' '}
                {formatClock(remainingMs)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Scoreboard */}
        <View className="px-5 pt-4">
          <View className="rounded-2xl border border-gray-200 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Scoreboard
            </Text>
            <View className="mt-3 flex-row items-end justify-between">
              <Text className="text-4xl font-bold text-gray-900">{totalScore}</Text>
              <Text className="text-sm text-gray-400">total points</Text>
            </View>

            {checkedIn.length > 0 ? (
              <View className="mt-4 space-y-2">
                {checkedIn.map((p) => {
                  const pts = pointsByPlayer.get(p.user_id) ?? 0;
                  const fouls = foulsByPlayer.get(p.user_id) ?? 0;
                  const limit = game.rules_penalties.fouls_limit;
                  return (
                    <View
                      key={p.id}
                      className="flex-row items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
                    >
                      <Text className="flex-1 text-sm font-semibold text-gray-800">
                        {p.profiles?.username ?? 'Player'}
                      </Text>
                      <Text className="text-sm font-semibold text-brand-600">{pts} pts</Text>
                      <Text className="ml-3 text-sm text-gray-500">
                        {fouls}/{limit > 0 ? limit : '—'} fouls
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text className="mt-3 text-sm text-gray-400">No checked-in players yet.</Text>
            )}
          </View>
        </View>

        {/* Timekeeper controls */}
        {canTimekeep ? (
          <View className="px-5 pt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Timekeeper controls
            </Text>
            <View className="space-y-2">
              <View className="flex-row gap-2">
                <TimeButton
                  label="Start"
                  tone="start"
                  disabled={running || mutating}
                  onPress={() => handleTimer('start')}
                />
                <TimeButton
                  label="Pause"
                  tone="pause"
                  disabled={!running || mutating}
                  onPress={() => handleTimer('pause')}
                />
              </View>
              <View className="flex-row gap-2">
                <TimeButton
                  label="Reset"
                  tone="reset"
                  disabled={mutating}
                  onPress={() => handleTimer('reset')}
                />
                <TimeButton
                  label="Period End"
                  tone="period"
                  disabled={mutating}
                  onPress={() => handleTimer('period_end')}
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* Referee controls */}
        {canReferee ? (
          <View className="px-5 pt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Referee controls
            </Text>
            {checkedIn.length === 0 ? (
              <View className="rounded-2xl border border-dashed border-gray-200 py-6">
                <Text className="text-center text-gray-400">No checked-in players to officiate.</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {checkedIn.map((p) => (
                  <View key={p.id} className="rounded-2xl border border-gray-200 p-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-gray-900">
                        {p.profiles?.username ?? 'Player'}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {pointsByPlayer.get(p.user_id) ?? 0} pts
                      </Text>
                    </View>
                    <View className="mt-2 flex-row gap-2">
                      {[1, 2, 3].map((n) => (
                        <Pressable
                          key={n}
                          onPress={() => handleScore(p.user_id, n)}
                          disabled={mutating}
                          className={`flex-1 items-center justify-center rounded-lg py-2 ${
                            mutating ? 'bg-gray-200' : 'bg-brand-500'
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              mutating ? 'text-gray-400' : 'text-white'
                            }`}
                          >
                            +{n}
                          </Text>
                        </Pressable>
                      ))}
                      <Pressable
                        onPress={() => setFoulDraft({ playerId: p.user_id, penaltyName: '' })}
                        disabled={mutating}
                        className={`flex-1 items-center justify-center rounded-lg py-2 ${
                          mutating ? 'bg-gray-200' : 'bg-red-500'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            mutating ? 'text-gray-400' : 'text-white'
                          }`}
                        >
                          Foul
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Inline foul picker */}
            {foulDraft ? (
              <View className="mt-3 rounded-xl bg-red-50 p-3">
                <Text className="text-sm font-semibold text-red-700">
                  Log foul — {nameFor(foulDraft.playerId)}
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-1.5">
                  {FOUL_PRESETS.map((preset) => {
                    const selected = foulDraft.penaltyName === preset;
                    return (
                      <Pressable
                        key={preset}
                        onPress={() => setFoulDraft({ ...foulDraft, penaltyName: preset })}
                        className={`rounded-full px-2.5 py-1 ${selected ? 'bg-red-500' : 'bg-red-100'}`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            selected ? 'text-white' : 'text-red-700'
                          }`}
                        >
                          {preset}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={foulDraft.penaltyName}
                  onChangeText={(text) => setFoulDraft({ ...foulDraft, penaltyName: text })}
                  placeholder="Or type an infraction"
                  placeholderTextColor="#9ca3af"
                  className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
                <View className="mt-2 flex-row gap-2">
                  <Pressable
                    onPress={() => {
                      handleFoul(foulDraft.playerId, foulDraft.penaltyName);
                      setFoulDraft(null);
                    }}
                    disabled={mutating}
                    className={`flex-1 items-center justify-center rounded-lg py-2 ${
                      mutating ? 'bg-gray-200' : 'bg-red-500'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        mutating ? 'text-gray-400' : 'text-white'
                      }`}
                    >
                      Record foul
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFoulDraft(null)}
                    className="flex-1 items-center justify-center rounded-lg border border-gray-200 py-2"
                  >
                    <Text className="text-sm font-semibold text-gray-600">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Rules checklist */}
        <View className="px-5 pt-4">
          <View className="rounded-2xl border border-gray-200 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Rules
            </Text>
            <Text className="mt-2 text-sm leading-5 text-gray-700">{game.rules_text}</Text>
            <View className="mt-3 space-y-1.5">
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Fouls limit</Text>
                <Text className="text-sm font-semibold text-gray-800">
                  {game.rules_penalties.fouls_limit}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Penalty type</Text>
                <Text className="text-sm font-semibold text-gray-800">
                  {game.rules_penalties.penalty_type}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Period length</Text>
                <Text className="text-sm font-semibold text-gray-800">
                  {game.rules_penalties.half_duration_mins} min
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Live feed */}
        <View className="px-5 pt-4">
          <View className="rounded-2xl border border-gray-200 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Live feed
            </Text>
            {feedEvents.length === 0 ? (
              <Text className="mt-3 text-sm text-gray-400">No scoring or foul events yet.</Text>
            ) : (
              <View className="mt-3 space-y-2">
                {feedEvents.map((e) => {
                  const line = describeEvent(e);
                  return (
                    <View key={e.id} className="flex-row items-start gap-2">
                      <Text className="text-xs tabular-nums text-gray-400">
                        {formatClockTime(e.created_at)}
                      </Text>
                      <Text
                        className={`flex-1 text-sm ${
                          line.tone === 'score' ? 'text-gray-800' : 'text-red-600'
                        }`}
                      >
                        {line.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="border-t border-gray-100 p-5">
        <Pressable
          onPress={() => router.back()}
          className="items-center justify-center rounded-xl border border-gray-200 py-3"
        >
          <Text className="text-sm font-semibold text-gray-700">Back to Lobby</Text>
        </Pressable>
      </View>

      {/* Inline error banner */}
      {inlineError ? (
        <View className="absolute bottom-24 left-5 right-5 rounded-xl bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-600">{inlineError}</Text>
        </View>
      ) : null}

      {/* Toast */}
      {toast ? (
        <View
          className={`absolute left-5 right-5 top-16 rounded-xl px-4 py-3 shadow-sm ${
            toast.tone === 'success' ? 'bg-emerald-50' : 'bg-red-50'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              toast.tone === 'success' ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {toast.message}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
