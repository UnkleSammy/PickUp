import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Callout, Marker } from 'react-native-maps';

import type { Coordinate } from '@/lib/geo';
import type { Game } from '@/types/domain';

interface GameMapProps {
  games: Game[];
  userLocation: Coordinate;
  /** When true, `userLocation` is a real device fix (not the fallback mock). */
  hasRealLocation: boolean;
}

/**
 * Google Maps on Android requires an API key (injected into the native manifest
 * via `android.config.googleMaps.apiKey`). Until that secret is provisioned we
 * only render the native map on iOS (Apple Maps — no key) and on Android when a
 * key is present. Everywhere else (web, Android without a key) the dashboard
 * list is the primary surface and we render this fallback panel instead.
 *
 * TODO(map-android): add a `GOOGLE_MAPS_API_KEY` secret and wire it through
 * `app.json` (`android.config.googleMaps.apiKey`) to enable Google Maps on
 * Android; then this guard can simply become `Platform.OS !== 'web'`.
 */
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 200,
  },
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  pinText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  callout: {
    width: 180,
    paddingVertical: 2,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});

/** Opens the lobby for a game, matching GameCard's tap behaviour. */
function useOpenLobby() {
  const router = useRouter();
  return (gameId: string) => {
    router.push({ pathname: '/game-lobby', params: { id: gameId } });
  };
}

/**
 * Real map of the listed games. Renders a sport-initial pin for each game with
 * a styled callout (court name + sport), and (when a real location is known) a
 * "you are here" dot. Tapping a pin opens that game's lobby.
 */
export default function GameMap({ games, userLocation, hasRealLocation }: GameMapProps) {
  const openLobby = useOpenLobby();

  const canRenderMap =
    Platform.OS === 'ios' || (Platform.OS === 'android' && Boolean(GOOGLE_MAPS_API_KEY));

  // Fit all plotted points; only include the user location when it is a real
  // fix (the fallback mock coordinate should not drag the map to a fake area).
  const region = useMemo(() => {
    const points: Coordinate[] = [];
    if (hasRealLocation) points.push(userLocation);
    for (const game of games) points.push({ latitude: game.latitude, longitude: game.longitude });

    if (points.length === 0) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.02) * 1.6 + 0.02,
      longitudeDelta: Math.max(maxLng - minLng, 0.02) * 1.6 + 0.02,
    };
  }, [games, userLocation, hasRealLocation]);

  if (!canRenderMap) {
    return (
      <View className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Map</Text>
          <Text className="text-[10px] text-gray-400">
            {Platform.OS === 'android' ? 'Map needs Google Maps key' : 'Map available on device'}
          </Text>
        </View>
        <View className="mx-3 mb-3 h-44 items-center justify-center rounded-xl bg-gray-100">
          <Text className="px-4 text-center text-xs text-gray-400">
            {games.length === 0
              ? 'No games plotted yet'
              : `${games.length} game${games.length === 1 ? '' : 's'} near you — see the list below`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Map</Text>
        <Text className="text-[10px] text-gray-400">
          {games.length} game{games.length === 1 ? '' : 's'} plotted
        </Text>
      </View>

      <MapView style={styles.map} region={region} showsCompass={false}>
        {hasRealLocation ? (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userDot} />
          </Marker>
        ) : null}

        {games.map((game) => (
          <Marker
            key={game.id}
            coordinate={{ latitude: game.latitude, longitude: game.longitude }}
            onPress={() => openLobby(game.id)}
          >
            <View style={styles.pin}>
              <Text style={styles.pinText}>{game.sport.charAt(0).toUpperCase()}</Text>
            </View>
            <Callout onPress={() => openLobby(game.id)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{game.court_name}</Text>
                <Text style={styles.calloutSubtitle}>{game.sport}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
