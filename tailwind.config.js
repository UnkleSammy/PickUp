/**
 * PickUp — NativeWind v4 design tokens.
 *
 * This is the single source of truth for the design system (see design/IDENTITY.md).
 * Tokens are additive: existing `brand-*`, `gray-*`, `red-*`, `amber-*`, `emerald-*`
 * usages keep resolving, and the new semantic tokens are available for future screens.
 *
 * Palette + contrast ratios are documented (and verified) in design/IDENTITY.md.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary brand — "Street Court": a warm near-black charcoal scale (the
        // "black = credible" layer) with a subtle sage/asphalt undertone. Light warm-gray
        // tints (50–300) are surfaces/chips/avatars/disabled; mid-charcoal (400–500) is
        // icons, buttons, borders — `brand-500` carries white text; near-black ink
        // (600–900) is text. Ratios are computed (WCAG 2.x) in design/IDENTITY.md.
        brand: {
          50: '#F3F5F3',
          100: '#E5E9E6',
          200: '#D0D7D2',
          300: '#AAB3AE',
          400: '#6E7973',
          500: '#46514B',
          600: '#3A4340',
          700: '#1B211E',
          800: '#121613',
          900: '#0B0E0C',
        },

        // Accent — "Volt": the flash/energy layer. Backgrounds and large graphics only.
        // Always pair with `text-brand-900` (ink) for readable text — never white on volt.
        accent: '#C9F24B',

        // Semantic status colors. `.soft` = tinted background, `.strong` = accessible
        // text on `.soft` AND on white, `DEFAULT` = icon / fill / border / accent text.
        success: {
          DEFAULT: '#047857',
          soft: '#ECFDF5',
          strong: '#064E3B',
        },
        danger: {
          DEFAULT: '#DC2626',
          soft: '#FEF2F2',
          strong: '#991B1B',
        },
        warning: {
          DEFAULT: '#B45309',
          soft: '#FFFBEB',
          strong: '#78350F',
        },

        // Neutral — "muted" grays for secondary text, surfaces, and hairline borders.
        // `ink` is the near-black for primary body text; `DEFAULT` is secondary text.
        muted: {
          DEFAULT: '#6B7280',
          soft: '#F3F4F6',
          border: '#E5E7EB',
          ink: '#111827',
        },
      },

      // Type scale (see design/IDENTITY.md §Type). Named steps map to `text-<name>`.
      // Sizes and line-heights tuned for a phone viewport.
      fontSize: {
        display: ['34px', { lineHeight: '40px' }],
        title: ['28px', { lineHeight: '34px' }],
        heading: ['22px', { lineHeight: '28px' }],
        subheading: ['18px', { lineHeight: '26px' }],
        body: ['16px', { lineHeight: '24px' }],
        label: ['14px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px' }],
        micro: ['11px', { lineHeight: '14px' }],
      },

      // Font families (see design/IDENTITY.md §Type). Each custom font is loaded as a
      // distinct family per weight (see app/_layout.tsx `useFonts`), because React Native
      // does not auto-select a weight variant from a single family name — `fontWeight`
      // alone cannot switch between individually-loaded .ttf files. The `font-display` /
      // `font-sans` utilities therefore carry the *weight baked into the family token*,
      // matching the type scale's weight column. `display` = Archivo (600–900), `sans` =
      // Inter (400–700).
      fontFamily: {
        display: 'Archivo_800ExtraBold', // canonical display weight (800)
        'display-600': 'Archivo_600SemiBold',
        'display-700': 'Archivo_700Bold',
        'display-800': 'Archivo_800ExtraBold',
        'display-900': 'Archivo_900Black', // wordmark weight
        sans: 'Inter_400Regular', // canonical body weight (400)
        'sans-500': 'Inter_500Medium',
        'sans-600': 'Inter_600SemiBold',
        'sans-700': 'Inter_700Bold',
      },
    },
  },
  plugins: [],
};
