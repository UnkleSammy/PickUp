import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

export default function MatchFinderScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-5 pb-4 pt-16">
        <Text className="text-2xl font-bold text-gray-900">Match Finder</Text>
        <Text className="mt-1 text-sm text-gray-500">Discover pickup games near you.</Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        {/* Mock map container — swap in Google Maps / Mapbox later. */}
        <View className="h-48 items-center justify-center rounded-2xl bg-indigo-50">
          <Text className="text-sm font-medium text-indigo-400">Mock map container</Text>
          <Text className="mt-1 text-xs text-indigo-300">dummy coordinates</Text>
        </View>

        <Text className="mb-3 mt-6 text-sm font-semibold text-gray-400">
          Games near you (coming soon)
        </Text>
        <View className="items-center justify-center rounded-2xl border border-dashed border-gray-200 py-10">
          <Text className="text-gray-400">No games yet.</Text>
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
