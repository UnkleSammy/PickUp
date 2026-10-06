import { Pressable, Text, View } from 'react-native';

import type { Coordinate } from '@/lib/geo';

/** A selectable mock court. Real lat/lng so the selection maps onto real coordinates. */
export interface MockCourt extends Coordinate {
  name: string;
}

/**
 * Fixed mock courts near a central demo area (Manhattan / Brooklyn, NY).
 * These stand in for a real geocoder / map POI search until Mapbox or Google
 * Maps is swapped in — see the TODO note at the bottom of this file.
 */
export const MOCK_COURTS: MockCourt[] = [
  { name: 'Riverside Courts', latitude: 40.7801, longitude: -73.9847 },
  { name: 'Central Park North', latitude: 40.7966, longitude: -73.9536 },
  { name: 'East River Park', latitude: 40.7191, longitude: -73.9734 },
  { name: 'Chelsea Piers', latitude: 40.7472, longitude: -74.009 },
  { name: 'McCarren Park', latitude: 40.7196, longitude: -73.9496 },
  { name: 'Prospect Park', latitude: 40.6602, longitude: -73.969 },
];

interface GameMapPickerProps {
  selected: Coordinate | null;
  onSelect: (court: MockCourt) => void;
}

interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const BOUNDS: Bounds = MOCK_COURTS.reduce<Bounds>(
  (acc, court) => ({
    minLat: Math.min(acc.minLat, court.latitude),
    maxLat: Math.max(acc.maxLat, court.latitude),
    minLng: Math.min(acc.minLng, court.longitude),
    maxLng: Math.max(acc.maxLng, court.longitude),
  }),
  {
    minLat: Number.POSITIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
    minLng: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
  },
);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Projects a coordinate into percentage space within the picker bounds. */
function project(coord: Coordinate): { x: number; y: number } {
  const lngSpan = BOUNDS.maxLng - BOUNDS.minLng || 1;
  const latSpan = BOUNDS.maxLat - BOUNDS.minLat || 1;
  return {
    x: clamp(((coord.longitude - BOUNDS.minLng) / lngSpan) * 100, 8, 92),
    y: clamp(((BOUNDS.maxLat - coord.latitude) / latSpan) * 100, 10, 86),
  };
}

/**
 * Selectable mock map for the game creation wizard. Tapping a court marker
 * sets the game's latitude/longitude (and the marker's name is surfaced so the
 * host can reuse it as the court name). This is the single swap-in point for a
 * real Mapbox / Google Maps picker later.
 */
export default function GameMapPicker({ selected, onSelect }: GameMapPickerProps) {
  return (
    <View className="overflow-hidden rounded-2xl border border-muted-border bg-brand-50">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="font-sans-600 text-caption uppercase tracking-wide text-brand-600">
          Choose a court
        </Text>
        <Text className="font-sans-500 text-caption text-muted">mock — tap a marker</Text>
      </View>

      <View className="relative mx-3 mb-3 h-48 overflow-hidden rounded-xl bg-muted-soft">
        {/* Grid lines */}
        {[25, 50, 75].map((pct) => (
          <View
            key={`v${pct}`}
            className="absolute bottom-0 top-0 w-px bg-muted-border"
            style={{ left: `${pct}%` }}
          />
        ))}
        {[33, 66].map((pct) => (
          <View
            key={`h${pct}`}
            className="absolute left-0 right-0 h-px bg-muted-border"
            style={{ top: `${pct}%` }}
          />
        ))}

        {/* Court markers */}
        {MOCK_COURTS.map((court) => {
          const pos = project(court);
          const isSelected =
            selected != null &&
            selected.latitude === court.latitude &&
            selected.longitude === court.longitude;

          return (
            <Pressable
              key={court.name}
              onPress={() => onSelect(court)}
              className="absolute items-center"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              hitSlop={12}
            >
              <View
                className={`h-4 w-4 rounded-full border-2 border-white ${
                  isSelected ? 'bg-brand-500' : 'bg-brand-600'
                }`}
              />
              <Text
                className={`mt-0.5 font-sans-600 text-micro ${
                  isSelected ? 'text-brand-700' : 'text-muted'
                }`}
              >
                {court.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="px-4 pb-3">
        {selected ? (
          <Text className="font-sans-500 text-caption text-brand-600">
            Selected: {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
          </Text>
        ) : (
          <Text className="font-sans-500 text-caption text-muted">
            Tap a court to set the location.
          </Text>
        )}
      </View>
    </View>
  );
}

/*
 * TODO(map): replace this mock picker with a real Mapbox / Google Maps control
 * (tap-to-drop or POI search) once a provider key is provisioned. The interface
 * (selected Coordinate + onSelect) is deliberately provider-agnostic.
 */
