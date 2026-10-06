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

import Button from '@/components/Button';
import Wordmark from '@/components/Wordmark';
import { withErrorNotification } from '@/lib/async-mutation';
import { useAuth } from '@/lib/auth-context';
import { toErrorMessage } from '@/lib/errors';
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
        try {
          const result = await signUp(email.trim(), password, username.trim());
          if (result.status === 'error') {
            notifyError(result.message);
          } else if (result.status === 'signed_in') {
            router.replace('/dashboard');
          } else {
            const message = 'Account created — check your email to confirm before signing in.';
            setInfoMessage(message);
            Alert.alert('Check your email', message);
          }
        } catch (err) {
          notifyError(toErrorMessage(err));
        }
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, validate, mode, email, password, username, signIn, signUp, notifyError, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-900">
        <ActivityIndicator size="large" color="#C9F24B" />
      </View>
    );
  }

  if (!configured) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-900 px-8">
        <Text className="text-center font-sans-600 text-lg text-brand-50">
          PickUp isn&apos;t set up yet
        </Text>
        <Text className="mt-3 text-center font-sans text-body leading-6 text-brand-200">
          {SUPABASE_CONFIG_ERROR}
        </Text>
      </View>
    );
  }

  const isSignIn = mode === 'sign-in';
  const primaryLabel = isSignIn ? 'Sign In' : 'Create Account';
  const toggleLabel = isSignIn ? "Don't have an account? Sign up" : 'Already have an account? Sign in';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-8 py-12">
          <View className="mb-8">
            <Wordmark tone="dark" className="text-display" />
            <Text className="mt-3 font-sans text-body text-brand-200">
              Find a game. Run the game. Play.
            </Text>
          </View>

          <View className="rounded-2xl border border-brand-700 bg-brand-800 p-6">
            <View className="mb-6 flex-row rounded-xl bg-brand-700 p-1">
              {(['sign-in', 'sign-up'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMode(m);
                    setInlineError(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 rounded-lg py-2 ${mode === m ? 'bg-brand-500' : ''}`}
                >
                  <Text
                    className={`text-center font-sans-600 text-label ${
                      mode === m ? 'text-white' : 'text-brand-300'
                    }`}
                  >
                    {m === 'sign-in' ? 'Sign In' : 'Sign Up'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === 'sign-up' && (
              <View className="mb-4">
                <Text className="mb-1 font-sans-500 text-label text-brand-100">Username</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="pickup_player"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="rounded-xl border border-brand-600 bg-brand-700 px-4 py-3 font-sans text-body text-white"
                  placeholderTextColor="#AAB3AE"
                />
              </View>
            )}

            <View className="mb-4">
              <Text className="mb-1 font-sans-500 text-label text-brand-100">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                className="rounded-xl border border-brand-600 bg-brand-700 px-4 py-3 font-sans text-body text-white"
                placeholderTextColor="#AAB3AE"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-1 font-sans-500 text-label text-brand-100">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete={isSignIn ? 'password' : 'new-password'}
                textContentType={isSignIn ? 'password' : 'newPassword'}
                className="rounded-xl border border-brand-600 bg-brand-700 px-4 py-3 font-sans text-body text-white"
                placeholderTextColor="#AAB3AE"
              />
            </View>

            {inlineError ? (
              <View className="mb-4 rounded-lg bg-danger-soft px-4 py-3">
                <Text className="font-sans-500 text-label text-danger-strong">{inlineError}</Text>
              </View>
            ) : null}

            {infoMessage ? (
              <View className="mb-4 rounded-lg bg-success-soft px-4 py-3">
                <Text className="font-sans-500 text-label text-success-strong">{infoMessage}</Text>
              </View>
            ) : null}

            <Button
              label={primaryLabel}
              onPress={onSubmit}
              loading={submitting}
              variant="primary"
              className="mt-2"
            />
          </View>

          <Pressable
            onPress={() => {
              setMode(isSignIn ? 'sign-up' : 'sign-in');
              setInlineError(null);
              setInfoMessage(null);
            }}
            className="mt-6 items-center"
          >
            <Text className="font-sans-600 text-label text-brand-200">{toggleLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
