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
        // Primary brand — "Court Navy": royal blue (athletic energy) ramping to
        // deep navy (credibility/trust). `brand-500` is the primary action color;
        // `brand-600/700` are legible text on light surfaces; `brand-800/900` are ink.
        brand: {
          50: '#EEF3FF',
          100: '#DCE7FF',
          200: '#B9CCF8',
          300: '#8FA9EA',
          400: '#5E7FD8',
          500: '#2F56C7',
          600: '#1E42AC',
          700: '#173287',
          800: '#112463',
          900: '#0C1846',
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
      // Sizes and line-heights tuned for a phone viewport; weights are applied via
      // the existing `font-*` utilities rather than baked into the size token.
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
    },
  },
  plugins: [],
};
