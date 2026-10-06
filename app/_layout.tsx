import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';

import {
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { AuthProvider } from '@/lib/auth-context';

export default function RootLayout() {
  // Load the Street Court type system up front so no screen ever flashes the
  // system font. Each weight is a distinct font family (see tailwind.config.js).
  const [fontsLoaded, fontError] = useFonts({
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Blank on-brand loading state until the fonts resolve (or fail — in which case
  // we fall through and render with the system font rather than hang forever).
  if (!fontsLoaded && !fontError) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-900">
        <ActivityIndicator size="large" color="#C9F24B" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F3F5F3' } }}
      />
    </AuthProvider>
  );
}
