# PickUp — App-Store Listing Copy & Content-Rating Answers

> **Purpose:** paste-ready copy for App Store Connect (iOS) and Google Play Console
> (Android). Every claim is grounded in the shipped app (`app/`, `lib/`, `types/`) and the
> Street Court brand (`design/IDENTITY.md`, `tailwind.config.js`). Nothing here is invented.
> Where a field is store-computed or owner-supplied, it is marked `[OWNER]`.
>
> **Status:** pre-launch. No ads, no payments, no push notifications, no live users.
> Screenshots are deferred to on-device capture (see §5) — this doc is the shot list + copy.
>
> **Companions:** `docs/DATA_SAFETY_INVENTORY.md` (data-safety / nutrition-label forms) and
> `docs/PRIVACY_POLICY.md` (the policy URL both stores require).

---

## 0. Grounding (why this copy reads the way it does)

- **Lead line "show up / build your rep."** The brand's core is *"Show up, level up."*
  (`design/IDENTITY.md` §1): showing up is literally the point, and `trust_score` is "the
  receipt for every game you actually made." Copy that leads with reputation — not features —
  is the only truthful headline for an app whose differentiator *is* reliability, not an
  organizer-heavy feature set (matches the business plan's "player-centric, lightweight
  trust legible at a glance").
- **Feature copy = the actual mechanics.** Every feature bullet maps 1:1 to a shipped flow:
  `app/dashboard.tsx` (nearby games + map), `app/create-game.tsx` (formats, roles, limits,
  approval), `app/game-lobby.tsx` (roster, invite/approve, check-in, ratings), and
  `app/live-match.tsx` (timer/scoreboard/foul log). See §4 of `docs/PRODUCTION_BUILD.md`.
- **No hype, no unverifiable claims.** No download counts, no "best/fastest/top-rated,"
  no invented social proof — per the Acceptable Use bar and because there are no live users
  to back any such claim yet. The description promises only what the code does.

---

## 1. App name & iOS subtitle

| Field | Value | Notes |
|---|---|---|
| **App name** | **PickUp** | Confirmed — `app.json` `expo.name` is `PickUp`. Keep exactly this casing (capital P, capital U). |
| **iOS subtitle** | **Show up. Play. Build your rep.** | **30 characters** (the hard limit). One sharp value line. |

**Subtitle alternatives** (only if Apple's counter reads the 30-char string as over, or the
owner wants a "find" lead):

- `Find a game. Build your rep.` — 28 chars.
- `Find a game. Show up. Build rep.` — 32 chars (over limit — do not use).

---

## 2. Descriptions

### 2.1 Short description (Google Play, ≤80 chars)

> **Find local pickup games, join a roster, and build your rep by showing up.**

**73 characters** (within the 80 limit). Play renders it as a tagline.

### 2.2 Full description (App Store + Google Play, ~150–300 words)

> **PickUp is for people who actually show up.**
>
> Find a pickup game near you, get on the roster, and turn your reliability into a
> reputation you can actually see.
>
> **Find your game**
> • Browse basketball, soccer, football, volleyball, and tennis games near you on a real
>   map, or scan the list sorted by distance.
> • Join open games, or get invited and accept — hosts keep control of the roster.
>
> **Run it like a real game**
> • Hosts pick the format: halves, quarters, custom periods, a single running clock, or
>   run-to-score.
> • Referees and timekeepers go live with a shared timer, scoreboard, and foul log that
>   sync in real time.
> • Soccer added time and dead-ball stoppages are a tap away.
>
> **Build your rep**
> • After the game, rate what actually happened — including no-shows. It all feeds your
>   visible trust score, so showing up pays off.
>
> Free, no ads, no in-app purchases. Just games, and people who show up.

**~170 words.** Truthful to the shipped app: the five sports are the exact `SPORTS` list in
`app/create-game.tsx`; "run-to-score" is `format: 'first_to'`; "added time / dead-ball
stoppages" are the `running_added` / `stopped` clock modes; "visible trust score" is
`profiles.trust_score` surfaced in the lobby.

---

## 3. Keywords & category

| Field | Value |
|---|---|
| **Primary category** | **Sports** (both stores) |
| **Secondary category (iOS, optional)** | None / leave unset |

### iOS keywords (≤100 chars, comma-separated)

> `basketball,pickup basketball,soccer,football,volleyball,tennis,find games,rec league,hoops,street`

**97 characters.** Notes:

- `PickUp` and `Sports` are **excluded** — Apple already indexes the app name and category.
- Multi-word phrases (`pickup basketball`, `find games`, `rec league`) are included because
  that is how this audience searches; Apple splits them into single terms automatically.
- `hoops` / `street` capture the basketball-first pickup audience without eating much of the
  budget.

---

## 4. Content-rating questionnaire answers

**Headline answer: every content category is None/No.** PickUp contains no user-to-user
messaging, no media upload, no links out, and no embedded browser. The only user-authored
text is host-entered game details (rules text + court name), which is single-user-entered
and displayed to other players — there is no chat, DM, comment, or rating-text surface.

> **UGC verification (done, not assumed):** a code grep across `app/` and `components/` for
> `chat|message|dm|comment|direct|inbox|conversation` returns **zero matches**. The database
> has a `ratings.comment` column, but **no UI writes it** — ratings are structured only
> (1–5 stars + a no-show flag). See `docs/DATA_SAFETY_INVENTORY.md` §1. Therefore there is
> no free-form user-to-user content to moderate, and no age-rating category is triggered by UGC.

### 4.1 Ready-to-transcribe table (both stores)

| Category (Apple phrasing / Google phrasing) | Answer |
|---|---|
| Cartoon or Fantasy Violence / Violence | **None** |
| Realistic Violence | **None** |
| Prolonged Graphic / Sadistic Realistic Violence | **None** |
| Profanity or Crude Humor / Language | **None** |
| Mature / Suggestive Themes / Sexuality | **None** |
| Sexual Content or Nudity | **None** |
| Horror / Fear Themes | **None** |
| Alcohol, Tobacco, or Drug Use / References / Controlled Substances | **None** |
| Simulated Gambling / Gambling | **None** |
| Real-money Gambling & Contests | **No** |
| Medical / Treatment Information | **None** |
| Discrimination / Hate Speech | **None** |
| Unrestricted Web Access | **No** (no embedded browser / webview; no links out) |

### 4.2 Apple App Store Connect — extra answers

- **User Generated Content:** the app is **not** chat/messaging/social — answer "No" to the
  UGC/messaging questions in review, or if Apple flags the free-text rules field, describe it
  accurately: *"hosts enter a short free-text rules description and a court name when creating
  a game; there is no user-to-user messaging, commenting, or media upload."*
- **Age rating result:** expected **4+**. No content descriptors.

### 4.3 Google Play Console — extra answers (IARC questionnaire)

- **Users interact?** **Yes** — users join games, are invited/approved, and rate one another
  (structured ratings only; no chat/messages).
- **Shares location?** **Yes** — precise foreground location, used to show nearby games and
  verify check-in; sent to Apple Maps (iOS) / Google Maps (Android) for map tiles only, not
  stored on the backend.
- **Digital purchases / In-app purchases?** **No** (no payments are implemented).
- **Ads?** **No**.
- **Content rating result:** expected **Everyone (E)**, no descriptors.
- **Target audience & content (store listing, separate from rating):** general audience,
  **not** designed for children; no child-directed appeal. The app uses email sign-up and has
  no age gate today — if the owner wants to formally restrict to 13+, add the age screen and
  re-answer.

> These answers mirror `docs/DATA_SAFETY_INVENTORY.md` §2 (Play Data safety) and §3
> (Apple nutrition label). Keep the two forms consistent with this doc.

---

## 5. Screenshots plan (shot list + captions — captures deferred)

Actual captures are deferred until the owner can run the app on a device. This is the
**ordered shot list** to fill both stores' phone sets (Apple 6.7" primary; Google Play phone
screenshots). Capture in light mode, on the Street Court palette (charcoal/ink + volt
`#C9F24B` CTA; Archivo numerals on the scoreboard) so the set reads as one brand.

| # | Screen (route) | What it communicates | Caption (store) |
|---|---|---|---|
| 1 | **Match Finder** — `app/dashboard.tsx` | The entry point: real map + nearby games sorted by distance. | "Find pickup games near you on a real map." |
| 2 | **Game Lobby** — `app/game-lobby.tsx` | Roster control, roles (ref/timekeeper), check-in, invite/approve. | "Roster, roles, and check-in — hosts stay in control." |
| 3 | **Live Match** — `app/live-match.tsx` | The live product moment: shared timer, scoreboard, foul log. | "Go live: timer, scoreboard, and foul log in real time." |
| 4 | **Post-game ratings + trust score** — `app/game-lobby.tsx` (completed state) | Reputation: rate who showed, see your trust score. | "Rate the game. Your trust score is your receipt for showing up." |
| 5 | **Create a Game** — `app/create-game.tsx` | Configurability: sport → format → roles → location. | "Host a game: pick the format — halves, quarters, or run-to-score." |

**Screenshot do's & don'ts:**

- Use the demo/seed data (`scripts/seed-demo.mjs`) for consistent, realistic rosters — do
  **not** fabricate user counts, ratings, or "1,000+ players" badges.
- Keep the volt CTA visible in at least shots 1–3 (the "Join / Go live" flash moments) so the
  brand accent lands.
- Apple wants 5–8 screenshots; these 5 are sufficient. Google Play also wants a **feature
  graphic** (1024×500) and an **app icon** — reuse the shipped Street Court icon/splash art
  from `assets/` (see `docs/PRODUCTION_BUILD.md` §6).

---

## 6. What the owner must still supply (not in this doc's scope)

- **Privacy policy URL** — host `docs/PRIVACY_POLICY.md` publicly and paste the URL into both
  consoles (both require it).
- **Contact email / legal entity** — for the policy and store contact fields.
- **Review notes + demo account** (App Store) — a test account and note for App Review.
- **Google Maps Android API key** — currently a `REPLACE_WITH_…` placeholder in `app.json`
  (see `docs/PRODUCTION_BUILD.md` §4); required before the Android launch build.
