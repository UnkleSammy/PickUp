import { Text, View } from 'react-native';

/**
 * The PickUp typographic wordmark: "Pick" + "Up" set in Archivo Black with the
 * integrated rising underline from design/IDENTITY.md §2.
 *
 * - "Pick" carries the charcoal ink; "Up" carries the volt flash. Together they
 *   encode the brand idea "show up, level up" in the mark itself.
 * - This is a *logotype*, so the volt "Up" on a light surface is exempt from
 *   WCAG 1.4.3 contrast minimums (the "logotype" exception). It is never used as
 *   running UI text — headings/labels elsewhere use the AA-verified pairings.
 */
interface WordmarkProps {
  /**
   * Surface the mark sits on. `light` renders the canonical ink/volt mark for
   * light surfaces; `dark` inverts "Pick" to near-white so it stays legible on
   * charcoal (brand-900 ink on brand-900 is invisible).
   */
  tone?: 'light' | 'dark';
  /** Override the type-scale size (defaults to `text-title`). */
  className?: string;
}

export default function Wordmark({ tone = 'light', className = 'text-title' }: WordmarkProps) {
  const pickColor = tone === 'dark' ? 'text-brand-50' : 'text-brand-900';

  return (
    <View className="items-start">
      <Text className={`font-display-900 ${pickColor} ${className}`}>
        Pick
        <Text className="text-accent">Up</Text>
      </Text>
      {/* Rising underline: starts under "Pick", lifts under "Up" (a subtle -3° rise). */}
      <View
        className="-mt-0.5 h-1 w-16 rounded-full bg-accent"
        style={{ transform: [{ rotate: '-3deg' }] }}
      />
    </View>
  );
}
