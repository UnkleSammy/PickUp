import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function CreateGameScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-5 pb-4 pt-16">
        <Text className="text-2xl font-bold text-gray-900">Create a Game</Text>
        <Text className="mt-1 text-sm text-gray-500">Sport, rules, roles, location, time.</Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Step 1 — Sport</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {['Basketball', 'Soccer', 'Volleyball', 'Football', 'Tennis'].map((sport) => (
            <View key={sport} className="rounded-full bg-gray-100 px-4 py-2">
              <Text className="text-sm text-gray-700">{sport}</Text>
            </View>
          ))}
        </View>

        <Text className="mt-8 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Steps 2–4 — rules, roles, location
        </Text>
        <View className="mt-3 items-center justify-center rounded-2xl border border-dashed border-gray-200 py-10">
          <Text className="text-gray-400">Wizard placeholder — coming soon.</Text>
        </View>
      </ScrollView>

      <View className="border-t border-gray-100 p-5">
        <Pressable
          onPress={() => router.back()}
          className="items-center justify-center rounded-xl border border-gray-200 py-3"
        >
          <Text className="text-sm font-semibold text-gray-700">Back</Text>
        </Pressable>
      </View>
    </View>
  );
}
