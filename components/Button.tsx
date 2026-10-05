import { ActivityIndicator, Pressable, Text } from 'react-native';

/**
 * Shared button primitives for the Street Court system.
 *
 * Grounding (design/IDENTITY.md §5):
 * - `primary` = volt fill (`bg-accent`) with `brand-900` ink text (15.05:1) — the
 *   *energy* moment ("Join", "Create", "Accept"). Volt never carries white text.
 * - `secondary` / `ghost` = neutral surfaces (muted/brand ink on white) so data
 *   surfaces stay calm.
 * - Every variant is ≥44px tall (WCAG 2.5.5 target size / Fitts's law).
 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Extra classes for the pressable container (e.g. `flex-1`). */
  className?: string;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  const isPrimary = variant === 'primary';

  const containerClass =
    variant === 'primary'
      ? 'bg-accent py-4'
      : variant === 'secondary'
        ? 'border border-muted-border bg-white py-3.5'
        : 'py-3';

  const textClass =
    variant === 'primary'
      ? 'text-body font-sans-600 text-brand-900'
      : variant === 'secondary'
        ? 'text-label font-sans-600 text-muted-ink'
        : 'text-label font-sans-500 text-muted';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      className={`items-center justify-center rounded-xl ${containerClass} ${className} ${
        disabled || loading ? 'opacity-60' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#0B0E0C' : '#46514B'} />
      ) : (
        <Text className={textClass}>{label}</Text>
      )}
    </Pressable>
  );
}
