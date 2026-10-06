import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import Button from '@/components/Button';
import GameCard from '@/components/GameCard';
import GameFilters, {
  DISTANCE_OPTIONS,
  type DistanceFilterOption,
} from '@/components/GameFilters';
import GameMap from '@/components/GameMap';
import Wordmark from '@/components/Wordmark';
import { withErrorNotification } from '@/lib/async-mutation';
import { useAuth } from '@/lib/auth-context';
import {
  DEFAULT_USER_LOCATION,
  haversineDistanceMeters,
  resolveUserLocation,
  type Coordinate,
} from '@/lib/geo';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Game, ParticipantRole, RolesRequired, RulesPenalties } from '@/types/domain';

/** A participant row in 'invited' joined with its game summary. */
interface Invitation {
  id: string;
  game_id: string;
  role: ParticipantRole;
  host_invited: boolean;
  games: { sport: string; court_name: string; scheduled_at: string } | null;
}

/** Hermes-safe compact date formatter for invitations. */
function formatInviteWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hour12 = date.getHours() % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${date.getMonth() + 1}/${date.getDate()} · ${hour12}:${minutes} ${ampm}`;
}

export default function MatchFinderScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invitations this user has received (status = 'invited').
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [resolvingInviteId, setResolvingInviteId] = useState<string | null>(null);

  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<DistanceFilterOption>(
    DISTANCE_OPTIONS[0],
  );

  const [userLocation, setUserLocation] = useState<Coordinate>(DEFAULT_USER_LOCATION);
  // Whether `userLocation` is a real device fix (false when we only have the fallback mock).
  const [hasRealLocation, setHasRealLocation] = useState(false);

  // Resolve device geolocation once; fall back to a fixed coordinate when the
  // environment can't provide it (native without expo-location, denial, timeout).
  useEffect(() => {
    let active = true;
    resolveUserLocation().then(({ coordinate, isFallback }) => {
      if (!active) return;
      setUserLocation(coordinate);
      setHasRealLocation(!isFallback);
    });
    return () => {
      active = false;
    };
  }, []);

  const loadGames = useCallback(async (): Promise<Game[]> => {
    // Throws SupabaseConfigurationError when secrets are missing — callers
    // (withErrorNotification) turn that into a graceful message.
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .in('status', ['scheduling', 'lobby'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });
    if (error) throw new Error(error.message);
    // Narrow the JSONB columns into their typed shapes.
    return (data ?? []).map((row) => ({
      ...row,
      rules_penalties: row.rules_penalties as unknown as RulesPenalties,
      roles_required: row.roles_required as unknown as RolesRequired,
    }));
  }, []);

  // Initial fetch — errors surface as an inline, graceful empty state.
  useEffect(() => {
    let active = true;
    (async () => {
      const result = await withErrorNotification(loadGames, (message) => {
        if (active) setError(message);
      });
      if (!active) return;
      setGames(result.data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadGames]);

  // Realtime subscription so newly added games appear without a refresh. Skip
  // (rather than throw) when Supabase is not configured.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel('public:games:match-finder')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'games' },
        (payload) => {
          const row = payload.new as Game;
          const isListable = row.status === 'scheduling' || row.status === 'lobby';
          const isUpcoming = new Date(row.scheduled_at).getTime() >= Date.now();
          if (!isListable || !isUpcoming) return;

          setGames((prev) => {
            if (prev.some((g) => g.id === row.id)) return prev;
            const next = [...prev, row];
            next.sort(
              (a, b) =>
                new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
            );
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // --- Invitations (status = 'invited' for the current user) ----------------------
  const fetchInvitations = useCallback(async (): Promise<Invitation[]> => {
    if (!user) return [];
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('game_participants')
      .select('id, game_id, role, host_invited, games(sport, court_name, scheduled_at)')
      .eq('user_id', user.id)
      .eq('status', 'invited')
      .order('joined_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Invitation[];
  }, [user]);

  // Load invitations once, then keep them in sync via realtime (new invites and
  // approvals/declines made elsewhere both refresh the list).
  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setInvitations([]);
      return;
    }
    let active = true;
    fetchInvitations()
      .then((rows) => {
        if (active) setInvitations(rows);
      })
      .catch(() => {
        if (active) setInviteError('Could not load invitations.');
      });

    const supabase = getSupabase();
    const refresh = () => {
      void fetchInvitations()
        .then((rows) => {
          if (active) setInvitations(rows);
        })
        .catch(() => {
          /* best-effort refresh */
        });
    };
    const channel = supabase
      .channel(`dashboard:invitations:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_participants', filter: `user_id=eq.${user.id}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_participants', filter: `user_id=eq.${user.id}` },
        refresh,
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user, fetchInvitations]);

  const handleResolveInvitation = useCallback(
    async (invitationId: string, status: 'accepted' | 'declined') => {
      if (!user || resolvingInviteId) return;
      setResolvingInviteId(invitationId);
      setInviteError(null);
      try {
        const supabase = getSupabase();
        const { error } = await supabase
          .from('game_participants')
          .update({ status })
          .eq('id', invitationId)
          .eq('user_id', user.id);
        if (error) throw new Error(error.message);
        // Optimistically drop the row; the realtime refresh reconciles the rest.
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      } catch (err) {
        setInviteError(
          err instanceof Error && err.message.trim() ? err.message : 'Could not respond to invite.',
        );
      } finally {
        setResolvingInviteId(null);
      }
    },
    [user, resolvingInviteId],
  );

  // Distinct sport values, derived from the listed games only.
  const sports = useMemo(() => {
    const distinct = new Set<string>();
    for (const game of games) distinct.add(game.sport);
    return Array.from(distinct).sort();
  }, [games]);

  // Attach a haversine distance to every game relative to the user's location.
  const gamesWithDistance = useMemo(() => {
    return games.map((game) => ({
      game,
      distanceMeters: haversineDistanceMeters(userLocation, {
        latitude: game.latitude,
        longitude: game.longitude,
      }),
    }));
  }, [games, userLocation]);

  const visibleGames = useMemo(() => {
    let list = gamesWithDistance.filter(({ game }) =>
      selectedSport ? game.sport === selectedSport : true,
    );

    if (selectedDistance.maxMeters != null) {
      list = list.filter(({ distanceMeters }) => distanceMeters <= selectedDistance.maxMeters!);
    }

    // Nearest-first when we have a real device location (a distance radius also
    // implies nearest-first). Without a real fix, keep the server order
    // (scheduled_at ascending) so the list stays stable instead of sorting
    // against the fallback mock coordinate.
    if (hasRealLocation) {
      list = [...list].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    return list;
  }, [gamesWithDistance, selectedSport, selectedDistance, hasRealLocation]);

  return (
    <View className="flex-1 bg-brand-50">
      <View className="border-b border-muted-border bg-brand-50 px-5 pb-4 pt-16">
        <Wordmark tone="light" className="text-title" />
        <Text className="mt-2 font-sans text-body text-brand-600">
          Discover pickup games near you.
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Invitations */}
        {invitations.length > 0 ? (
          <View className="px-5 pt-4">
            <Text className="mb-2 font-sans-600 text-label text-brand-600">
              Your invitations ({invitations.length})
            </Text>
            <View className="space-y-2">
              {invitations.map((invitation) => (
                <View key={invitation.id} className="rounded-2xl border border-muted-border bg-white p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="font-sans-600 text-label text-muted-ink">
                        {invitation.games?.sport ?? 'Game'}
                        {invitation.games?.court_name ? ` · ${invitation.games.court_name}` : ''}
                      </Text>
                      <Text className="mt-0.5 font-sans text-caption text-muted">
                        {invitation.games?.scheduled_at
                          ? formatInviteWhen(invitation.games.scheduled_at)
                          : ''}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-2.5 py-1 ${
                        invitation.host_invited ? 'bg-brand-50' : 'bg-warning-soft'
                      }`}
                    >
                      <Text
                        className={`font-sans-600 text-caption ${
                          invitation.host_invited ? 'text-brand-700' : 'text-warning-strong'
                        }`}
                      >
                        {invitation.host_invited ? 'Invited to play' : 'Awaiting approval'}
                      </Text>
                    </View>
                  </View>

                  {invitation.host_invited ? (
                    <View className="mt-3 flex-row gap-2">
                      <Button
                        label="Decline"
                        onPress={() => handleResolveInvitation(invitation.id, 'declined')}
                        disabled={resolvingInviteId === invitation.id}
                        variant="secondary"
                        className="flex-1"
                      />
                      <Button
                        label="Accept"
                        onPress={() => handleResolveInvitation(invitation.id, 'accepted')}
                        loading={resolvingInviteId === invitation.id}
                        variant="primary"
                        className="flex-1"
                      />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
            {inviteError ? (
              <Text className="mt-2 font-sans text-caption text-danger-strong">{inviteError}</Text>
            ) : null}
          </View>
        ) : null}

        <View className="px-5 pt-4">
          <GameMap games={games} userLocation={userLocation} hasRealLocation={hasRealLocation} />
        </View>

        <GameFilters
          sports={sports}
          selectedSport={selectedSport}
          onSelectSport={setSelectedSport}
          selectedSkillLevel={selectedSkillLevel}
          onSelectSkillLevel={setSelectedSkillLevel}
          selectedDistance={selectedDistance}
          onSelectDistance={setSelectedDistance}
        />

        <View className="mt-6 px-5">
          <Text className="mb-3 font-sans-600 text-label text-brand-600">
            Games near you ({visibleGames.length})
          </Text>

          {loading ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator color="#46514B" />
            </View>
          ) : error ? (
            <View className="items-center justify-center rounded-2xl border border-dashed border-muted-border bg-brand-50 px-6 py-10">
              <Text className="text-center font-sans-500 text-label text-brand-700">{error}</Text>
              <Text className="mt-2 text-center font-sans text-caption text-brand-600">
                Games will appear here once things are connected.
              </Text>
            </View>
          ) : visibleGames.length === 0 ? (
            <View className="items-center justify-center rounded-2xl border border-dashed border-muted-border bg-brand-50 py-10">
              <Text className="font-sans-500 text-label text-brand-600">
                No games match your filters.
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {visibleGames.map(({ game, distanceMeters }) => (
                <GameCard key={game.id} game={game} distanceMeters={distanceMeters} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View className="space-y-2 border-t border-muted-border bg-brand-50 p-5">
        <Button
          label="Create a game"
          onPress={() => router.push('/create-game')}
          variant="primary"
        />
        <View className="flex-row gap-2">
          <Button
            label="Game Lobby"
            onPress={() => router.push('/game-lobby')}
            variant="secondary"
            className="flex-1"
          />
          <Button
            label="Live Match"
            onPress={() => router.push('/live-match')}
            variant="secondary"
            className="flex-1"
          />
        </View>
        <Button label="Sign out" onPress={signOut} variant="ghost" />
      </View>
    </View>
  );
}
