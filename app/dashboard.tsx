import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import GameCard from '@/components/GameCard';
import GameFilters, {
  DISTANCE_OPTIONS,
  type DistanceFilterOption,
} from '@/components/GameFilters';
import GameMap from '@/components/GameMap';
import { withErrorNotification } from '@/lib/async-mutation';
import { useAuth } from '@/lib/auth-context';
import {
  DEFAULT_USER_LOCATION,
  getUserLocation,
  haversineDistanceMeters,
  type Coordinate,
} from '@/lib/geo';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Game, RolesRequired, RulesPenalties } from '@/types/domain';

export default function MatchFinderScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<DistanceFilterOption>(
    DISTANCE_OPTIONS[0],
  );

  const [userLocation, setUserLocation] = useState<Coordinate>(DEFAULT_USER_LOCATION);

  // Resolve device geolocation once; fall back to a fixed coordinate when the
  // environment can't provide it (native without expo-location, denial, timeout).
  useEffect(() => {
    let active = true;
    getUserLocation().then((location) => {
      if (active) setUserLocation(location);
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
      // A distance radius implies a nearest-first ordering; otherwise keep
      // scheduled_at ascending (the query order).
      list = [...list].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    return list;
  }, [gamesWithDistance, selectedSport, selectedDistance]);

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-5 pb-4 pt-16">
        <Text className="text-2xl font-bold text-gray-900">Match Finder</Text>
        <Text className="mt-1 text-sm text-gray-500">Discover pickup games near you.</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-5 pt-4">
          <GameMap games={games} userLocation={userLocation} />
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
          <Text className="mb-3 text-sm font-semibold text-gray-400">
            Games near you ({visibleGames.length})
          </Text>

          {loading ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : error ? (
            <View className="items-center justify-center rounded-2xl border border-dashed border-gray-200 px-6 py-10">
              <Text className="text-center font-medium text-gray-500">{error}</Text>
              <Text className="mt-2 text-center text-sm text-gray-400">
                Games will appear here once things are connected.
              </Text>
            </View>
          ) : visibleGames.length === 0 ? (
            <View className="items-center justify-center rounded-2xl border border-dashed border-gray-200 py-10">
              <Text className="text-gray-400">No games match your filters.</Text>
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

      <View className="space-y-2 border-t border-gray-100 p-5">
        <Pressable
          onPress={() => router.push('/create-game')}
          className="items-center justify-center rounded-xl bg-brand-500 py-4"
        >
          <Text className="text-base font-semibold text-white">Create a game</Text>
        </Pressable>
        <View className="flex-row space-x-2">
          <Pressable
            onPress={() => router.push('/game-lobby')}
            className="flex-1 items-center justify-center rounded-xl border border-gray-200 py-3"
          >
            <Text className="text-sm font-semibold text-gray-700">Game Lobby</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/live-match')}
            className="flex-1 items-center justify-center rounded-xl border border-gray-200 py-3"
          >
            <Text className="text-sm font-semibold text-gray-700">Live Match</Text>
          </Pressable>
        </View>
        <Pressable onPress={signOut} className="items-center justify-center py-2">
          <Text className="text-sm font-medium text-gray-400">Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}
