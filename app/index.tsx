import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { withErrorNotification } from '@/lib/async-mutation';
import { useAuth } from '@/lib/auth-context';
import { SUPABASE_CONFIG_ERROR } from '@/lib/supabase';
import { isValidEmail, isValidPassword, isValidUsername } from '@/lib/validation';

type Mode = 'sign-in' | 'sign-up';

export default function AuthScreen() {
  const router = useRouter();
  const { user, loading, configured, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Already-authenticated users land on the Match Finder.
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  const notifyError = useCallback((message: string) => {
    setInlineError(message);
    Alert.alert('Something went wrong', message);
  }, []);

  const validate = useCallback((): string | null => {
    if (!isValidEmail(email)) {
      return 'Enter a valid email address (e.g. name@example.com).';
    }
    if (!isValidPassword(password)) {
      return 'Password must be at least 6 characters.';
    }
    if (mode === 'sign-up' && !isValidUsername(username)) {
      return 'Username must be 3–20 characters using letters, numbers, or underscores only.';
    }
    return null;
  }, [email, password, username, mode]);

  const onSubmit = useCallback(async () => {
    if (submitting) return;
    setInlineError(null);
    setInfoMessage(null);

    const validationError = validate();
    if (validationError) {
      setInlineError(validationError);
      Alert.alert('Check your details', validationError);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await withErrorNotification(
          () => signIn(email.trim(), password),
          notifyError,
        );
        // On success the AuthProvider session updates and the effect above redirects.
        if (!error) {
          router.replace('/dashboard');
        }
      } else {
        const { data, error } = await withErrorNotification(
          () => signUp(email.trim(), password, username.trim()),
          notifyError,
        );
        if (!error && data?.needsConfirmation) {
          const message = 'Check your inbox to confirm your email, then sign in.';
          setInfoMessage(message);
          Alert.alert('Confirm your email', message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, validate, mode, email, password, username, signIn, signUp, notifyError, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!configured) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-lg font-bold text-gray-900 text-center">PickUp isn&apos;t set up yet</Text>
        <Text className="mt-3 text-center text-gray-500 leading-6">{SUPABASE_CONFIG_ERROR}</Text>
      </View>
    );
  }

  const isSignIn = mode === 'sign-in';
  const primaryLabel = isSignIn ? 'Sign In' : 'Create Account';
  const toggleLabel = isSignIn ? "Don't have an account? Sign up" : 'Already have an account? Sign in';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-8 py-12">
          <View className="mb-8">
            <Text className="text-3xl font-extrabold text-gray-900">PickUp</Text>
            <Text className="mt-2 text-base text-gray-500">
              Find a game. Run the game. Play.
            </Text>
          </View>

          <View className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <View className="mb-6 flex-row rounded-xl bg-gray-100 p-1">
              {(['sign-in', 'sign-up'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMode(m);
                    setInlineError(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 rounded-lg py-2 ${mode === m ? 'bg-white shadow-sm' : ''}`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      mode === m ? 'text-brand-600' : 'text-gray-500'
                    }`}
                  >
                    {m === 'sign-in' ? 'Sign In' : 'Sign Up'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === 'sign-up' && (
              <View className="mb-4">
                <Text className="mb-1 text-sm font-medium text-gray-700">Username</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="pickup_player"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}

            <View className="mb-4">
              <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-sm font-medium text-gray-700">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete={isSignIn ? 'password' : 'new-password'}
                textContentType={isSignIn ? 'password' : 'newPassword'}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {inlineError ? (
              <View className="mb-4 rounded-lg bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-600">{inlineError}</Text>
              </View>
            ) : null}

            {infoMessage ? (
              <View className="mb-4 rounded-lg bg-emerald-50 px-4 py-3">
                <Text className="text-sm text-emerald-700">{infoMessage}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              className={`mt-2 items-center justify-center rounded-xl bg-brand-500 py-4 ${
                submitting ? 'opacity-60' : ''
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-semibold text-white">{primaryLabel}</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              setMode(isSignIn ? 'sign-up' : 'sign-in');
              setInlineError(null);
              setInfoMessage(null);
            }}
            className="mt-6 items-center"
          >
            <Text className="text-sm font-semibold text-brand-600">{toggleLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
