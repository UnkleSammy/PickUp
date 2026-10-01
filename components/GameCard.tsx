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
      className="rounded-2xl border border-gray-200 bg-white p-4"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-gray-900">{game.sport}</Text>
        {distanceMeters != null ? (
          <Text className="text-xs font-medium text-gray-400">
            {formatDistance(distanceMeters)} away
          </Text>
        ) : null}
      </View>

      <Text className="mt-1 text-sm font-semibold text-gray-700">{game.court_name}</Text>
      <Text className="mt-0.5 text-sm text-gray-500">{formatWhen(game.scheduled_at)}</Text>

      <View className="mt-3 flex-row items-center justify-between">
        <View className="rounded-full bg-gray-100 px-3 py-1">
          <Text className="text-xs font-medium text-gray-600">{statusLabel}</Text>
        </View>
        <Text className="text-xs font-semibold text-brand-600">View roster ›</Text>
      </View>
    </Pressable>
  );
}
