import { Text, View } from 'react-native';

import type { Coordinate } from '@/lib/geo';
import type { Game } from '@/types/domain';

interface GameMapProps {
  games: Game[];
  userLocation: Coordinate;
}

interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Projects a coordinate into percentage space within the mock map bounds. */
function project(coord: Coordinate, bounds: Bounds): { x: number; y: number } {
  const lngSpan = bounds.maxLng - bounds.minLng || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  return {
    x: clamp(((coord.longitude - bounds.minLng) / lngSpan) * 100, 8, 92),
    y: clamp(((bounds.maxLat - coord.latitude) / latSpan) * 100, 10, 86),
  };
}

/**
 * Mock map container. This is the single swap-in point for a real Mapbox /
 * Google Maps component later — replace the body (and `GameMapProps`) here and
 * the dashboard needs no changes. Dummy markers are projected from the listed
 * games' real lat/lng so the placeholder already behaves map-like.
 */
export default function GameMap({ games, userLocation }: GameMapProps) {
  const points: Coordinate[] = [
    userLocation,
    ...games.map((game) => ({ latitude: game.latitude, longitude: game.longitude })),
  ];

  const bounds: Bounds = {
    minLat: Math.min(...points.map((p) => p.latitude)),
    maxLat: Math.max(...points.map((p) => p.latitude)),
    minLng: Math.min(...points.map((p) => p.longitude)),
    maxLng: Math.max(...points.map((p) => p.longitude)),
  };

  const user = project(userLocation, bounds);

  return (
    <View className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
          Map preview
        </Text>
        <Text className="text-[10px] text-indigo-300">mock — swap in Mapbox/Google Maps</Text>
      </View>

      <View className="relative mx-3 mb-3 h-44 overflow-hidden rounded-xl bg-indigo-100">
        {/* Grid lines */}
        {[25, 50, 75].map((pct) => (
          <View
            key={`v${pct}`}
            className="absolute bottom-0 top-0 w-px bg-indigo-200"
            style={{ left: `${pct}%` }}
          />
        ))}
        {[33, 66].map((pct) => (
          <View
            key={`h${pct}`}
            className="absolute left-0 right-0 h-px bg-indigo-200"
            style={{ top: `${pct}%` }}
          />
        ))}

        {/* User location marker */}
        <View className="absolute items-center" style={{ left: `${user.x}%`, top: `${user.y}%` }}>
          <View className="h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
          <Text className="mt-0.5 text-[9px] font-bold text-brand-700">You</Text>
        </View>

        {/* Game markers */}
        {games.map((game) => {
          const pos = project(
            { latitude: game.latitude, longitude: game.longitude },
            bounds,
          );
          return (
            <View
              key={game.id}
              className="absolute items-center"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <View className="h-3 w-3 rounded-full border-2 border-white bg-gray-900" />
              <Text className="mt-0.5 text-[9px] font-semibold text-gray-600">
                {game.sport.charAt(0).toUpperCase()}
              </Text>
            </View>
          );
        })}

        {games.length === 0 ? (
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-xs text-indigo-300">No games plotted yet</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
