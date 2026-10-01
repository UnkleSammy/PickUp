import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function GameLobbyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-5 pb-4 pt-16">
        <Text className="text-2xl font-bold text-gray-900">Game Lobby &amp; Roster</Text>
        <Text className="mt-1 text-sm text-gray-500">Roster, role assignment, check-in.</Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Participants</Text>
        <View className="mt-3 items-center justify-center rounded-2xl border border-dashed border-gray-200 py-10">
          <Text className="text-gray-400">
            {id ? `Roster for game ${id} — coming soon.` : 'Roster placeholder — coming soon.'}
          </Text>
        </View>
      </ScrollView>

      <View className="flex-row space-x-2 border-t border-gray-100 p-5">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 items-center justify-center rounded-xl border border-gray-200 py-3"
        >
          <Text className="text-sm font-semibold text-gray-700">Back</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/live-match')}
          className="flex-1 items-center justify-center rounded-xl bg-brand-500 py-3"
        >
          <Text className="text-sm font-semibold text-white">Enter Live Hub</Text>
        </Pressable>
      </View>
    </View>
  );
}
