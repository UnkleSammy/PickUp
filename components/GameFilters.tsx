import { Pressable, ScrollView, Text, View } from 'react-native';

export interface DistanceFilterOption {
  label: string;
  /** Maximum distance in meters; `null` means "any distance". */
  maxMeters: number | null;
}

export const DISTANCE_OPTIONS: DistanceFilterOption[] = [
  { label: 'Any', maxMeters: null },
  { label: '5 km', maxMeters: 5_000 },
  { label: '10 km', maxMeters: 10_000 },
  { label: '25 km', maxMeters: 25_000 },
];

/**
 * Skill Level is deliberately UI-ONLY for now. The `games` table has NO
 * `skill_level` column (see PICKUP_SPEC Section 1), so this control must NOT
 * filter on it and we must NOT invent a schema column here. It is rendered
 * ahead of the schema change so the UX is ready when a skill level field lands
 * in a later slice.
 *
 * TODO(skill-level): once `games.skill_level` exists, wire `selectedSkillLevel`
 * into the dashboard's derived filter (and the create-game wizard), then remove
 * this comment.
 */
export const SKILL_LEVELS = ['Any', 'Beginner', 'Intermediate', 'Advanced'] as const;

interface GameFiltersProps {
  sports: string[];
  selectedSport: string | null;
  onSelectSport: (sport: string | null) => void;
  selectedSkillLevel: string | null;
  onSelectSkillLevel: (level: string | null) => void;
  selectedDistance: DistanceFilterOption;
  onSelectDistance: (option: DistanceFilterOption) => void;
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-4 py-2 ${active ? 'bg-brand-500' : 'bg-gray-100'}`}
    >
      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-700'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function GameFilters({
  sports,
  selectedSport,
  onSelectSport,
  selectedSkillLevel,
  onSelectSkillLevel,
  selectedDistance,
  onSelectDistance,
}: GameFiltersProps) {
  const sportOptions = ['Any', ...sports];

  return (
    <View className="mt-5 space-y-4">
      <View>
        <Text className="mb-2 px-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Sport
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {sportOptions.map((sport) => {
            const value = sport === 'Any' ? null : sport;
            return (
              <Chip
                key={sport}
                label={sport}
                active={selectedSport === value}
                onPress={() => onSelectSport(value)}
              />
            );
          })}
        </ScrollView>
      </View>

      <View>
        <Text className="mb-2 px-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Skill Level
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {SKILL_LEVELS.map((level) => {
            const value = level === 'Any' ? null : level;
            return (
              <Chip
                key={level}
                label={level}
                active={selectedSkillLevel === value}
                onPress={() => onSelectSkillLevel(value)}
              />
            );
          })}
        </ScrollView>
      </View>

      <View>
        <Text className="mb-2 px-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Distance
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {DISTANCE_OPTIONS.map((option) => (
            <Chip
              key={option.label}
              label={option.label}
              active={selectedDistance.label === option.label}
              onPress={() => onSelectDistance(option)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
