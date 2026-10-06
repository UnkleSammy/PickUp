import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import Button from '@/components/Button';
import GameMapPicker, { type MockCourt } from '@/components/GameMapPicker';
import { withErrorNotification } from '@/lib/async-mutation';
import { useAuth } from '@/lib/auth-context';
import { getSupabase, SUPABASE_CONFIG_ERROR } from '@/lib/supabase';
import type { RolesRequired, RulesPenalties } from '@/types/domain';

type Sport = 'Basketball' | 'Soccer' | 'Volleyball' | 'Football' | 'Tennis';

const SPORTS: { key: Sport; label: string; emoji: string }[] = [
  { key: 'Basketball', label: 'Basketball', emoji: '🏀' },
  { key: 'Soccer', label: 'Soccer', emoji: '⚽' },
  { key: 'Volleyball', label: 'Volleyball', emoji: '🏐' },
  { key: 'Football', label: 'Football', emoji: '🏈' },
  { key: 'Tennis', label: 'Tennis', emoji: '🎾' },
];

const PENALTY_PRESETS = ['Personal foul', 'Technical foul', 'Team foul', 'Free throw'];

const STEP_LABELS = ['Sport', 'Rules', 'Roles', 'Location'] as const;
const STEP_TITLES = ['Step 1 — Sport', 'Step 2 — Rules & Penalties', 'Step 3 — Roles & Limits', 'Step 4 — Location & Time'];
const TOTAL_STEPS = STEP_LABELS.length;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DEFAULT_FOULS_LIMIT = 6;
const DEFAULT_HALF_DURATION_MINS = 20;
const DEFAULT_PENALTY_TYPE = 'Personal foul';
const MAX_PLAYER_LIMIT = 100;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Defaults the game to tomorrow at 6:00 PM so the field starts valid. */
function defaultScheduledAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

// --- Small presentational helpers -------------------------------------------------

function RoundButton({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-8 w-8 items-center justify-center rounded-full ${
        primary ? 'bg-brand-500' : 'bg-muted-soft'
      }`}
    >
      <Text className={`font-sans-600 text-body ${primary ? 'text-white' : 'text-muted-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function Stepper({
  label,
  hint,
  onDecrement,
  onIncrement,
  canDecrement,
  canIncrement,
}: {
  label: string;
  hint: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-muted-border bg-white px-4 py-3">
      <View className="flex-1 pr-3">
        <Text className="font-sans-500 text-label text-brand-700">{label}</Text>
        <Text className="mt-0.5 font-sans text-caption text-muted">{hint}</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onDecrement}
          disabled={!canDecrement}
          className={`h-9 w-9 items-center justify-center rounded-full ${
            canDecrement ? 'bg-muted-soft' : 'bg-muted-soft'
          }`}
        >
          <Text
            className={`font-sans-700 text-heading ${
              canDecrement ? 'text-muted-ink' : 'text-brand-300'
            }`}
          >
            −
          </Text>
        </Pressable>
        <Pressable
          onPress={onIncrement}
          disabled={!canIncrement}
          className={`h-9 w-9 items-center justify-center rounded-full ${
            canIncrement ? 'bg-brand-500' : 'bg-brand-100'
          }`}
        >
          <Text
            className={`font-sans-700 text-heading ${
              canIncrement ? 'text-white' : 'text-brand-300'
            }`}
          >
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-muted-border bg-white px-4 py-3">
      <View className="flex-1 pr-3">
        <Text className="font-sans-500 text-label text-brand-700">{label}</Text>
        <Text className="mt-0.5 font-sans text-caption text-muted">{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: '#46514B', false: '#E5E7EB' }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

// --- Screen ------------------------------------------------------------------------

export default function CreateGameScreen() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  const [step, setStep] = useState(0);

  // Step 1 — Sport
  const [sport, setSport] = useState<Sport | null>(null);

  // Step 2 — Rules & penalties
  const [foulsLimit, setFoulsLimit] = useState(DEFAULT_FOULS_LIMIT);
  const [halfDurationMins, setHalfDurationMins] = useState(DEFAULT_HALF_DURATION_MINS);
  const [penaltyType, setPenaltyType] = useState(DEFAULT_PENALTY_TYPE);
  const [rulesText, setRulesText] = useState('');

  // Step 3 — Roles & limits
  const [refereeRequired, setRefereeRequired] = useState(false);
  const [timekeeperRequired, setTimekeeperRequired] = useState(false);
  const [playerLimit, setPlayerLimit] = useState(0); // 0 = no limit
  const [requireApproval, setRequireApproval] = useState(false);

  // Step 4 — Location & time
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [courtName, setCourtName] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date>(defaultScheduledAt);

  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'error' | 'success' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, tone: 'error' | 'success' = 'error') => {
    setToast({ message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Clean up the toast timer on unmount.
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const notifyError = useCallback(
    (message: string) => {
      setInlineError(message);
      showToast(message, 'error');
    },
    [showToast],
  );

  // Next 7 days (starting tomorrow) for the date chips.
  const dateOptions = useMemo(() => {
    const today = startOfDay(new Date());
    const options: { key: string; date: Date; label: string }[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      options.push({
        key: toDateKey(d),
        date: d,
        label: i === 1 ? 'Tomorrow' : `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`,
      });
    }
    return options;
  }, []);

  const validateCurrentStep = useCallback((): string | null => {
    switch (step) {
      case 0:
        return sport === null ? 'Pick a sport to continue.' : null;
      case 1:
        if (rulesText.trim().length === 0) return 'Add a custom rule (or "No special rules").';
        if (penaltyType.trim().length === 0) return 'Enter a penalty type.';
        if (halfDurationMins <= 0) return 'Half/quarter duration must be at least 1 minute.';
        if (foulsLimit < 0) return 'Fouls limit cannot be negative.';
        return null;
      case 2:
        return null; // toggles + a 0+ counter are always valid
      case 3:
        if (latitude === null || longitude === null) return 'Choose a court on the map.';
        if (courtName.trim().length === 0) return 'Enter a court name.';
        if (scheduledAt.getTime() <= Date.now()) return 'Choose a date and time in the future.';
        return null;
      default:
        return null;
    }
  }, [step, sport, rulesText, penaltyType, halfDurationMins, foulsLimit, latitude, longitude, courtName, scheduledAt]);

  const handleNext = useCallback(() => {
    const validationError = validateCurrentStep();
    if (validationError) {
      setInlineError(validationError);
      showToast(validationError, 'error');
      return;
    }
    setInlineError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, [validateCurrentStep, showToast]);

  const handleBack = useCallback(() => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => s - 1);
    setInlineError(null);
  }, [step, router]);

  const handleSelectCourt = useCallback((court: MockCourt) => {
    setLatitude(court.latitude);
    setLongitude(court.longitude);
    setCourtName(court.name);
    setInlineError(null);
  }, []);

  // Date/time mutators (preserve the other parts of the timestamp).
  const applyDate = useCallback((day: Date) => {
    setScheduledAt((prev) => {
      const next = new Date(prev);
      next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
      return next;
    });
  }, []);

  const bumpHour = useCallback((delta: number) => {
    setScheduledAt((prev) => {
      const next = new Date(prev);
      next.setHours((prev.getHours() + delta + 24) % 24);
      return next;
    });
  }, []);

  const bumpMinute = useCallback((delta: number) => {
    setScheduledAt((prev) => {
      const next = new Date(prev);
      next.setMinutes((prev.getMinutes() + delta * 15 + 60) % 60);
      return next;
    });
  }, []);

  const toggleAmPm = useCallback(() => {
    setScheduledAt((prev) => {
      const next = new Date(prev);
      const hours = prev.getHours();
      next.setHours(hours >= 12 ? hours - 12 : hours + 12);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setInlineError(null);

    if (!user) {
      const message = 'You must be signed in to create a game.';
      setInlineError(message);
      showToast(message, 'error');
      return;
    }

    const validationError = validateCurrentStep();
    if (validationError) {
      setInlineError(validationError);
      showToast(validationError, 'error');
      return;
    }

    // Non-null narrowed for the INSERT payload after validation above.
    if (sport === null || latitude === null || longitude === null) {
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await withErrorNotification(
        async () => {
          const supabase = getSupabase();
          const result = await supabase
            .from('games')
            .insert({
              host_id: user.id,
              sport,
              rules_text: rulesText.trim(),
              rules_penalties: {
                fouls_limit: foulsLimit,
                penalty_type: penaltyType.trim(),
                half_duration_mins: halfDurationMins,
              } satisfies RulesPenalties,
              latitude,
              longitude,
              court_name: courtName.trim(),
              scheduled_at: scheduledAt.toISOString(),
              roles_required: {
                referee: refereeRequired,
                timekeeper: timekeeperRequired,
              } satisfies RolesRequired,
              player_limit: playerLimit > 0 ? playerLimit : null,
              require_approval: requireApproval,
            })
            .select('id')
            .single();
          if (result.error) throw new Error(result.error.message);
          if (!result.data) throw new Error('The game was not created. Please try again.');
          return result.data;
        },
        notifyError,
      );

      if (!error && data) {
        showToast('Game created', 'success');
        router.replace({ pathname: '/game-lobby', params: { id: data.id } });
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    user,
    validateCurrentStep,
    sport,
    latitude,
    longitude,
    rulesText,
    foulsLimit,
    penaltyType,
    halfDurationMins,
    courtName,
    scheduledAt,
    refereeRequired,
    timekeeperRequired,
    playerLimit,
    requireApproval,
    notifyError,
    showToast,
    router,
  ]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-50">
        <ActivityIndicator size="large" color="#46514B" />
      </View>
    );
  }

  if (!configured) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-50 px-8">
        <Text className="text-center font-display-700 text-heading text-brand-900">
          PickUp isn&apos;t set up yet
        </Text>
        <Text className="mt-3 text-center font-sans text-body text-muted">
          {SUPABASE_CONFIG_ERROR}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 items-center justify-center rounded-xl border border-muted-border px-6 py-3"
        >
          <Text className="font-sans-600 text-label text-muted-ink">Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-50 px-8">
        <Text className="text-center font-display-700 text-heading text-brand-900">
          Sign in required
        </Text>
        <Text className="mt-3 text-center font-sans text-body text-muted">
          Sign in to create a pickup game.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 items-center justify-center rounded-xl border border-muted-border px-6 py-3"
        >
          <Text className="font-sans-600 text-label text-muted-ink">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const hour12 = scheduledAt.getHours() % 12 || 12;
  const ampm = scheduledAt.getHours() >= 12 ? 'PM' : 'AM';
  const minuteLabel = scheduledAt.getMinutes().toString().padStart(2, '0');

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Toast overlay */}
      {toast ? (
        <View className="absolute left-5 right-5 top-16 z-50 items-center">
          <View
            className={`rounded-xl px-4 py-3 ${
              toast.tone === 'error' ? 'bg-danger-soft' : 'bg-success-soft'
            }`}
          >
            <Text
              className={`font-sans-600 text-label ${
                toast.tone === 'error' ? 'text-danger-strong' : 'text-success-strong'
              }`}
            >
              {toast.message}
            </Text>
          </View>
        </View>
      ) : null}

      <View className="border-b border-muted-border bg-brand-50 px-5 pb-4 pt-16">
        <Text className="font-display-700 text-title text-brand-900">Create a Game</Text>
        <Text className="mt-1 font-sans text-body text-muted">
          Step {step + 1} of {TOTAL_STEPS}.
        </Text>

        {/* Progress indicator */}
        <View className="mt-4 flex-row items-start gap-1">
          {STEP_LABELS.map((label, i) => (
            <View key={label} className="flex-1">
              <View
                className={`h-1.5 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-muted-border'}`}
              />
              <Text
                className={`mt-1 font-sans-600 text-micro ${
                  i <= step ? 'text-brand-600' : 'text-muted'
                }`}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-5">
          <Text className="font-sans-600 text-caption uppercase tracking-wide text-brand-600">
            {STEP_TITLES[step]}
          </Text>

          {/* Step 1 — Sport */}
          {step === 0 ? (
            <View className="mt-4 flex-row flex-wrap justify-between">
              {SPORTS.map((s) => {
                const active = sport === s.key;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => {
                      setSport(s.key);
                      setInlineError(null);
                    }}
                    className={`mb-3 w-[48%] items-center rounded-2xl border py-5 ${
                      active ? 'border-brand-500 bg-brand-50' : 'border-muted-border bg-white'
                    }`}
                  >
                    <Text className="text-4xl">{s.emoji}</Text>
                    <Text
                      className={`mt-2 font-sans-600 text-label ${
                        active ? 'text-brand-700' : 'text-muted-ink'
                      }`}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Step 2 — Rules & penalties */}
          {step === 1 ? (
            <View className="mt-4 space-y-3">
              <Stepper
                label="Fouls limit"
                hint={`${foulsLimit} ${foulsLimit === 1 ? 'foul' : 'fouls'}`}
                onDecrement={() => setFoulsLimit((n) => Math.max(0, n - 1))}
                onIncrement={() => setFoulsLimit((n) => Math.min(50, n + 1))}
                canDecrement={foulsLimit > 0}
                canIncrement={foulsLimit < 50}
              />

              <Stepper
                label="Half / quarter duration"
                hint={`${halfDurationMins} min`}
                onDecrement={() => setHalfDurationMins((n) => Math.max(1, n - 1))}
                onIncrement={() => setHalfDurationMins((n) => Math.min(90, n + 1))}
                canDecrement={halfDurationMins > 1}
                canIncrement={halfDurationMins < 90}
              />

              <View className="rounded-xl border border-muted-border bg-white px-4 py-3">
                <Text className="font-sans-500 text-label text-brand-700">Penalty type</Text>
                <TextInput
                  value={penaltyType}
                  onChangeText={setPenaltyType}
                  placeholder="e.g. Personal foul"
                  className="mt-2 rounded-lg border border-muted-border bg-white px-3 py-2 font-sans text-body text-muted-ink"
                  placeholderTextColor="#6B7280"
                />
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {PENALTY_PRESETS.map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => setPenaltyType(preset)}
                      className={`rounded-full px-3 py-1 ${
                        penaltyType === preset ? 'bg-brand-500' : 'bg-muted-soft'
                      }`}
                    >
                      <Text
                        className={`font-sans-500 text-caption ${
                          penaltyType === preset ? 'text-white' : 'text-muted-ink'
                        }`}
                      >
                        {preset}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="rounded-xl border border-muted-border bg-white px-4 py-3">
                <Text className="font-sans-500 text-label text-brand-700">Custom rules</Text>
                <TextInput
                  value={rulesText}
                  onChangeText={setRulesText}
                  placeholder="e.g. Half-court, winner stays on, no backpacks on court."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="mt-2 h-20 rounded-lg border border-muted-border bg-white px-3 py-2 font-sans text-body text-muted-ink"
                  placeholderTextColor="#6B7280"
                />
              </View>
            </View>
          ) : null}

          {/* Step 3 — Roles & limits */}
          {step === 2 ? (
            <View className="mt-4 space-y-3">
              <ToggleRow
                label="Referee required"
                hint="Host needs a referee to run this game"
                value={refereeRequired}
                onValueChange={setRefereeRequired}
              />
              <ToggleRow
                label="Timekeeper required"
                hint="Host needs a timekeeper to run the clock"
                value={timekeeperRequired}
                onValueChange={setTimekeeperRequired}
              />
              <Stepper
                label="Player limit"
                hint={playerLimit === 0 ? 'No limit' : `${playerLimit} players`}
                onDecrement={() => setPlayerLimit((n) => Math.max(0, n - 1))}
                onIncrement={() => setPlayerLimit((n) => Math.min(MAX_PLAYER_LIMIT, n + 1))}
                canDecrement={playerLimit > 0}
                canIncrement={playerLimit < MAX_PLAYER_LIMIT}
              />
              <ToggleRow
                label="Require approval"
                hint="Players must be approved before joining"
                value={requireApproval}
                onValueChange={setRequireApproval}
              />
            </View>
          ) : null}

          {/* Step 4 — Location & time */}
          {step === 3 ? (
            <View className="mt-4 space-y-3">
              <GameMapPicker
                selected={
                  latitude !== null && longitude !== null
                    ? { latitude, longitude }
                    : null
                }
                onSelect={handleSelectCourt}
              />

              <View className="rounded-xl border border-muted-border bg-white px-4 py-3">
                <Text className="font-sans-500 text-label text-brand-700">Court name</Text>
                <TextInput
                  value={courtName}
                  onChangeText={setCourtName}
                  placeholder="e.g. Riverside Courts"
                  className="mt-2 rounded-lg border border-muted-border bg-white px-3 py-2 font-sans text-body text-muted-ink"
                  placeholderTextColor="#6B7280"
                />
              </View>

              <View className="rounded-xl border border-muted-border bg-white p-4">
                <Text className="font-sans-600 text-caption uppercase tracking-wide text-brand-600">
                  Date
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingTop: 8 }}
                >
                  {dateOptions.map((option) => {
                    const active = toDateKey(scheduledAt) === option.key;
                    return (
                      <Pressable
                        key={option.key}
                        onPress={() => applyDate(option.date)}
                        className={`rounded-full px-4 py-2 ${
                          active ? 'bg-brand-500' : 'bg-muted-soft'
                        }`}
                      >
                        <Text
                          className={`font-sans-500 text-label ${
                            active ? 'text-white' : 'text-muted-ink'
                          }`}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text className="mt-4 font-sans-600 text-caption uppercase tracking-wide text-brand-600">
                  Time
                </Text>
                <View className="mt-2 flex-row items-center justify-between rounded-lg bg-muted-soft px-4 py-3">
                  <View className="items-center">
                    <Text className="font-sans-500 text-micro uppercase text-muted">Hour</Text>
                    <View className="mt-1 flex-row items-center gap-2">
                      <RoundButton label="−" onPress={() => bumpHour(-1)} />
                      <Text className="w-8 text-center font-display-700 text-heading tabular-nums text-muted-ink">
                        {hour12}
                      </Text>
                      <RoundButton label="+" onPress={() => bumpHour(1)} primary />
                    </View>
                  </View>

                  <Text className="font-display-700 text-heading text-muted">:</Text>

                  <View className="items-center">
                    <Text className="font-sans-500 text-micro uppercase text-muted">Minute</Text>
                    <View className="mt-1 flex-row items-center gap-2">
                      <RoundButton label="−" onPress={() => bumpMinute(-1)} />
                      <Text className="w-8 text-center font-display-700 text-heading tabular-nums text-muted-ink">
                        {minuteLabel}
                      </Text>
                      <RoundButton label="+" onPress={() => bumpMinute(1)} primary />
                    </View>
                  </View>

                  <Pressable onPress={toggleAmPm} className="rounded-xl bg-brand-100 px-3 py-2">
                    <Text className="font-sans-700 text-label text-brand-700">{ampm}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {inlineError ? (
        <View className="mx-5 mb-2 rounded-lg bg-danger-soft px-4 py-2">
          <Text className="font-sans-500 text-label text-danger-strong">{inlineError}</Text>
        </View>
      ) : null}

      <View className="flex-row gap-3 border-t border-muted-border bg-brand-50 p-5">
        <Button label="Back" onPress={handleBack} variant="secondary" className="flex-1" />
        <Button
          label={isLastStep ? 'Create game' : 'Next'}
          onPress={isLastStep ? handleSubmit : handleNext}
          loading={submitting}
          variant="primary"
          className="flex-1"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
