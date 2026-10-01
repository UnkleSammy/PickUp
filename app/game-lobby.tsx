import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { withErrorNotification } from '@/lib/async-mutation';
import { useAuth } from '@/lib/auth-context';
import { toErrorMessage } from '@/lib/errors';
import {
  DEFAULT_USER_LOCATION,
  getUserLocation,
  haversineDistanceMeters,
  type Coordinate,
} from '@/lib/geo';
import { getSupabase, isSupabaseConfigured, SUPABASE_CONFIG_ERROR } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type {
  Game,
  GameParticipantRow,
  GameStatus,
  InviteStatus,
  ParticipantRole,
  RolesRequired,
  RulesPenalties,
} from '@/types/domain';

type GamesRow = Database['public']['Tables']['games']['Row'];

/** A participant row joined with its profile (username + avatar). */
interface Participant extends GameParticipantRow {
  profiles: { username: string; avatar_url: string | null } | null;
}

// --- Status progression the host can drive -----------------------------------------
// MVP flow: scheduling -> lobby -> live. 'completed' / 'cancelled' are set elsewhere
// (or in a later slice); the host has no control for them here.
const NEXT_STATUS: Partial<Record<GameStatus, { next: GameStatus; label: string }>> = {
  scheduling: { next: 'lobby', label: 'Open lobby' },
  lobby: { next: 'live', label: 'Start game (go live)' },
};

const ROLE_OPTIONS: ParticipantRole[] = ['player', 'referee', 'timekeeper'];

const STATUS_LABEL: Record<InviteStatus, string> = {
  invited: 'Invited',
  accepted: 'Joined',
  declined: 'Declined',
  checked_in: 'Checked in',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Hermes-safe date formatter (avoids relying on Intl/`toLocaleString`). */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Date TBD';
  }
  const hour12 = date.getHours() % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()} · ${hour12}:${minutes} ${ampm}`;
}

function roleLabel(role: ParticipantRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function statusLabel(status: InviteStatus): string {
  return STATUS_LABEL[status];
}

function toGame(row: GamesRow): Game {
  return {
    ...row,
    rules_penalties: row.rules_penalties as unknown as RulesPenalties,
    roles_required: row.roles_required as unknown as RolesRequired,
  };
}

function Avatar({ username, url }: { username: string | null; url: string | null }) {
  if (url) {
    return <Image source={{ uri: url }} className="h-10 w-10 rounded-full bg-gray-200" />;
  }
  const initials = (username ?? '?').trim().slice(0, 2).toUpperCase() || '?';
  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100">
      <Text className="text-sm font-bold text-brand-700">{initials}</Text>
    </View>
  );
}

export default function GameLobbyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading, configured } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<Coordinate>(DEFAULT_USER_LOCATION);
  const [now, setNow] = useState<number>(() => Date.now());

  // Mutation busy flags (only one mutation at a time keeps UX predictable).
  const [joining, setJoining] = useState(false);

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

  // Resolve device geolocation once (best-effort; falls back to a fixed coordinate).
  useEffect(() => {
    let active = true;
    getUserLocation().then((location) => {
      if (active) setUserLocation(location);
    });
    return () => {
      active = false;
    };
  }, []);

  // Keep the check-in window fresh without a full subscription — re-render every 30s
  // so `now` (and therefore minutesUntilStart) stays accurate while the screen is open.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Clean up the toast timer on unmount.
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

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

  const refreshParticipants = useCallback(async (): Promise<void> => {
    try {
      const rows = await fetchParticipants();
      setParticipants(rows);
    } catch {
      // Best-effort refresh — the realtime subscription keeps the roster in sync
      // if this fetch races or fails.
    }
  }, [fetchParticipants]);

  const loadGame = useCallback(async (): Promise<Game | null> => {
    if (!id) return null;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      // PGRST116 == "0 rows" from .single()
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    if (!data) return null;
    return toGame(data as GamesRow);
  }, [id]);

  // Initial load — game first (so the header renders), then the roster.
  useEffect(() => {
    if (!id || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const loadedGame = await loadGame();
        if (!active) return;
        if (!loadedGame) {
          setError('Game not found. It may have been cancelled or removed.');
          setLoading(false);
          return;
        }
        setGame(loadedGame);

        const loadedParticipants = await fetchParticipants();
        if (!active) return;
        setParticipants(loadedParticipants);
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
  }, [id, loadGame, fetchParticipants]);

  // Realtime — refresh the roster whenever participants are inserted or updated for
  // this game, and reflect host status changes. Skip (rather than throw) when
  // Supabase is unconfigured.
  useEffect(() => {
    if (!id || !isSupabaseConfigured) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`game-lobby:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_participants', filter: `game_id=eq.${id}` },
        () => {
          void refreshParticipants();
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
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as unknown as GamesRow;
          setGame(toGame(row));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, refreshParticipants]);

  const isHost = user != null && game != null && user.id === game.host_id;
  const currentParticipant = useMemo(
    () => participants.find((p) => p.user_id === user?.id) ?? null,
    [participants, user],
  );

  // --- Check-in eligibility ---------------------------------------------------------
  // Interpretation of the 30-minute window: enabled while
  // -30 <= minutesUntilStart <= 30, i.e. from 30 minutes before the scheduled start
  // until 30 minutes after (late arrivals can still check in during warm-ups).
  const scheduledTime = game ? new Date(game.scheduled_at).getTime() : 0;
  const minutesUntilStart = game ? (scheduledTime - now) / 60_000 : 0;
  const inTimeWindow = minutesUntilStart >= -30 && minutesUntilStart <= 30;

  const distanceMeters = game
    ? haversineDistanceMeters(userLocation, { latitude: game.latitude, longitude: game.longitude })
    : Number.POSITIVE_INFINITY;
  const withinRange = distanceMeters <= 200;

  let checkInDisabledReason: string | null = null;
  if (currentParticipant && currentParticipant.status !== 'checked_in') {
    if (!inTimeWindow) {
      checkInDisabledReason =
        minutesUntilStart > 30 ? 'Check-in opens 30 min before start' : 'Check-in has closed';
    } else if (!withinRange) {
      checkInDisabledReason = 'Move within 200m of the court';
    }
  }
  const canCheckIn =
    currentParticipant != null &&
    currentParticipant.status !== 'checked_in' &&
    checkInDisabledReason === null;

  const isFull = game?.player_limit != null && participants.length >= game.player_limit;
  const canJoin =
    user != null &&
    game != null &&
    !isHost &&
    currentParticipant == null &&
    (game.status === 'scheduling' || game.status === 'lobby');

  // --- Mutations --------------------------------------------------------------------
  const handleJoin = useCallback(async () => {
    if (!id || !user || joining) return;
    setJoining(true);
    setInlineError(null);
    try {
      const result = await withErrorNotification(
        async () => {
          const supabase = getSupabase();
          // Self-service join — no approval gate in this MVP. A participant is
          // inserted straight to 'accepted'; a future invite/approval flow would
          // insert 'invited' instead and let the host accept it.
          const { error } = await supabase.from('game_participants').insert({
            game_id: id,
            user_id: user.id,
            role: 'player',
            status: 'accepted',
          });
          if (error) throw new Error(error.message);
          await refreshParticipants();
        },
        notifyError,
      );
      if (!result.error) showToast('You joined the game', 'success');
    } finally {
      setJoining(false);
    }
  }, [id, user, joining, refreshParticipants, notifyError, showToast]);

  const handleRoleChange = useCallback(
    async (participantId: string, role: ParticipantRole) => {
      if (!id || !isHost) return;
      setInlineError(null);
      const result = await withErrorNotification(
        async () => {
          const supabase = getSupabase();
          const { error } = await supabase
            .from('game_participants')
            .update({ role })
            .eq('id', participantId)
            .eq('game_id', id);
          if (error) throw new Error(error.message);
          await refreshParticipants();
        },
        notifyError,
      );
      if (!result.error) showToast('Role updated', 'success');
    },
    [id, isHost, refreshParticipants, notifyError, showToast],
  );

  const handleAdvanceStatus = useCallback(async () => {
    if (!id || !game) return;
    const step = NEXT_STATUS[game.status];
    if (!step) return;
    setInlineError(null);
    const result = await withErrorNotification(
      async () => {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('games')
          .update({ status: step.next })
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        if (data) setGame(toGame(data as GamesRow));
      },
      notifyError,
    );
    if (!result.error) {
      showToast(step.next === 'live' ? 'Game is live' : 'Lobby opened', 'success');
    }
  }, [id, game, notifyError, showToast]);

  const handleCheckIn = useCallback(async () => {
    if (!id || !user || !currentParticipant || !canCheckIn) return;
    setInlineError(null);
    const result = await withErrorNotification(
      async () => {
        const supabase = getSupabase();
        const { error } = await supabase
          .from('game_participants')
          .update({ status: 'checked_in' })
          .eq('id', currentParticipant.id)
          .eq('user_id', user.id);
        if (error) throw new Error(error.message);
        await refreshParticipants();
      },
      notifyError,
    );
    if (!result.error) showToast('Checked in — see you there!', 'success');
  }, [id, user, currentParticipant, canCheckIn, refreshParticipants, notifyError, showToast]);

  // --- Render -----------------------------------------------------------------------
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
          No game id was provided. Go back to the Match Finder and open a game from there.
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

  const capacityLabel =
    game.player_limit != null
      ? `${participants.length}/${game.player_limit} spots`
      : `${participants.length} joined · no limit`;

  const statusStep = NEXT_STATUS[game.status];

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-5 pb-4 pt-16">
        <Text className="text-2xl font-bold text-gray-900">Game Lobby &amp; Roster</Text>
        <Text className="mt-1 text-sm text-gray-500">Roster, role assignment, check-in.</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Game summary */}
        <View className="px-5 pt-5">
          <View className="rounded-2xl border border-gray-200 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900">{game.sport}</Text>
              <View className="rounded-full bg-gray-100 px-3 py-1">
                <Text className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {game.status}
                </Text>
              </View>
            </View>

            <Text className="mt-1 text-sm font-semibold text-gray-700">{game.court_name}</Text>
            <Text className="mt-0.5 text-sm text-gray-500">{formatWhen(game.scheduled_at)}</Text>

            <View className="mt-3 rounded-xl bg-gray-50 px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Roster
              </Text>
              <Text className="mt-0.5 text-sm font-semibold text-gray-800">{capacityLabel}</Text>
            </View>

            <View className="mt-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Rules
              </Text>
              <Text className="mt-1 text-sm leading-5 text-gray-600">{game.rules_text}</Text>
              <Text className="mt-1 text-sm text-gray-500">
                Fouls limit {game.rules_penalties.fouls_limit} · {game.rules_penalties.penalty_type}{' '}
                · {game.rules_penalties.half_duration_mins}-min halves
              </Text>
            </View>

            {isHost ? (
              <View className="mt-3 rounded-xl bg-brand-50 px-3 py-2">
                <Text className="text-sm font-semibold text-brand-700">You&apos;re the host</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Host controls */}
        {isHost ? (
          <View className="px-5 pt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Host controls
            </Text>
            <View className="rounded-2xl border border-gray-200 p-4">
              {statusStep ? (
                <Pressable
                  onPress={handleAdvanceStatus}
                  className="items-center justify-center rounded-xl bg-brand-500 py-3"
                >
                  <Text className="text-sm font-semibold text-white">{statusStep.label}</Text>
                </Pressable>
              ) : (
                <View className="items-center justify-center rounded-xl bg-gray-100 py-3">
                  <Text className="text-sm font-medium text-gray-500">
                    Game is {game.status} — no further host steps.
                  </Text>
                </View>
              )}
              <Text className="mt-2 text-xs text-gray-400">
                Assign each participant a role below. Roles gate what they can do in the live hub.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Join CTA */}
        {!isHost && currentParticipant == null ? (
          <View className="px-5 pt-4">
            {canJoin ? (
              <Pressable
                onPress={handleJoin}
                disabled={joining || isFull}
                className={`items-center justify-center rounded-xl py-4 ${
                  joining || isFull ? 'bg-gray-200' : 'bg-brand-500'
                }`}
              >
                {joining ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className={`text-base font-semibold ${isFull ? 'text-gray-500' : 'text-white'}`}>
                    {isFull ? 'Game is full' : 'Join game'}
                  </Text>
                )}
              </Pressable>
            ) : (
              <View className="items-center justify-center rounded-xl bg-gray-100 py-4">
                <Text className="text-sm font-medium text-gray-500">
                  {game.status === 'live'
                    ? 'This game is already live.'
                    : 'Joining is closed for this game.'}
                </Text>
              </View>
            )}
            {isFull ? (
              <Text className="mt-2 text-center text-xs text-gray-400">
                All {game.player_limit} spots are taken.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Check-in (current user's own participant row) */}
        {currentParticipant ? (
          <View className="px-5 pt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Your check-in
            </Text>
            <View className="rounded-2xl border border-gray-200 p-4">
              {currentParticipant.status === 'checked_in' ? (
                <View className="items-center justify-center rounded-xl bg-emerald-50 py-3">
                  <Text className="text-sm font-semibold text-emerald-700">✓ Checked in</Text>
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={handleCheckIn}
                    disabled={!canCheckIn}
                    className={`items-center justify-center rounded-xl py-3 ${
                      canCheckIn ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${canCheckIn ? 'text-white' : 'text-gray-500'}`}
                    >
                      Check In
                    </Text>
                  </Pressable>
                  {checkInDisabledReason ? (
                    <Text className="mt-2 text-center text-xs text-gray-500">
                      {checkInDisabledReason}
                    </Text>
                  ) : null}
                  <Text className="mt-2 text-center text-xs text-gray-400">
                    You&apos;re {Math.round(distanceMeters)} m from the court ·{' '}
                    {Math.round(minutesUntilStart)} min to start
                  </Text>
                </>
              )}
            </View>
          </View>
        ) : null}

        {/* Roster */}
        <View className="px-5 pt-5">
          <Text className="mb-3 text-sm font-semibold text-gray-400">
            Participants ({participants.length})
          </Text>

          {participants.length === 0 ? (
            <View className="items-center justify-center rounded-2xl border border-dashed border-gray-200 py-10">
              <Text className="text-gray-400">No one has joined yet.</Text>
            </View>
          ) : (
            <View className="space-y-2">
              {participants.map((participant) => (
                <View
                  key={participant.id}
                  className="flex-row items-center rounded-2xl border border-gray-200 p-3"
                >
                  <Avatar
                    username={participant.profiles?.username ?? null}
                    url={participant.profiles?.avatar_url ?? null}
                  />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-semibold text-gray-900">
                      {participant.profiles?.username ?? 'Player'}
                      {participant.user_id === user?.id ? ' (you)' : ''}
                    </Text>
                    <View className="mt-0.5 flex-row items-center gap-2">
                      <Text className="text-xs text-gray-500">{statusLabel(participant.status)}</Text>
                      <Text className="text-xs text-gray-300">·</Text>
                      <Text className="text-xs font-medium text-brand-600">
                        {roleLabel(participant.role)}
                      </Text>
                    </View>
                  </View>

                  {isHost ? (
                    <View className="flex-row gap-1">
                      {ROLE_OPTIONS.map((role) => {
                        const selected = participant.role === role;
                        return (
                          <Pressable
                            key={role}
                            onPress={() => handleRoleChange(participant.id, role)}
                            className={`rounded-full px-2.5 py-1 ${
                              selected ? 'bg-brand-500' : 'bg-gray-100'
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                selected ? 'text-white' : 'text-gray-600'
                              }`}
                            >
                              {roleLabel(role)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="flex-row gap-2 border-t border-gray-100 p-5">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 items-center justify-center rounded-xl border border-gray-200 py-3"
        >
          <Text className="text-sm font-semibold text-gray-700">Back</Text>
        </Pressable>
        {game.status === 'live' ? (
          <Pressable
            onPress={() => router.push({ pathname: '/live-match', params: { id: game.id } })}
            className="flex-1 items-center justify-center rounded-xl bg-brand-500 py-3"
          >
            <Text className="text-sm font-semibold text-white">Enter Live Match</Text>
          </Pressable>
        ) : null}
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
          <Text className={`text-sm font-medium ${toast.tone === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
            {toast.message}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
