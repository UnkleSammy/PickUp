# PickUp — Production Build & Store Submission Plan

> **Status:** working plan (scaffolded config, not yet exercised). Authored 2026-10-16 by the
> engineering delegation. This is a written plan the owner can act on — no credentials are wired in,
> and no EAS build has been run.
>
> **Companion scaffold (already in this PR):** `eas.json`, the `ios.*` / `android.*` / plugin /
> asset additions in `app.json`, placeholder PNGs in `assets/`, and the `expo-splash-screen`
> dependency.

---

## 0. Owner must provide / decisions (read this first)

Everything below is blocked or gated on a short list of owner-provided items. What we can do now
(config, docs, code) is already done in this PR. What we cannot do until the owner acts:

| # | Owner must provide / decide | Needed for | Cost (confirm before paying) |
|---|------------------------------|------------|------------------------------|
| 1 | **Confirm app identifiers** — `com.pickup.app` (iOS bundle id + Android package) is the proposed placeholder. Reverse-DNS from a domain you own is preferable. Both must be globally unique on their respective store. | First build | $0 |
| 2 | **Apple Developer Program** account (org + an App ID / cert) | iOS builds & App Store | ~$99/yr (confirm current price) |
| 3 | **Google Play Console** account | Android builds & Play listing | $25 one-time (confirm current price) |
| 4 | **Google Maps Android API key** (Google Cloud) | Android maps (react-native-maps) | Usage-based; free tier exists |
| 5 | **APNs auth key** (.p8) — *deferred*, only for push | iOS remote push | $0 (needs Apple account) |
| 6 | **FCM service account** JSON — *deferred*, only for push | Android remote push | $0 (needs Google Cloud) |
| 7 | **App icon + adaptive icon + splash art** (designer workstream, next) | Store-ready look | Designer time |
| 8 | **Privacy policy URL** (public, hosted) | Both stores require it | $0 (host on our site) |
| 9 | **Decide OTA strategy** (add `expo-updates` + EAS Update — recommended) | JS-only releases w/o store resubmit | EAS has a free tier |
| 10 | **Supabase env values per EAS profile** (see §7) | Builds talk to the right backend | $0 |

**Decisions the lead/owner should ratify:** the identifiers (§2) and whether to adopt `expo-updates`
now or later (§8). Everything else is a credential to supply, not a design decision.

> **Naming note (flag to lead):** the team's `.env` and `lib/supabase.ts` use
> `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the anon/publishable key). An earlier brief referred to
> `EXPO_PUBLIC_SUPABASE_KEY`; that name does not exist in the codebase. This doc uses the real name.

---

## 1. Build pipeline — EAS

PickUp has outgrown plain "Expo Go on a device" for anything that touches native modules we don't
ship in the Expo Go runtime. We move to **EAS Build** (Expo Application Services), which compiles
the native iOS/Android projects in the cloud and produces installable artifacts. No local Xcode or
Android Studio toolchain is required.

Three build profiles are scaffolded in `eas.json`:

| Profile | `distribution` | Purpose | Who installs it | Store? |
|---------|----------------|---------|-----------------|--------|
| `development` | `internal` (`developmentClient: true`) | A **dev client** build — connects to a local dev server (`npx expo start --dev-client`) for fast JS iteration with the full native module set. | Dev team, on registered devices | No |
| `preview` | `internal` (`channel: "preview"`, Android APK) | A **near-release** build for QA / beta testers / the first pickup community. No dev server. | Internal testers (iOS needs device registration; Android is a sideloadable APK) | No |
| `production` | `store` (`channel: "production"`, `autoIncrement: true`) | The **store submission** build (iOS .ipa / Android .aab). | Public | Yes |

### Dev client vs. Expo Go — the tradeoff

- **Expo Go** is fine today: everything we currently use (`expo-router`, NativeWind, reanimated,
  `react-native-maps` for iOS/Android via the Expo Go prebuilt runtime, `expo-location`, fonts,
  Supabase) is present in the Expo Go SDK 57 runtime. Continue using it for screen/JS work.
- **We outgrow Expo Go the moment we add a native module that isn't in the Expo Go runtime.**
  The first one on our roadmap is **push notifications** (`expo-notifications`). `expo-updates`,
  `expo-dev-client`, and `expo-secure-store` would also require a dev/production build.
- Once that happens, switch the team to **dev clients** (`eas build --profile development` →
  `expo start --dev-client`). A dev client is a custom build of *our* app with the dev menu; it's
  what Expo Go is to the SDK, but for our exact native dependency set.

**Commands the owner/lead will run (after adding credentials):**

```bash
npm i -g eas-cli          # or npx eas-cli
eas login                 # requires an Expo account (free)
eas whoami
# link the project to an EAS project (creates an app on expo.dev):
eas init
# iOS / Android dev client, preview APK, or store build:
eas build --profile development
eas build --profile preview
eas build --profile production
```

No `eas build:configure` needed — `eas.json` is hand-written (and intentionally not run here, since
there is no Expo account on this machine).

---

## 2. App identifiers (PROPOSED — owner confirm)

Both identifiers are placeholders and must be **globally unique** per store (iOS bundle IDs and
Android package names are each claimed across the entire store, not per account).

- **iOS `ios.bundleIdentifier`:** `com.pickup.app`
- **Android `android.package`:** `com.pickup.app`

Recommendation: if you own a domain (e.g. `pickupapp.com`), prefer a reverse-DNS identifier such as
`com.pickupapp.app` (or `app.pickupapp`) to reduce collision risk and signal ownership. `pickup` is
a common word, so `com.pickup.app` may already be taken — treat it as a working default until you
confirm availability in **App Store Connect → Identifiers** and **Play Console → create app**.

Also scaffolded (will auto-increment on production builds):
- `ios.buildNumber`: `"1"` (CFBundleVersion)
- `android.versionCode`: `1` (must be a positive integer; `autoIncrement: true` in the production
  profile bumps it per store build)

---

## 3. Code signing & accounts

### iOS — Apple Developer Program (~$99/yr — confirm current price)

- **Owner provides:** an Apple Developer membership, an **App ID** (matches `com.pickup.app`), and
  accepts the cert/provisioning profile creation.
- **EAS handles:** generating/managing **distribution certificates** and **provisioning profiles**
  automatically when you run `eas build`. On first iOS build, EAS prompts you to create these via
  your Apple login (or `eas credentials`). **Ad-hoc** profiles (development/preview) require each
  test device's UDID to be registered; EAS walks you through device registration.
- iOS builds can also use **TestFlight** (via `eas submit`) for beta distribution without UDID
  gymnastics — recommended once an App Store Connect app exists.

### Android — Google Play Console ($25 one-time — confirm current price)

- **Owner provides:** a Play Console account and a new app entry with package `com.pickup.app`.
- **EAS handles:** the **upload keystore**. On first Android build EAS generates a keystore and
  stores it in EAS secrets (or you can bring your own). **Guard this keystore** — losing it means
  you can never update the app on Play. EAS-managed is the safe default.

**Split summary:** owner supplies the *accounts* and clicks "allow"; EAS generates the *certs,
profiles, and keystore* and stores them in EAS (not in the repo).

---

## 4. Maps credential (react-native-maps)

- **iOS:** uses **Apple Maps by default — no API key needed.** (Confirmed from the
  `react-native-maps` config plugin source: it only injects a Google Maps key on iOS if you opt into
  Google Maps via `useGoogleMaps`/`apiKey`.) We do not opt in, so iOS needs nothing.
- **Android:** requires a **Google Maps Android API key** (Google Cloud → enable "Maps SDK for
  Android" → create API key). The scaffold references it in `app.json`:

  ```json
  ["react-native-maps", {
    "androidGoogleMapsApiKey": "REPLACE_WITH_GOOGLE_MAPS_ANDROID_API_KEY"
  }]
  ```

  **`REPLACE_WITH_GOOGLE_MAPS_ANDROID_API_KEY` is a placeholder — not a real key.** Replace it with
  the real key before the first Android build that needs maps. Until then the Android build still
  succeeds; map tiles just won't render.

  **Credential inventory entry:** Google Maps Android API key (restrict it by Android package
  `com.pickup.app` + your release SHA-1 in Google Cloud to prevent abuse).

  *Cleaner alternative (recommended, follow-up):* convert `app.json` → `app.config.js` and read
  `process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`, supplying the value via EAS env so the key
  never sits in git. Not done now to keep the change config-only; documented here so the lead can
  pick it up.

---

## 5. Push notifications (deferred until launch credentials exist)

Remote push is a native capability. **Expo Go cannot do real remote push** — the Expo Go app is
signed with Expo's own bundle id and has no entitlement for *our* app's push. The moment we add
push, **a dev/production build becomes mandatory.**

What's needed when we get there:

- **iOS:** an **APNs authentication key** (`.p8`) from the Apple Developer portal. EAS stores it and
  sets the `aps-environment` entitlement.
- **Android:** a **Firebase Cloud Messaging (FCM) service account** JSON from Google Cloud. EAS uses
  it to mint push credentials for the Play build.
- **Code:** add `expo-notifications` (currently *not* installed, deliberately deferred).

Until push ships, the app uses in-app/realtime updates (Supabase Realtime) — no native push required.

---

## 6. Icons / splash (designer workstream — next)

The scaffold references placeholder assets (solid brand-900 `#0B0E0C` PNGs) so a build won't fail on
missing files. **The designer replaces these with real art** — this is a separate workstream. Actual
requirements:

| File (in `assets/`) | Size / format | Notes |
|---------------------|---------------|-------|
| `icon.png` | 1024×1024 PNG, **opaque (no alpha)** | iOS app icon + Android legacy fallback. Apple rejects transparency; it round-masks for you. |
| `adaptive-icon.png` | 1024×1024 PNG, **transparent background** | Android adaptive foreground. Keep the artwork within the center ~66% (safe zone) or Android crops it. |
| `splash-icon.png` | ~512×512 PNG, transparent | Centered logo on the splash `backgroundColor`. `imageWidth: 200` in the plugin controls rendered size. |

- EAS/Expo generates every store-required size from these masters automatically.
- Brand colors already wired: splash/adaptive background `#0B0E0C` (brand-900). Accent `#C9F24B`
  (volt) is available for artwork.
- See `assets/README.md` for the exact list the designer should produce.

---

## 7. Environment variables per profile

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are read by `lib/supabase.ts` at
build time (the `EXPO_PUBLIC_` prefix makes Expo inline them into the JS bundle).

- **Local dev (Expo Go):** read from `.env` (git-ignored). Already working.
- **EAS builds:** `.env` is not committed, so EAS won't see it. The owner must supply the same two
  values per profile via **EAS project environment variables** — either the dashboard
  (Settings → Environment variables) or:

  ```bash
  eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "<url>" --environment production
  eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>" --environment production
  ```

  (repeat with `--environment preview` / `development` as needed, or set once for all).

- **These two values are public by design.** `EXPO_PUBLIC_SUPABASE_ANON_KEY` is the *publishable
  anon key* — safe to ship in a client bundle (Supabase RLS is the security boundary, not the key).
- **The Supabase service_role key must NEVER appear in the app or in `EXPO_PUBLIC_*`.** It stays
  server-side only (Edge Functions / backend), exactly as it does today. There is no service key in
  the scaffold.

If the team later wants per-profile backends (staging vs prod Supabase), set different values per
EAS environment — no code change needed.

---

## 8. OTA updates (expo-updates + EAS Update) — recommend adding

**Recommendation: adopt `expo-updates` + EAS Update.** It lets us ship JS-only changes (bug fixes,
UI tweaks, non-native logic) to already-installed apps **without a store review/resubmit**. Native
changes (new modules, new permissions) still require a rebuild.

**Not wired in this PR** (deliberately, to keep the change clean): adding it requires installing
`expo-updates` (`npx expo install expo-updates`) *and* adding `updates` config to `app.json`, plus
`eas update` usage. Half-wiring it (config without the package) would break builds, so it's left as
an explicit follow-up. The `channel` values (`preview` / `production`) are already present in
`eas.json`, so wiring updates later is a drop-in.

Follow-up steps when adopted:
1. `npx expo install expo-updates`
2. Add to `app.json`:
   ```json
   "updates": { "url": "https://u.expo.dev/<project-id>", "fallbackToCacheTimeout": 0 }
   ```
   and the `expo-updates` plugin entry. `<project-id>` comes from `eas init` / the EAS dashboard.
3. Publish JS: `eas update --branch production --message "..."`.

---

## 9. CI (optional — recommendation only)

Recommendation, not a build-out: trigger builds from GitHub Actions using
[`expo/eas-build-action`](https://github.com/expo/expo-github-action) so every merge to `main` can
start a preview build. Requires an Expo access token (stored as a GitHub secret) and adds the
`EXPO_PUBLIC_SUPABASE_*` values as GitHub secrets. Defer until the team is shipping regularly; for
now `eas build` from a laptop is enough.

---

## 10. Store submission checklists

### Apple — App Store Connect (blocked on Apple account)

1. Create the App ID (`com.pickup.app`) and the App Store Connect app.
2. **Privacy:** Expo SDK 51+ auto-generates the required **PrivacyInfo.xcprivacy** manifest; add
   declarations for `expo-location` (location) and confirm `react-native-maps` (Apple Maps) data
   use. Provide the privacy policy URL.
3. **Content rating:** complete the age-rating questionnaire.
4. **Screenshots:** 6.7" (and optionally 6.5" / iPad) sets — needs real device/designer screenshots.
5. **Build:** `eas build --profile production` then `eas submit --platform ios` (or upload the
   `.ipa` via Transporter/Xcode).
6. **Review notes / demo account:** provide a test account and notes for App Review.

### Android — Play Console (blocked on Play account)

1. Create the app with package `com.pickup.app`.
2. **Data safety form** (mirrors iOS privacy). **Content rating** questionnaire.
3. **Screenshots + feature graphic + app icon** (designer assets).
4. **Privacy policy URL** (required).
5. **Build:** `eas build --profile production` produces an `.aab`; `eas submit --platform android`.

### "Blocked on owner" vs. "we can do now"

- **Blocked on owner credentials:** actually running any build/submit, creating store listings,
  Apple cert/App ID, Play app entry, the Google Maps Android key, APNs/FCM (deferred).
- **We can do now (and did):** the config scaffold (`eas.json`, `app.json`), placeholder assets,
  this plan, and — as the next non-credentialed workstream — the designer's icon/splash set.

---

## Appendix — what changed in this PR

- `eas.json` (new): `development` / `preview` / `production` profiles + `submit`.
- `app.json`: added `icon`, `ios.bundleIdentifier`, `ios.buildNumber`, `android.package`,
  `android.versionCode`, `android.adaptiveIcon`, the `expo-splash-screen` plugin (with brand-900
  splash config), and the `react-native-maps` plugin with the Android key placeholder.
- `assets/` (new): placeholder `icon.png`, `adaptive-icon.png`, `splash-icon.png` (solid brand-900
  / transparent) + `assets/README.md`.
- `package.json` / `package-lock.json`: added `expo-splash-screen@~57.0.10` (required for the
  splash plugin to resolve).

**Verification done:** `npx expo config --type public` resolves cleanly (correct identifiers,
plugins, permissions); `npm run typecheck` passes. No EAS build run, no Expo login attempted, no
credentials committed.
