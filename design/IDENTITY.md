# PickUp — Visual Identity & Design System

**Design track · Phase 2, item #1 · Author: designer**
**Date:** 2026-10-05 · **Repo:** UnkleSammy/PickUp

Companion to `design/RESEARCH.md`. Every **major** decision below cites its grounding
(named principle, accessibility standard, or a teardown observation). Small details
inherit the system. This is the foundation; screen-by-screen polish follows after lead
approval.

---

## 1. Brand idea

> **"Show up, level up."**

PickUp is the app where **showing up is the whole point** — you literally "pick up" a
game, and you build a reputation by reliably showing up. The identity fuses two forces:

- **Athletic energy** — the *up*: jump shots, spontaneous games, momentum, "come play".
- **Trust** — the *showing up*: reliable, legible, credible. Your `trust_score` is the
  receipt for every game you actually made.

The system resolves the tension by **separating, not blending**: energy lives in the
accent color, the wordmark, and motion; trust lives in the navy base and the clean,
neutral data surfaces.

---

## 2. Wordmark & logo

**Decision: a typographic wordmark. No mascot/illustrated mark.**

**"PickUp"** set in a heavy geometric grotesque, with the **"Up"** in the accent color
(volt) and an integrated **rising underline/arrow** that starts at the baseline under
"Pick" and lifts under "Up".

- The wordmark *is* the concept: "Pick" (choose a game) + "Up" (rise — a jump, a level-up,
  a rising trust score). One mark, two meanings, zero explanation needed.
- **Grounding — why not a generated mascot:** the brief permits a mascot "only if it
  clearly beats a clean wordmark." A self-generated mascot would (a) risk the generic
  "AI-clip-art" look that *undermines* the credibility half of the brand, and (b) add a
  second asset to keep on-model across sizes — a consistency tax. A clean wordmark is
  what the most credible category leaders ship (see TeamSnap's simple logotype). **Social
  proof / brand-trust principle:** people ascribe more trust to clean, confident wordmarks
  than to cartoon mascots (mirrors "less clutter = more competence" found in teardowns).
- **Color in the mark:** "Pick" in `brand-900` ink; "Up" in `accent` volt. Navy carries
  trust, volt carries the flash — the two forces, in the mark itself.

### Icon system

**Decision: Lucide** (`lucide-react-native`, MIT) for all UI icons. **Not** Phosphor.

- **Grounding:** Lucide's single, consistent 2px-stroke outline set reads **clean and
  legible** — the quality the trust surfaces (rosters, ratings) demand — versus Phosphor's
  six-weight system, which is *more expressive* but introduces a per-icon decision surface
  that works against **consistency** (rubric item 4). One set, one stroke weight, zero
  decisions. Also the more widely adopted MIT set (less adoption risk).
- Icons are for UI only; the logo is the typographic wordmark, so the "open-source icons
  only" rule is satisfied without generating any iconography.

---

## 3. Color palette

### Rationale

- **Primary = "Court Navy" (blue ramping to navy).** Grounding: (1) **Color psychology —
  blue is the canonical "competence/trust" hue** (stability, reliability — why banking and
  law lean blue), while also being the single most common **sports-uniform** color, so it
  carries athletic confidence too; (2) **Competitive teardown** — the verified category
  primaries are **green** (OpenSports `#277a36`, Playo `#00b562`) and **orange** (TeamSnap
  `#ff6900`); blue/navy is unclaimed and therefore differentiated; (3) blue supports the
  darkest text shades needed for **WCAG AA** on light surfaces (see ratios below).
- **Accent = "Volt" (acid lime).** Grounding: **the flash must live somewhere, and
  restraint lives everywhere else.** Volt is the highest-energy, highest-visibility
  "go play" signal (the color of Nike/Gatorade "energy" and high-vis sports gear). It is
  used *sparingly* — live states, "come play" CTAs, the "Up" in the mark — so its energy
  doesn't leak onto data surfaces. Differentiated from competitors' *green primaries* by
  being far brighter and yellower (a highlight, not a field green).

### The tokens (all ratios computed against WCAG 2.x, sRGB relative luminance)

| Token | Hex | Role | Key contrast |
|---|---|---|---|
| `brand-900` | `#0C1846` | Ink (wordmark, primary text) | 17.0:1 vs white |
| `brand-800` | `#112463` | Ink alt | 14.4:1 vs white |
| `brand-700` | `#173287` | Emphasized text on light | **11.4:1** vs white · 10.3:1 vs `brand-50` |
| `brand-600` | `#1E42AC` | Secondary emphasis / links | **8.6:1** vs white · 7.8:1 vs `brand-50` |
| `brand-500` | `#2F56C7` | Primary actions | **6.4:1** white-on-`brand-500` |
| `brand-400` | `#5E7FD8` | Large icons / illustrations | — |
| `brand-300` | `#8FA9EA` | Disabled ("+" etc.) | 2.3:1 (disabled UI is exempt — WCAG 1.4.3) |
| `brand-200` | `#B9CCF8` | Decorative | — |
| `brand-100` | `#DCE7FF` | Chips / tinted bg | `brand-700` on it: **9.2:1** |
| `brand-50` | `#EEF3FF` | Tinted surface | `brand-700` on it: **10.3:1** |
| `accent` | `#C9F24B` | Flash / live / "come play" | `brand-900` on it: **13.2:1** · **never** white-on-volt (1.3:1) |
| `success` (DEFAULT / soft / strong) | `#047857` / `#ECFDF5` / `#064E3B` | Confirmed · present · verified | DEFAULT 5.5:1 vs white · strong 9.2:1 on soft |
| `danger` (DEFAULT / soft / strong) | `#DC2626` / `#FEF2F2` / `#991B1B` | No-show · declined · destructive | DEFAULT 4.8:1 vs white · strong 7.6:1 on soft |
| `warning` (DEFAULT / soft / strong) | `#B45309` / `#FFFBEB` / `#78350F` | Waitlist · pending · no-show-risk | DEFAULT 5.0:1 vs white · strong 8.8:1 on soft |
| `muted` (DEFAULT / soft / border / ink) | `#6B7280` / `#F3F4F6` / `#E5E7EB` / `#111827` | Secondary text / surface / hairline / body | DEFAULT **4.8:1** vs white · ink 17.7:1 vs white |

> **WCAG conformance summary:** every *text* pairing the system prescribes meets **AA
> (4.5:1)** for normal text and **AAA (7:1)** for the primary brand-text pairs. The only
> sub-4.5 tokens are `brand-300` (explicitly disabled UI — exempt under WCAG 1.4.3) and
> `accent` (a background/graphic token whose text partner is `brand-900` at 13.2:1).

### Semantic meaning of the status tokens (mapped to the trust model)

- `success` — **showed up / confirmed / rated well.** Positive reputation states.
- `warning` — **waitlist / pending / no-show risk.** Attention, not alarm (amber).
- `danger` — **no-show / declined / destructive.** The public consequence layer.
- `muted` — **secondary data** (timestamps, counts, "X of Y spots"), keeping trust
  surfaces calm and scannable (low visual noise = low cognitive load; **Cognitive Load
  Theory** — secondary info is de-emphasized so the user's attention goes to the signal).

---

## 4. Type scale

**Decision: two families, both SIL OFL (open-source, per brief).**

- **Display — "Archivo"** (weights 600–900) for the wordmark, screen titles, and the big
  scoreboard/timer numerals. **Grounding:** Archivo's slightly squared, tight terminals
  read as a **jersey/scoreboard** grotesque (athletic) while staying geometric and clean
  (credible). Heavy weights give "bold" without decoration.
- **Text — "Inter"** (weights 400–700) for body, labels, and all data/rating surfaces.
  **Grounding:** Inter's tall x-height and open apertures are engineered for **legibility
  at small sizes** — the exact requirement of a trust/rating surface — and it is already
  used in the category (OpenSports ships Inter per the teardown).

> **Note:** font *families* are decided here; font *loading* (via
> `@expo-google-fonts/archivo` + `@expo-google-fonts/inter` + a `fontFamily` token) is a
> small follow-up the engineer should land with the first screen-polish PR. Until then the
> app renders in the system font; the **scale** below is wired now and applies regardless.

### Scale (wired as `fontSize` tokens; sizes in px, tuned for a phone viewport)

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | 34 / 40 | 800 | Live score, hero moments |
| `title` | 28 / 34 | 700 | Screen titles |
| `heading` | 22 / 28 | 700 | Section headings |
| `subheading` | 18 / 26 | 600 | Cards, list titles |
| `body` | 16 / 24 | 400 | Default text |
| `label` | 14 / 20 | 500 | Buttons, form labels |
| `caption` | 12 / 16 | 500 | Meta, timestamps, counts |
| `micro` | 11 / 14 | 600 | Badges, overlines, tab labels |

- **Grounding:** a 1.4–1.5 line-height for body/caption text is within the WCAG 1.4.8
  recommended 1.5 range for readability; sizes stay ≥11px (below ~11px, legibility on
  mobile drops sharply — **legibility/accessibility**). The scale uses an
  8px-spacing-adjacent progression and is intentionally small: fewer sizes = more
  consistent hierarchy (**Hick's Law** / reduced decision surface).

---

## 5. Usage rules (the contract every later screen inherits)

1. **Energy is accent, trust is neutral.** Flashy color (volt, brand-500) appears at
   *decision/action* moments ("Join", "Go live", "come play"). Data surfaces (rosters,
   ratings, trust score) render in `muted`/`ink` + `brand` text on white/`brand-50`.
2. **One icon set** (Lucide), one stroke weight, 24px default, ≥44×44px tap targets
   (**Fitts's Law / WCAG 2.5.5 target size**).
3. **Status always has a text partner.** `success`/`warning`/`danger` chips use
   `-soft` background + `-strong` text (ratios above) — never DEFAULT-on-DEFAULT.
4. **Volt never carries text.** `accent` is background/graphic only; text on it is always
   `brand-900` ink.
5. **Motion is feedback, not decoration** (applies later): transitions announce state
   change (game joined → roster update) — **expectation-setting / feedback principle**
   (Nielsen's visibility of system status) — and are reduced for
   `prefers-reduced-motion` (**WCAG 2.3.3**).

---

## 6. What is NOT verified (honesty ledger)

- Live-app screenshots and motion for **all** competitors (model can't ingest images;
  GoodRec's site is Cloudflare-gated). Visual claims about competitors are limited to the
  CSS tokens I extracted; "feel" statements are labeled impressions.
- The wordmark has not yet been rendered as a shipped asset (it is a *direction* here);
  the first screen-polish PR should include the wordmark asset + font loading.
