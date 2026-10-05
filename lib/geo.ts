/**
 * Geolocation helpers for the Match Finder. Pure math (haversine) plus a
 * best-effort device geolocation resolver that gracefully falls back to a
 * fixed coordinate when the host environment cannot provide a real location.
 *
 * Native devices (iOS/Android) get real geolocation via `expo-location`; the
 * web build (Expo web) uses the browser `navigator.geolocation` API. When a
 * real fix is unavailable — permission denied, timeout, or unsupported
 * environment — the resolver returns {@link DEFAULT_USER_LOCATION} with
 * `isFallback: true` so callers can degrade gracefully instead of crashing.
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Fixed fallback coordinate used when device geolocation is unavailable or
 * denied. This is a mock user location, not a real user's position.
 */
export const DEFAULT_USER_LOCATION: Coordinate = {
  latitude: 40.7128,
  longitude: -74.006,
};

const EARTH_RADIUS_M = 6_371_000;

/** How long to wait for a native location fix before falling back to the mock. */
const NATIVE_LOCATION_TIMEOUT_MS = 10_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle (haversine) distance between two coordinates, in meters. */
export function haversineDistanceMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

interface GeolocationLike {
  getCurrentPosition: (
    success: (position: { coords: { latitude: number; longitude: number } }) => void,
    error: () => void,
    options?: { timeout?: number; maximumAge?: number },
  ) => void;
}

/** Result of resolving the user's location, including whether it was a real fix. */
export interface LocationResolution {
  coordinate: Coordinate;
  /** True when no real device fix was available and we fell back to the mock. */
  isFallback: boolean;
}

/**
 * Rejects `promise` if it does not settle within `ms` milliseconds. Guards
 * against `expo-location`'s `getCurrentPositionAsync` (which has no timeout
 * option) hanging on a cold GPS fix.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Location request timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const FALLBACK_RESOLUTION: LocationResolution = {
  coordinate: DEFAULT_USER_LOCATION,
  isFallback: true,
};

/** Browser path (Expo web): `navigator.geolocation`, if present. */
function resolveFromGeolocationLike(): Promise<LocationResolution> {
  const scope = globalThis as unknown as {
    navigator?: { geolocation?: GeolocationLike };
  };
  const geolocation = scope.navigator?.geolocation;

  if (!geolocation) {
    return Promise.resolve(FALLBACK_RESOLUTION);
  }

  return new Promise<LocationResolution>((resolve) => {
    geolocation.getCurrentPosition(
      (position) =>
        resolve({
          coordinate: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          isFallback: false,
        }),
      () => resolve(FALLBACK_RESOLUTION),
      { timeout: 5_000, maximumAge: 300_000 },
    );
  });
}

/** Native path (iOS/Android): `expo-location` foreground fix. */
async function resolveFromExpoLocation(): Promise<LocationResolution> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return FALLBACK_RESOLUTION;
    }

    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      NATIVE_LOCATION_TIMEOUT_MS,
    );

    return {
      coordinate: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      isFallback: false,
    };
  } catch {
    // Permission denial, timeout, missing provider, etc. — degrade to the mock.
    return FALLBACK_RESOLUTION;
  }
}

/**
 * Resolves the user's location via the native `expo-location` API on iOS/Android
 * and via `navigator.geolocation` on Expo web. Falls back to
 * {@link DEFAULT_USER_LOCATION} on denial, timeout, or unsupported environments.
 */
export async function resolveUserLocation(): Promise<LocationResolution> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return resolveFromExpoLocation();
  }
  return resolveFromGeolocationLike();
}

/**
 * Thin wrapper over {@link resolveUserLocation} returning only the coordinate
 * (dropping the `isFallback` flag). Used by callers that just need a location
 * and treat any coordinate — real or mock — the same way.
 */
export async function getUserLocation(): Promise<Coordinate> {
  return (await resolveUserLocation()).coordinate;
}
