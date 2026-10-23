# PickUp — Data Collection Inventory (Store Data-Safety forms)

> **DRAFT — owner to review and transcribe into the store consoles.** This inventory is a
> code-level audit of what PickUp actually collects, stores, and shares as of the audit date.
> It is the source of truth to fill in **Google Play → Data safety** and the **App Store →
> App Privacy ("nutrition label")** forms, and to author `PrivacyInfo.xcprivacy`. Nothing here
> is invented; every entry cites the code or migration where it was found.
>
> **Audit date:** 2026-10-23 · **Repo:** `/home/team/shared/pickup` (branch at time of audit: `main`)

---

## 0. What the app is (scope)

PickUp is a pre-launch pickup-sports app. It is a **Supabase** (Postgres + Auth + Realtime)
native client built with Expo/React Native. Maps are **Apple Maps** on iOS and **Google Maps**
on Android (`react-native-maps`). Location is **expo-location, foreground-only**.

**Explicitly absent** (verified against `package.json`, `app.json`, and the app code):
no ads, no analytics SDK, no third-party trackers, no crash/diagnostics SDK, no payments,
no push-notification SDK yet, no contacts/photo/health access.

### Code sources audited (where each data flow was found)

| File | What it establishes |
|------|---------------------|
| `lib/supabase.ts` | Supabase client; session persisted on-device via `AsyncStorage`; env config only (no hardcoded secrets). |
| `lib/auth-context.tsx` | `signUp(email, password, username)`; `signIn`; `signOut`; session state. |
| `app/index.tsx` | Auth screen collects **email**, **password**, **username** (sign-up only). |
| `lib/geo.ts` | `expo-location` **foreground** permission + `getCurrentPositionAsync`; graceful fallback to a fixed coordinate on denial. |
| `app.json` | expo-location plugin (when-in-use only, no background); react-native-maps plugin (Android Google Maps key is still a `REPLACE_WITH_…` placeholder). |
| `app/dashboard.tsx` | Uses device location to compute distance → "games near you"; renders map. |
| `app/game-lobby.tsx` | Uses device location for **check-in** (within 200 m); submits **ratings** (`rating_score`, `no_show`). |
| `app/create-game.tsx` | Host enters sport, rules, court (name + coordinates), schedule, roles, player limit, approval toggle. |
| `app/live-match.tsx` | Writes live `game_events` (scores, fouls, timer). |
| `components/GameMap.tsx` | `react-native-maps` tiles — Apple Maps (iOS) / Google Maps (Android, key required). |
| `components/GameMapPicker.tsx` | Court picker is currently a **fixed mock list** (real lat/lng, no geocoder). |
| `supabase/migrations/*.sql` | The database schema — what is actually persisted server-side. |
| `types/database.types.ts`, `types/domain.ts` | Typed shapes confirming the columns above. |

---

## 1. Master inventory (data type → purpose → required/optional → stored → shared)

Legend: **Stored** = persisted on our backend (Supabase). **On-device** = processed locally and
never uploaded. **Required** = the feature can't work without it. **Optional** = the app still
works if you decline.

| # | Data type | Collected via | Purpose | Required / Optional | Where stored | Shared with |
|---|-----------|---------------|---------|---------------------|--------------|-------------|
| 1 | **Email address** | Sign-up / sign-in form | Create & secure account; send confirmation; contact | Required (to have an account) | Supabase Auth (`auth.users`) | Supabase (processor) |
| 2 | **Password** (hash only) | Sign-up / sign-in form | Authenticate you | Required | Supabase Auth (one-way hash — never readable) | Supabase |
| 3 | **Username** | Sign-up form | Public display name on rosters | Required | Supabase `profiles.username` | Supabase |
| 4 | **Account / user ID** (UUID) | Auto-generated at sign-up | Link your profile, games, roster entries, ratings | Required (auto) | Supabase (primary key, all tables) | Supabase |
| 5 | **Precise location** (foreground only) | `expo-location` when dashboard/lobby open | Show nearby games; verify court check-in (~200 m) | **Optional** (deny → fallback) | **On-device only — never uploaded** | Apple Maps (iOS) / Google Maps (Android) for map tiles; not sent to Supabase |
| 6 | **Game details** (sport, court name + coordinates, date/time, rules text, fouls/penalty settings, game format/clock, roles required, player limit, approval toggle) | Host creates a game | Display & run the game | Optional (only if you host) | Supabase `games` | Supabase |
| 7 | **Roster / participation** (game, role, status invited→accepted/declined→checked-in, host-invited flag) | Join / invite / approve flows | Manage rosters & check-in | Optional (only if you join) | Supabase `game_participants` | Supabase |
| 8 | **Live match events** (score: who + points; fouls/penalties; timer start/pause; added time; final score) | Referee/timekeeper during a live game | Run the scoreboard, timer, foul log | Optional (only in live games) | Supabase `game_events` | Supabase |
| 9 | **Post-game ratings** (1–5 stars, "no-show" flag; rater → target) | Post-game rating UI | Compute the trust score on profiles | Optional (only after completed games) | Supabase `ratings` | Supabase |
| 10 | **Trust score** (derived number) | Recomputed from ratings | Reputation shown on profiles | Derived automatically | Supabase `profiles.trust_score` | Supabase |
| 11 | **Auth session token** | Sign-in | Keep you signed in | Required (to stay signed in) | **On-device** (`AsyncStorage`) | Not shared |
| — | Full name (`profiles.full_name`) | **Not collected** — schema column only, no UI writes it | — | — | (empty) | — |
| — | Avatar photo (`profiles.avatar_url`) | **Not collected** — no upload/storage; app shows username initials | — | — | (empty) | — |
| — | Rating comment (`ratings.comment`) | **Not collected** — schema column only, no UI writes it | — | — | (empty) | — |

> **Key honesty note for the forms:** the user's **live** location (#5) is used on-device and is
> **not stored server-side**. The only coordinates stored in the backend are **court locations**
> chosen by a host when creating a game (#6).

---

## 2. Google Play → Data safety form (transcribe this)

Google asks, per data type: **Collected? Shared?** and, if shared, **why / can users request
deletion?** We sell nothing; "shared" below means *shared with a service provider necessary to
run the app*, not sold or used for ads.

| Play category | Sub-type | Collected? | Shared? (with) | Purpose / notes |
|---------------|----------|------------|----------------|-----------------|
| **Location** | Precise | ✅ Yes (foreground, when-in-use) | ✅ Yes — Apple Maps (iOS) / Google Maps (Android) for map display only | App functionality: nearby games + court check-in. **Optional** — app works if denied. Not stored on backend. |
| **Personal info** | Email address | ✅ Yes | ✅ Yes — Supabase (processor) | Account. **Required.** |
| **Personal info** | User IDs | ✅ Yes | ✅ Yes — Supabase (processor) | Auto UUID. **Required.** |
| **Personal info** | Name (username) | ✅ Yes | ✅ Yes — Supabase (processor) | Public roster display. **Required.** |
| **App activity** | Other user-generated content | ✅ Yes | ✅ Yes — Supabase (processor) | Game details/rules/court names, roster state, live scores/fouls, ratings. **Optional** (only if you create/join/rate). |
| **App info & performance** | Crash logs / diagnostics | ❌ No | — | No SDK collects these. |
| **Financial info**, **Health**, **Messages**, **Photos/Videos**, **Audio**, **Files**, **Contacts**, **Web browsing**, **Device/other IDs** | — | ❌ No | — | None of these are collected. |

**Play form answers:**
- **Data collection & sharing:** collected (categories above); shared **only** with service providers (Supabase; Apple/Google map tiles). **No** sale.
- **Data is encrypted in transit:** Yes (HTTPS/TLS to Supabase and map providers).
- **Data deletion request mechanism:** Yes — email (see policy §6); the app does not yet have an in-app delete button.
- **Location:** foreground only; precise; used for app functionality.

---

## 3. App Store → App Privacy ("nutrition label") mapping

Map each collected type to Apple's data-type keys. Purpose for all of them is
**App Functionality** (there is no analytics, advertising, or tracking).

| Apple data type (nutrition label) | Applies? | Detail |
|-----------------------------------|----------|--------|
| **Contact Info → Name** | ✅ Yes | Username (`profiles.username`). `full_name` is reserved but not collected. |
| **Contact Info → Email Address** | ✅ Yes | Sign-up/sign-in email. |
| **Identifiers → User ID** | ✅ Yes | Supabase account UUID. |
| **Location → Precise Location** | ✅ Yes | Foreground/when-in-use only; on-device; optional. |
| **User Content → Other User Content** | ✅ Yes (low volume) | Free-text game rules, court names; structured roster/scores/fouls/ratings. |
| Contact Info → Phone number, Physical address; Purchases; Financial; Health & Fitness; Photos/Videos; Audio; Messages; Contacts; Browsing History; Search History; Device ID; Diagnostics; **Usage Data**; **Other Data** (analytics/advertising) | ❌ No | None collected. |

**App Store "tracking" question:** PickUp does **not** track (no IDFA/GAID access, no
third-party ad SDKs). Answer **No** to tracking.

---

## 4. iOS `PrivacyInfo.xcprivacy` — collected data types + reason codes

Author a `PrivacyInfo.xcprivacy` (or let Expo generate it and edit) declaring **only** these
collected-data-type entries. Every entry: `linked = YES`, `tracking = NO`,
`purpose = AppFunctionality` (add `ProductPersonalization` to Location if you want to reflect
nearby-game sorting; it is not required).

### 4.1 `NSPrivacyCollectedDataTypes` (collected data)

| Key | Value | Linked | Tracking | Purposes |
|-----|-------|--------|----------|----------|
| `NSPrivacyCollectedDataTypeName` | Username | YES | NO | `NSPrivacyCollectedDataTypePurposeAppFunctionality` |
| `NSPrivacyCollectedDataTypeEmailAddress` | Email | YES | NO | AppFunctionality |
| `NSPrivacyCollectedDataTypeUserID` | Account UUID | YES | NO | AppFunctionality |
| `NSPrivacyCollectedDataTypePreciseLocation` | Foreground location | YES | NO | AppFunctionality (optionally + ProductPersonalization) |
| `NSPrivacyCollectedDataTypeOtherUserContent` | Game rules/court names/roster/scores/ratings | YES | NO | AppFunctionality |

> Do **not** declare: Health, Fitness, Financial, Purchases, Contacts, Photos, Audio, Messages,
> Browsing History, Search History, Device ID, Advertising Data, Crash Data, Performance Data,
> or Other Diagnostic Data — the app collects none of them.

### 4.2 `NSPrivacyAccessedAPITypes` (required-reason APIs)

| Key | Applies? | Reason |
|-----|----------|--------|
| `NSPrivacyAccessedAPICategoryLocation` | ✅ **Yes** | `expo-location` (foreground) — used to find nearby games and verify court check-in. |
| `NSPrivacyAccessedAPICategoryUserDefaults` | ❌ **No** (by app code) | The app persists its session via `AsyncStorage` (file-backed), **not** `NSUserDefaults`. Leave out unless a native dependency requires it — verify against Expo's generated manifest, not by assumption. |
| `NSPrivacyAccessedAPICategoryFileTimestamp` | ⚠️ Likely (native deps) | Not called by app code; React Native core/dependencies may read file timestamps. Confirm with Expo's generated `PrivacyInfo.xcprivacy` and keep its entries rather than hand-authoring. |
| `NSPrivacyAccessedAPICategorySystemBootTime` | ⚠️ Likely (native deps) | Same as above — likely from React Native core, not app code. |
| `NSPrivacyAccessedAPICategoryDiskSpace` | ⚠️ Possibly (native deps) | Same as above. |

> **Guidance:** run `npx expo prebuild` (or use EAS) to generate the default
> `PrivacyInfo.xcprivacy`, then ensure §4.1's collected-data entries are declared and that the
> required-reason API entries match what Expo reports for your dependency set. Do not invent
> reason codes for APIs the app does not call.

---

## 5. Checklist before submitting to either store

- [ ] Confirm the contact email and legal entity in `PRIVACY_POLICY.md` and host it at the live URL.
- [ ] In Google Play Console → Data safety: transcribe §2 exactly (Precise location = foreground, optional; shared with Supabase + map providers; no sale).
- [ ] In App Store Connect → App Privacy: transcribe §3 (Name, Email, User ID, Precise Location, Other User Content — all App Functionality; **No** to tracking).
- [ ] Author/verify `PrivacyInfo.xcprivacy` per §4 and ship it in the iOS build.
- [ ] Confirm the Android Google Maps key is provisioned **before** launch (currently a placeholder in `app.json`); once active, Google Maps receives map-tile data on Android as disclosed.
- [ ] Remember there is no in-app "delete account" control yet — the forms should point deletion to the support email until a self-serve flow ships.
