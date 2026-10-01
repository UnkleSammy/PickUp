import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function LiveMatchScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-5 pb-4 pt-16">
        <Text className="text-2xl font-bold text-gray-900">Live Match Hub</Text>
        <Text className="mt-1 text-sm text-gray-500">
          Role-based: player read-only · timekeeper timer · referee scoring.
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        <View className="flex-row items-center justify-between rounded-2xl bg-gray-900 px-6 py-8">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Home</Text>
            <Text className="mt-1 text-4xl font-bold text-white">0</Text>
          </View>
          <Text className="text-lg font-semibold text-gray-500">—</Text>
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Away</Text>
            <Text className="mt-1 text-4xl font-bold text-white">0</Text>
          </View>
        </View>

        <View className="mt-4 items-center justify-center rounded-2xl bg-indigo-50 py-8">
          <Text className="text-3xl font-bold tabular-nums text-gray-900">00:00</Text>
          <Text className="mt-1 text-sm text-gray-500">Timer (read-only placeholder)</Text>
        </View>

        <View className="mt-4 items-center justify-center rounded-2xl border border-dashed border-gray-200 py-8">
          <Text className="text-gray-400">Role controls — coming soon.</Text>
        </View>
      </ScrollView>

      <View className="border-t border-gray-100 p-5">
        <Pressable
          onPress={() => router.back()}
          className="items-center justify-center rounded-xl border border-gray-200 py-3"
        >
          <Text className="text-sm font-semibold text-gray-700">Back to Lobby</Text>
        </Pressable>
      </View>
    </View>
  );
}
