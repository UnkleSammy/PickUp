# PickUp — Alternative Brand Directions

**Design track · Follow-up to `IDENTITY.md` · Author: designer**
**Date:** 2026-10-05 · **Repo:** UnkleSammy/PickUp

**Why this exists.** The owner rejected the navy-primary direction ("I don't like the
navy, let's try something else"). This memo proposes **four distinct, grounded
alternatives**, none blue/navy-dominant. It is a **palette/identity exploration only**:
no token changes and no screen changes until the owner picks — `tailwind.config.js`,
`global.css`, and all screens are untouched.

**What is *not* re-litigated.** Everything the owner did *not* reject carries over
unchanged, per `IDENTITY.md` / `RESEARCH.md`:

- the brand idea ("Show up, level up") and the **trust-vs-energy** tension (energy lives
  in color/motion; trust lives in clean, neutral data surfaces);
- the **typographic wordmark** ("PickUp", "Up" in accent, rising underline);
- **Lucide** as the single icon set (one stroke weight, 24px default, ≥44px targets);
- the **type scale** (`display`…`micro`) and the **Archivo + Inter** family choice;
- the **semantic status model** (success = showed up, warning = waitlist, danger =
  no-show) and its `.soft`-background + `.strong`-text chip contract.

Only the **palette** changes between directions. Every hex below is a candidate; contrast
ratios are computed against **WCAG 2.x sRGB relative luminance** (same method as
`IDENTITY.md`) and rounded to two decimals.

---

## The four directions at a glance

I deliberately spaced these to cover the whole field the brief asks for, laid out on two
axes — **light base ↔ dark base** and **electric flash ↔ earned warmth**:

| # | Direction | One-line feel | Primary | Accent |
|---|---|---|---|---|
| 1 | **Street Court** | near-black charcoal + volt-lime | `#0B0E0C` | `#C9F24B` |
| 2 | **Court Heat** | hot cinnabar on warm white | `#C0361A` | `#0F766E` (pool teal) |
| 3 | **Volt Forward** | volt as the hero, on black | `#CFFF04` | `#FF5C1C` (safety orange) |
| 4 | **Championship Gold** | black + earned gold | `#141008` | `#E0B04A` |

---

## Direction 1 — "Street Court"

**Feel:** *near-black charcoal + a single hot volt-lime flash — a night court under a
streetlight.*

### Palette

| Token | Hex | Role | Key contrast |
|---|---|---|---|
| `ink` | `#0B0E0C` | Base / primary text on light | **19.40:1** vs white |
| `base-900` | `#121613` | Dark surface (app chrome, cards) | **18.26:1** white-on |
| `base-800` | `#1B211E` | Elevated surface | — |
| `base-700` | `#3A4340` | Borders / emphasis on light | **10.21:1** vs white |
| `base-50` | `#F3F5F3` | Light surface (data, rosters) | **17.71:1** `ink`-on |
| `muted` | `#8B938D` | Secondary text on dark | **5.79:1** on `base-900` |
| `accent` (volt) | `#C9F24B` | Flash / live / "come play" | **15.05:1** `ink`-on · **14.16:1** vs `base-900` |

- **Semantic/status:** unchanged (emerald success / amber warning / red danger), rendered
  as the existing light `.soft` pill + `.strong` text so the chips stay legible on both
  dark cards and light surfaces. No hue shift needed — a light pill on a black card is
  high-contrast by construction.
- **The one hard rule (carried from IDENTITY.md):** volt never carries text — white-on-volt
  is **1.3:1** (illegal). Volt's text partner is always `ink` (`#0B0E0C`), at **15.05:1**.

### Differentiation vs. the verified category
The category primaries are **green** (OpenSports `#277a36`, Playo `#00b562`) and **orange**
(TeamSnap `#ff6900`). This is the only **dark-first** palette in the verified set — no
competitor leads with a near-black base. Volt is a *yellow-green highlight*, not a
field/pitch green, so it reads "high-vis / night court" rather than "grass."

### Grounding
- **Color psychology — black = authority/credibility:** black is the canonical hue of
  formality, authority, and "performance" gear (Nike, Under Armour, On running). Leading
  with near-black makes the app read *premium and credible* — the trust half — while
  keeping the athletic "kit" connotation.
- **Salience / Von Restorff effect:** a single high-vis accent on a near-black field is the
  highest-attention placement possible (volt-on-charcoal is **14.16:1** — it *pops* more
  than on any light background). That makes "Join / Go live / come play" unmissable at the
  exact decision moment, while data surfaces stay neutral — the energy/trust separation
  the brief demands, maximized.
- **Teardown observation:** this matches the in-market *impression* of the pickup leader
  GoodRec (acid-green on dark), so it is a proven pickup-native look — but our volt+charcoal
  pairing is differentiated from GoodRec's by carrying a *real* trust surface on top.

### Type
**Archivo (display, Black 900 for the wordmark) + Inter (text) still work.** Archivo's
squared, tight terminals read as a jersey/scoreboard stencil on dark — the exact athletic
register this direction wants. **No change.**

---

## Direction 2 — "Court Heat"

**Feel:** *a hot cinnabar primary on warm white, cooled by a single teal trust accent.*

### Palette

| Token | Hex | Role | Key contrast |
|---|---|---|---|
| `ink` | `#2A0F0A` | Warm near-black (body text, wordmark "Pick") | **17.93:1** vs white |
| `ember-700` | `#7C2414` | Emphasized text on light | **9.91:1** vs white · **8.98:1** on `ember-50` |
| `ember-600` | `#A52F1A` | Secondary emphasis / links | **6.95:1** vs white |
| `ember-500` | `#C0361A` | **Primary action** (buttons, "come play") | **5.55:1** white-on (AA) |
| `ember-400` | `#F06A3B` | Bright coral (large icons / illustration) | 3.07:1 white-on — **graphic only** |
| `ember-50` | `#FEF1EE` | Tinted surface | `ember-700`-on: **8.98:1** |
| `accent` (pool) | `#0F766E` | Trust counterpoint — verified / trust_score highlight | **5.47:1** white-on (AA) · **4.96:1** on `ember-50` |
| `accent-strong` | `#115E59` | Accent text on light | **7.58:1** vs white |

- **Semantic/status:** unchanged (emerald/amber/red). Amber *harmonizes* with the warm
  primary rather than clashing; keep it for warning to preserve the familiar status
  language.

### Differentiation vs. the verified category
Sits nearest **TeamSnap's orange** (`#ff6900`) — so this is the direction I must justify.
It stays distinct because: (1) **TeamSnap's orange is bright and must sit on dark ink**
(white-on-`#ff6900` ≈ 2.9:1, non-conformant for normal text), whereas our cinnabar is
**deeper and redder**, so it carries white text at **5.55:1 AA**; (2) TeamSnap pairs orange
with a **navy** ink — ours pairs with warm near-black + **teal**, so there is no navy
anywhere; (3) "hot ember" reads as *heat*, not "safety orange."

### Grounding
- **Color psychology — red-orange = arousal & energy:** red/orange is the highest-arousal
  hue family, which is why it dominates competitive-sport identity (passion, aggression,
  urgency). A *deep* cinnabar keeps the energy without the alarm — a controlled burn
  rather than a warning sign (distinguishing the primary from our own `danger` red).
- **Cool-counterpoint = competence:** the teal accent carries the trust signal using the
  same competence-hue logic that originally led to navy (blue-green = calm, reliable) but
  is **unclaimed** in the category and is distinct from the rejected navy. Warm energy +
  cool trust = the two forces, each with its own hue.
- **WCAG discipline:** the action color is chosen *specifically* so white text clears AA
  (5.55:1) — a deliberate accessibility-driven color selection, not a default.

### Type
**Archivo + Inter still work.** Archivo's geometric squared forms hold their own next to a
warm field; no display change needed. (A rounder display is *not* recommended — it would
soften the "heat.")

---

## Direction 3 — "Volt Forward"

**Feel:** *volt-lime elevated from accent to hero, on a near-black base — maximum flash,
maximum "go play."*

### Palette

| Token | Hex | Role | Key contrast |
|---|---|---|---|
| `ink` | `#0A0B07` | Warm near-black (all text on volt / light) | **19.74:1** vs white |
| `volt` | `#CFFF04` | **Primary / hero** (header bars, primary buttons, "Up" in mark) | **16.88:1** `ink`-on · **1.17:1** white-on (forbidden) |
| `volt-dark` | `#3A3D2E` | Text on light surfaces | **11.13:1** vs white |
| `volt-tint` | `#EAFBD3` | Light surface (data, rosters) | **18.08:1** `ink`-on |
| `base-900` | `#1A1C11` | Dark surface | **17.24:1** white-on |
| `muted` | `#A9B2AC` | Secondary text on dark | **9.07:1** on `ink` |
| `accent` (safety) | `#FF5C1C` | Rare "more heat than volt" moments (live pulse, no-show-risk ring) | **6.39:1** on `ink` · 3.09:1 white-on — **graphic only** |

- **Semantic/status:** unchanged hues, but note two proximity risks I am flagging honestly:
  (1) the safety-orange accent sits near **warning** amber and **danger** red — it must be
  used only as a *graphic ring/pulse*, never as text-on-orange (3.09:1 is non-conformant);
  (2) volt is a yellow-green, so the **success** green stays clearly greener/darker to avoid
  confusion with the brand color.

### Differentiation vs. the verified category
Volt is *adjacent* to the category's greens — so I acknowledge it directly. The verified
greens are **field/mint greens** (OpenSports `#277a36` forest, Playo `#00b562` mint) that
read *calm/booking*. Volt `#CFFF04` is a **high-vis yellow-green** (the ANSI Z535 / ISO
3864 "safety" hue): far brighter and yellower, so it reads *live, alert, high-energy* —
not a pitch. On black it's the canonical Nike/Gatorade volt play, and **no verified
competitor leads with volt**, so it is still differentiated even inside a "green-adjacent"
category.

### Grounding
- **Color psychology + high-vis safety standard:** yellow-green is the highest-visibility
  hue to the human eye under both daylight and low light (why safety vests and tennis balls
  are volt) — the single best fit for "bold, athletic, **flashy**." Elevated to hero it
  delivers the maximum energy of any option here.
- **Restraint as the trust signal:** volt-forward only stays *credible* because of the hard
  rule — **volt never carries white text** (1.17:1) and all copy sits on near-black ink
  (16.88:1). The discipline of pairing maximal flash with strict legibility is itself a
  trust move: it signals "high-energy, but engineered." (This is the same
  **trust-through-restraint** logic as IDENTITY.md's usage rules, turned up one notch.)
- **Teardown observation:** this is the most "drop-in pickup native" of the four — the
  GoodRec acid-green/dark *impression* — so it immediately signals "pickup game" to the
  target user, while our trust surfaces differentiate us from GoodRec's thin reputation.

### Type
**Archivo at Black 900 works**, and Inter stays. **This is the one direction where a
*condensed* display is genuinely worth considering** — a condensed grotesque (e.g. Oswald,
SIL OFL) would amplify the "speed/flash" read. *Recommendation: keep Archivo now* (don't
re-litigate the scale); flag Oswald as a candidate **only if** the owner picks Volt Forward.

---

## Direction 4 — "Championship Gold"

**Feel:** *warm black + earned gold on cream — the "you built this" direction.*

### Palette

| Token | Hex | Role | Key contrast |
|---|---|---|---|
| `ink` | `#141008` | Warm near-black (body text, wordmark "Pick") | **18.96:1** vs white |
| `gold` | `#E0B04A` | **Accent / hero** (buttons, "Up", trust_score highlight) | **9.46:1** `ink`-on |
| `gold-deep` | `#D8A01F` | Gold on dark / large fills | **8.10:1** `ink`-on |
| `gold-700` | `#8A5A0B` | Gold *text* on light (links, emphasized) | **5.92:1** vs white · **5.30:1** on cream |
| `cream` | `#F7F2E7` | Warm neutral surface (data, rosters) | **16.99:1** `ink`-on |
| `muted` | `#5C5A52` | Secondary text | **6.91:1** vs white |

- **Semantic/status:** unchanged hues. **One honest flag:** `warning` amber sits close to
  gold — they must never be confused, so warning always keeps its distinct amber `#B45309`
  + `#FFFBEB` soft pill + warning icon, and **gold is never used for any status**. Gold is
  reserved for *earned reputation* (trust_score) and brand moments only.

### Differentiation vs. the verified category
Gold/black is **unclaimed** in the verified set (green and orange are taken; navy is
rejected). It is the only direction whose hero color is *not* a hue the category already
uses — maximum differentiation with zero adjacency risk.

### Grounding
- **Color psychology — gold = prestige & earned value:** gold is the universal "achievement/
  excellence" hue ("gold standard," medals, trophies). This is the only direction where the
  hero color **literally symbolizes the product's core mechanic** — `trust_score` is
  *earned* by showing up and being rated well, and gold is the color of *earned* reputation.
  That is a tight brand-to-mechanic mapping, not a vibe.
- **Social proof / credibility framing:** "gold standard" is itself a credibility idiom, and
  championship gold + black is the palette of winners (Olympic medals, championship rings) —
  it signals *trustworthy and excellent* to a community of regulars who value reliability.
- **Black + cream neutral = calm data:** the cream surface (`#F7F2E7`) gives the rating/
  roster surfaces warmth without noise, keeping them scannable (Cognitive Load Theory — the
  secondary data is de-emphasized so attention goes to the signal).

### Type
**Archivo + Inter still work** (athletic continuity). **Optional, flagged not decided:** a
*serif* display (e.g. Fraunces, SIL OFL) would add "prestige/championship" and make gold
read more "earned," but it reads less sporty — so the default is to **keep Archivo**. Raise
only if the owner wants more "premium" than "athletic."

---

## Cross-cutting notes (apply to whichever the owner picks)

1. **Volt never carries text** in D1/D3 (and, if used, D2) — its text partner is always the
   near-black ink (≥15:1). White-on-volt is non-conformant and is a hard failure.
2. **Semantic chips are direction-agnostic**: keep the existing light `.soft` pill +
   `.strong` text. It reads identically on dark and light cards, so status language stays
   stable across the pick. Only the *proximity* flags above (D3 volt-vs-success, D4
   gold-vs-warning) need attention.
3. **The wordmark adapts, not changes:** "Pick" in ink, "Up" in the accent (volt, cinnabar,
   volt, or gold respectively). The concept, type, and rising-underline are unchanged.
4. **Archivo + Inter carry through all four.** Only D3 (optional condensed) and D4 (optional
   serif) even raise a type question — and both default to *keep* Archivo.

---

## Honesty ledger

- Contrast ratios are computed, not estimated (WCAG 2.x sRGB relative luminance; same method
  as `IDENTITY.md`), but they are *candidate* hexes — final tokens get re-verified when the
  owner picks and we wire `tailwind.config.js`.
- Competitor "feel" statements remain the same verified/unverified split as `RESEARCH.md`:
  first-party App Store copy + CSS tokens are verified; GoodRec's look is an *impression*
  (Cloudflare-gated, no screenshot ingestion).
- The optional display faces (Oswald / Fraunces) are proposals flagged for the lead, not
  decisions — they are not part of the settled type scale.

### Designer's lean (opinion, for the lead's context only)
**Street Court (D1)** is the strongest fit for "bold, athletic, flashy — yet credible": it
maximizes the energy/trust separation (black = credible, volt = flash), is the only
dark-first option (differentiated from every verified competitor), and keeps the one asset
that survived the rejection — the volt accent — while dropping only the navy. The owner
decides; this is just my read against the brief.
