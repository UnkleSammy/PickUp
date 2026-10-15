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
import {
  BREAK_LENGTH_MAX_MINS,
  BREAK_LENGTH_MIN_MINS,
  OVERTIME_LENGTH_MAX_MINS,
  OVERTIME_LENGTH_MIN_MINS,
  PERIOD_COUNT_BY_FORMAT,
  PERIOD_COUNT_MAX,
  PERIOD_COUNT_MIN,
  PERIOD_LENGTH_MAX_MINS,
  PERIOD_LENGTH_MIN_MINS,
  TARGET_SCORE_VALUES,
  validateGameStructure,
  WIN_BY_MAX,
  WIN_BY_MIN,
} from '@/lib/game-structure';
import { getSupabase, SUPABASE_CONFIG_ERROR } from '@/lib/supabase';
import type { Json } from '@/types/database.types';
import type { ClockMode, GameFormat, GameStructure, RolesRequired } from '@/types/domain';

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
const STEP_TITLES = ['Step 1 — Sport', 'Step 2 — Rules & Structure', 'Step 3 — Roles & Limits', 'Step 4 — Location & Time'];
const TOTAL_STEPS = STEP_LABELS.length;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DEFAULT_FOULS_LIMIT = 6;
const MAX_PLAYER_LIMIT = 100;

// --- Game structure presets --------------------------------------------------------
// The five named formats. Each preset builds a complete, valid `GameStructure`
// with sport-aware defaults seeded from Step 1 (see design §1.3 + the
// owner-approved `first_to` "Run to score" extension).

type PresetKey = GameFormat;

function isSetBased(sport: Sport | null): boolean {
  return sport === 'Volleyball' || sport === 'Tennis';
}

/** Halves period length — 20 min basketball, 25 min soccer & football. */
function halvesLength(sport: Sport | null): number {
  return sport === 'Soccer' || sport === 'Football' ? 25 : 20;
}

/** Halves clock — running for most, running + stoppage time for soccer. */
function halvesClock(sport: Sport | null): ClockMode {
  return sport === 'Soccer' ? 'running_added' : 'running';
}

/**
 * Build a complete `GameStructure` for a preset. `first_to` is score-based: the
 * time-based fields carry benign defaults and are ignored by validation.
 */
function buildStructure(format: GameFormat, sport: Sport | null): GameStructure {
  switch (format) {
    case 'halves':
      return {
        format: 'halves',
        period_count: 2,
        period_length_mins: halvesLength(sport),
        break_length_mins: 5,
        overtime_length_mins: null,
        clock_mode: halvesClock(sport),
        target_score: null,
        win_by: null,
      };
    case 'quarters':
      return {
        format: 'quarters',
        period_count: 4,
        period_length_mins: 10,
        break_length_mins: 2,
        overtime_length_mins: null,
        clock_mode: 'stopped',
        target_score: null,
        win_by: null,
      };
    case 'periods':
      return {
        format: 'periods',
        period_count: 3,
        period_length_mins: 15,
        break_length_mins: 2,
        overtime_length_mins: null,
        clock_mode: 'running',
        target_score: null,
        win_by: null,
      };
    case 'single':
      return {
        format: 'single',
        period_count: 1,
        period_length_mins: 60,
        break_length_mins: 0,
        overtime_length_mins: null,
        clock_mode: 'running',
        target_score: null,
        win_by: null,
      };
    case 'first_to':
      return {
        format: 'first_to',
        period_count: 2,
        period_length_mins: 20,
        break_length_mins: 0,
        overtime_length_mins: null,
        clock_mode: 'running',
        target_score: 11,
        win_by: 2,
      };
  }
}

interface PresetDef {
  key: PresetKey;
  label: string;
  icon: string;
  summary: (sport: Sport | null) => string;
  build: (sport: Sport | null) => GameStructure;
}

const PRESETS: PresetDef[] = [
  {
    key: 'halves',
    label: 'Halves',
    icon: '⏱️',
    summary: (sport) => `2 × ${halvesLength(sport)} min, 5 min halftime`,
    build: (sport) => buildStructure('halves', sport),
  },
  {
    key: 'quarters',
    label: 'Quarters',
    icon: '🔳',
    summary: () => '4 × 10 min, 2 min breaks',
    build: (sport) => buildStructure('quarters', sport),
  },
  {
    key: 'periods',
    label: 'Periods',
    icon: '🎚️',
    summary: () => '3 × 15 min, 2 min breaks',
    build: (sport) => buildStructure('periods', sport),
  },
  {
    key: 'single',
    label: 'Run the clock',
    icon: '⚡',
    summary: () => 'One 60-min running block',
    build: (sport) => buildStructure('single', sport),
  },
  {
    key: 'first_to',
    label: 'Run to score',
    icon: '🎯',
    summary: () => 'First to 11, win by 2',
    build: (sport) => buildStructure('first_to', sport),
  },
];

const CLOCK_MODE_OPTIONS: { value: ClockMode; label: string }[] = [
  { value: 'stopped', label: 'Stopped clock' },
  { value: 'running', label: 'Running clock' },
  { value: 'running_added', label: 'Running + stoppage time' },
];

function clockPhrase(mode: ClockMode): string {
  switch (mode) {
    case 'stopped':
      return 'stopped clock';
    case 'running':
      return 'running clock';
    case 'running_added':
      return 'running clock + stoppage time';
  }
}

/**
 * Plain-language restatement of the current structure (the "read a sentence"
 * surface — design §2.2 Section B).
 */
function summarizeStructure(s: GameStructure): string {
  if (s.format === 'first_to') {
    return `First to ${s.target_score ?? 11}, win by ${s.win_by ?? 2}`;
  }
  const overtime =
    s.overtime_length_mins != null
      ? ` · ${s.overtime_length_mins} min overtime`
      : ' · no overtime';
  switch (s.format) {
    case 'halves':
      return `${s.period_count} × ${s.period_length_mins} min halves · ${s.break_length_mins} min halftime · ${clockPhrase(s.clock_mode)}${overtime}`;
    case 'quarters':
      return `${s.period_count} × ${s.period_length_mins} min quarters · ${s.break_length_mins} min breaks · ${clockPhrase(s.clock_mode)}${overtime}`;
    case 'periods':
      return `${s.period_count} × ${s.period_length_mins} min periods · ${s.break_length_mins} min breaks · ${clockPhrase(s.clock_mode)}${overtime}`;
    case 'single':
      return `${s.period_length_mins} min running block · ${clockPhrase(s.clock_mode)}${overtime}`;
  }
}

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

/** A derived field shown read-only so the host sees it is locked, not broken. */
function ReadOnlyField({ label, hint }: { label: string; hint: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-muted-border bg-white px-4 py-3">
      <View className="flex-1 pr-3">
        <Text className="font-sans-500 text-label text-brand-700">{label}</Text>
        <Text className="mt-0.5 font-sans text-caption text-muted">{hint}</Text>
      </View>
      <Text className="font-sans-600 text-caption text-brand-600">Fixed</Text>
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

  // Step 2 — Rules & structure
  const [foulsLimit, setFoulsLimit] = useState(DEFAULT_FOULS_LIMIT);
  const [structure, setStructure] = useState<GameStructure>(() => buildStructure('halves', null));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [penaltyTypes, setPenaltyTypes] = useState<string[]>([]);
  const [customRulesEnabled, setCustomRulesEnabled] = useState(false);
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

  const togglePenaltyType = useCallback((preset: string) => {
    setPenaltyTypes((prev) =>
      prev.includes(preset) ? prev.filter((p) => p !== preset) : [...prev, preset],
    );
  }, []);

  // Selecting a sport seeds the structure's sport-aware defaults (period length
  // and clock behavior for halves), without discarding the rest of the model.
  const selectSport = useCallback((s: Sport) => {
    setSport(s);
    setInlineError(null);
    setStructure((prev) => {
      if (prev.format === 'halves') {
        return { ...prev, period_length_mins: halvesLength(s), clock_mode: halvesClock(s) };
      }
      return prev;
    });
  }, []);

  // One-tap preset selection: rewrite the whole structure with that preset's
  // sport-aware defaults.
  const applyPreset = useCallback(
    (key: PresetKey) => {
      const preset = PRESETS.find((p) => p.key === key);
      if (!preset) return;
      setStructure(preset.build(sport));
      setInlineError(null);
    },
    [sport],
  );

  const patchStructure = useCallback((patch: Partial<GameStructure>) => {
    setStructure((prev) => ({ ...prev, ...patch }));
  }, []);

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
      case 1: {
        if (foulsLimit < 0) return 'Fouls limit cannot be negative.';
        // The form constrains fields by construction, but validate anyway so a
        // malformed structure can never reach the INSERT.
        const validation = validateGameStructure(structure);
        if (!validation.ok) return validation.errors[0] ?? 'Game structure is invalid.';
        return null;
      }
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
  }, [step, sport, structure, foulsLimit, latitude, longitude, courtName, scheduledAt]);

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
              rules_text: customRulesEnabled ? rulesText.trim() : '',
              rules_penalties: {
                fouls_limit: foulsLimit,
                penalty_types: penaltyTypes,
              },
              game_structure: structure as unknown as Json,
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
    customRulesEnabled,
    foulsLimit,
    penaltyTypes,
    structure,
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
                    onPress={() => selectSport(s.key)}
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

          {/* Step 2 — Rules & structure */}
          {step === 1 ? (
            <View className="mt-4 space-y-3">
              {/* Structure (hidden for set-based sports — scoring lives in rules_text) */}
              {isSetBased(sport) ? (
                <View className="rounded-xl border border-dashed border-muted-border bg-white px-4 py-3">
                  <Text className="font-sans-500 text-label text-brand-700">No clock structure</Text>
                  <Text className="mt-0.5 font-sans text-caption leading-4 text-muted">
                    {sport} is set-based. Add scoring rules (e.g. “first to 21, best of 3”) in
                    Custom rules below.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Preset cards */}
                  <View className="flex-row flex-wrap justify-between">
                    {PRESETS.map((preset) => {
                      const active = structure.format === preset.key;
                      return (
                        <Pressable
                          key={preset.key}
                          onPress={() => applyPreset(preset.key)}
                          accessibilityRole="button"
                          className={`relative mb-3 w-[48%] rounded-2xl border px-3 py-4 ${
                            active ? 'border-brand-500 bg-brand-50' : 'border-muted-border bg-white'
                          }`}
                        >
                          {active ? (
                            <View className="absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full bg-brand-500">
                              <Text className="font-sans-700 text-micro text-white">✓</Text>
                            </View>
                          ) : null}
                          <Text className="text-3xl">{preset.icon}</Text>
                          <Text
                            className={`mt-2 text-label ${
                              active ? 'font-sans-700 text-brand-700' : 'font-sans-600 text-muted-ink'
                            }`}
                          >
                            {preset.label}
                          </Text>
                          <Text
                            className={`mt-0.5 font-sans text-caption leading-4 ${
                              active ? 'text-brand-600' : 'text-muted'
                            }`}
                          >
                            {preset.summary(sport)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Summary sentence */}
                  <View className="rounded-xl bg-brand-50 px-4 py-3">
                    <Text className="font-sans-600 text-caption uppercase tracking-wide text-brand-600">
                      Game structure
                    </Text>
                    <Text className="mt-1 font-sans-500 text-body leading-5 text-brand-700">
                      {summarizeStructure(structure)}
                    </Text>
                  </View>

                  {/* Adjust details */}
                  <Pressable
                    onPress={() => setDetailsOpen((o) => !o)}
                    accessibilityRole="button"
                    className="flex-row items-center justify-between rounded-xl border border-muted-border bg-white px-4 py-3"
                  >
                    <Text className="font-sans-600 text-label text-brand-700">Adjust details</Text>
                    <Text className="font-sans-600 text-label text-brand-600">
                      {detailsOpen ? '▾' : '▸'}
                    </Text>
                  </Pressable>

                  {detailsOpen ? (
                    <View className="space-y-3 rounded-2xl border border-muted-border bg-brand-50 p-3">
                      {structure.format === 'first_to' ? (
                        <>
                          <View className="rounded-xl border border-muted-border bg-white px-4 py-3">
                            <Text className="font-sans-500 text-label text-brand-700">
                              Target score
                            </Text>
                            <Text className="mt-0.5 font-sans text-caption text-muted">
                              Play to this many points.
                            </Text>
                            <View className="mt-2 flex-row flex-wrap gap-2">
                              {TARGET_SCORE_VALUES.map((score) => {
                                const active = structure.target_score === score;
                                return (
                                  <Pressable
                                    key={score}
                                    onPress={() => patchStructure({ target_score: score })}
                                    className={`rounded-full px-3 py-1 ${
                                      active ? 'bg-brand-500' : 'bg-muted-soft'
                                    }`}
                                  >
                                    <Text
                                      className={`font-sans-500 text-caption ${
                                        active ? 'text-white' : 'text-muted-ink'
                                      }`}
                                    >
                                      {score}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>

                          <Stepper
                            label="Win by"
                            hint={`${structure.win_by ?? 2} ${structure.win_by === 1 ? 'point' : 'points'}`}
                            onDecrement={() =>
                              patchStructure({ win_by: Math.max(WIN_BY_MIN, (structure.win_by ?? 2) - 1) })
                            }
                            onIncrement={() =>
                              patchStructure({ win_by: Math.min(WIN_BY_MAX, (structure.win_by ?? 2) + 1) })
                            }
                            canDecrement={(structure.win_by ?? 2) > WIN_BY_MIN}
                            canIncrement={(structure.win_by ?? 2) < WIN_BY_MAX}
                          />
                        </>
                      ) : (
                        <>
                          {structure.format === 'periods' ? (
                            <Stepper
                              label="Number of periods"
                              hint={`${structure.period_count} ${structure.period_count === 1 ? 'period' : 'periods'}`}
                              onDecrement={() =>
                                patchStructure({ period_count: Math.max(PERIOD_COUNT_MIN, structure.period_count - 1) })
                              }
                              onIncrement={() =>
                                patchStructure({ period_count: Math.min(PERIOD_COUNT_MAX, structure.period_count + 1) })
                              }
                              canDecrement={structure.period_count > PERIOD_COUNT_MIN}
                              canIncrement={structure.period_count < PERIOD_COUNT_MAX}
                            />
                          ) : (
                            <ReadOnlyField
                              label="Number of periods"
                              hint={`${structure.period_count} (fixed for ${structure.format})`}
                            />
                          )}

                          <Stepper
                            label="Period length"
                            hint={`${structure.period_length_mins} min`}
                            onDecrement={() =>
                              patchStructure({
                                period_length_mins: Math.max(PERIOD_LENGTH_MIN_MINS, structure.period_length_mins - 1),
                              })
                            }
                            onIncrement={() =>
                              patchStructure({
                                period_length_mins: Math.min(PERIOD_LENGTH_MAX_MINS, structure.period_length_mins + 1),
                              })
                            }
                            canDecrement={structure.period_length_mins > PERIOD_LENGTH_MIN_MINS}
                            canIncrement={structure.period_length_mins < PERIOD_LENGTH_MAX_MINS}
                          />

                          {structure.format !== 'single' ? (
                            <Stepper
                              label="Halftime / break"
                              hint={`${structure.break_length_mins} min`}
                              onDecrement={() =>
                                patchStructure({
                                  break_length_mins: Math.max(BREAK_LENGTH_MIN_MINS, structure.break_length_mins - 1),
                                })
                              }
                              onIncrement={() =>
                                patchStructure({
                                  break_length_mins: Math.min(BREAK_LENGTH_MAX_MINS, structure.break_length_mins + 1),
                                })
                              }
                              canDecrement={structure.break_length_mins > BREAK_LENGTH_MIN_MINS}
                              canIncrement={structure.break_length_mins < BREAK_LENGTH_MAX_MINS}
                            />
                          ) : null}

                          <ToggleRow
                            label="Add overtime"
                            hint="Timed overtime period"
                            value={structure.overtime_length_mins != null}
                            onValueChange={(on) =>
                              patchStructure({ overtime_length_mins: on ? 5 : null })
                            }
                          />

                          {structure.overtime_length_mins != null ? (
                            <Stepper
                              label="Overtime length"
                              hint={`${structure.overtime_length_mins} min`}
                              onDecrement={() =>
                                patchStructure({
                                  overtime_length_mins: Math.max(
                                    OVERTIME_LENGTH_MIN_MINS,
                                    structure.overtime_length_mins! - 1,
                                  ),
                                })
                              }
                              onIncrement={() =>
                                patchStructure({
                                  overtime_length_mins: Math.min(
                                    OVERTIME_LENGTH_MAX_MINS,
                                    structure.overtime_length_mins! + 1,
                                  ),
                                })
                              }
                              canDecrement={structure.overtime_length_mins > OVERTIME_LENGTH_MIN_MINS}
                              canIncrement={structure.overtime_length_mins < OVERTIME_LENGTH_MAX_MINS}
                            />
                          ) : null}

                          <View className="rounded-xl border border-muted-border bg-white px-4 py-3">
                            <Text className="font-sans-500 text-label text-brand-700">Clock</Text>
                            <Text className="mt-0.5 font-sans text-caption text-muted">
                              How the clock runs on dead balls.
                            </Text>
                            <View className="mt-2 space-y-2">
                              {CLOCK_MODE_OPTIONS.map((option) => {
                                const active = structure.clock_mode === option.value;
                                return (
                                  <Pressable
                                    key={option.value}
                                    onPress={() => patchStructure({ clock_mode: option.value })}
                                    accessibilityRole="button"
                                    className={`flex-row items-center justify-between rounded-lg border px-3 py-2.5 ${
                                      active
                                        ? 'border-brand-500 bg-brand-50'
                                        : 'border-muted-border bg-white'
                                    }`}
                                  >
                                    <Text
                                      className={`text-label ${
                                        active
                                          ? 'font-sans-600 text-brand-700'
                                          : 'font-sans-500 text-muted-ink'
                                      }`}
                                    >
                                      {option.label}
                                    </Text>
                                    {active ? (
                                      <Text className="font-sans-700 text-label text-brand-500">✓</Text>
                                    ) : null}
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  ) : null}
                </>
              )}

              <Stepper
                label="Fouls limit"
                hint={`${foulsLimit} ${foulsLimit === 1 ? 'foul' : 'fouls'}`}
                onDecrement={() => setFoulsLimit((n) => Math.max(0, n - 1))}
                onIncrement={() => setFoulsLimit((n) => Math.min(50, n + 1))}
                canDecrement={foulsLimit > 0}
                canIncrement={foulsLimit < 50}
              />

              <View className="rounded-xl border border-muted-border bg-white px-4 py-3">
                <Text className="font-sans-500 text-label text-brand-700">Penalty types</Text>
                <Text className="mt-0.5 font-sans text-caption text-muted">Select all that apply.</Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {PENALTY_PRESETS.map((preset) => {
                    const active = penaltyTypes.includes(preset);
                    return (
                      <Pressable
                        key={preset}
                        onPress={() => togglePenaltyType(preset)}
                        className={`rounded-full px-3 py-1 ${
                          active ? 'bg-brand-500' : 'bg-muted-soft'
                        }`}
                      >
                        <Text
                          className={`font-sans-500 text-caption ${
                            active ? 'text-white' : 'text-muted-ink'
                          }`}
                        >
                          {preset}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <ToggleRow
                label="Custom rules"
                hint="Add your own house rules (optional)"
                value={customRulesEnabled}
                onValueChange={setCustomRulesEnabled}
              />

              {customRulesEnabled ? (
                <View className="rounded-xl border border-muted-border bg-white px-4 py-3">
                  <TextInput
                    value={rulesText}
                    onChangeText={setRulesText}
                    placeholder="e.g. Half-court, winner stays on, no backpacks on court."
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="h-20 rounded-lg border border-muted-border bg-white px-3 py-2 font-sans text-body text-muted-ink"
                    placeholderTextColor="#6B7280"
                  />
                </View>
              ) : null}
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
