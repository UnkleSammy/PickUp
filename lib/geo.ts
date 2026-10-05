/**
 * Geolocation helpers for the Match Finder. Pure math (haversine) plus a
 * best-effort device geolocation resolver that gracefully falls back to a
 * fixed coordinate when the host environment cannot provide a real location.
 *
 * Native devices will get real geolocation via `expo-location` in a later
 * slice; the resolver below already uses the web `navigator.geolocation` API
 * when it is present (Expo web), so the fallback is the only thing wired for
 * native right now.
 */

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

function resolveFromGeolocationLike(): Promise<LocationResolution> {
  const scope = globalThis as unknown as {
    navigator?: { geolocation?: GeolocationLike };
  };
  const geolocation = scope.navigator?.geolocation;

  if (!geolocation) {
    return Promise.resolve({ coordinate: DEFAULT_USER_LOCATION, isFallback: true });
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
      () => resolve({ coordinate: DEFAULT_USER_LOCATION, isFallback: true }),
      { timeout: 5_000, maximumAge: 300_000 },
    );
  });
}

/**
 * Resolves the user's location when the host environment exposes
 * `navigator.geolocation` (Expo web). Falls back to {@link DEFAULT_USER_LOCATION}
 * on denial, timeout, or unsupported environments (native without expo-location).
 */
export async function getUserLocation(): Promise<Coordinate> {
  return (await resolveFromGeolocationLike()).coordinate;
}

/**
 * Like {@link getUserLocation}, but also reports whether the result is the
 * fixed fallback (no real device fix). Used to degrade "nearest first" sorting
 * gracefully when the user hasn't granted, or can't provide, a location.
 */
export async function resolveUserLocation(): Promise<LocationResolution> {
  return resolveFromGeolocationLike();
}
