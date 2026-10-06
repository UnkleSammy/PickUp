import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { Game } from '@/types/domain';

interface GameCardProps {
  game: Game;
  /** Distance from the user's location in meters, when known. */
  distanceMeters?: number;
}

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

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function GameCard({ game, distanceMeters }: GameCardProps) {
  const router = useRouter();

  const statusLabel = game.status === 'lobby' ? 'Open' : 'Scheduling';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/game-lobby', params: { id: game.id } })}
      className="rounded-2xl border border-muted-border bg-white p-4"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-600 text-subheading text-muted-ink">{game.sport}</Text>
        {distanceMeters != null ? (
          <Text className="font-sans-500 text-caption text-muted">
            {formatDistance(distanceMeters)} away
          </Text>
        ) : null}
      </View>

      <Text className="mt-1 font-sans-500 text-label text-brand-600">{game.court_name}</Text>
      <Text className="mt-0.5 font-sans text-caption text-muted">
        {formatWhen(game.scheduled_at)}
      </Text>

      <View className="mt-3 flex-row items-center justify-between">
        <View className="rounded-full bg-brand-100 px-3 py-1">
          <Text className="font-sans-500 text-caption text-brand-700">{statusLabel}</Text>
        </View>
        <Text className="font-sans-600 text-caption text-brand-600">View roster ›</Text>
      </View>
    </Pressable>
  );
}
