# PickUp — Privacy Policy

> **DRAFT — FOR THE OWNER TO REVIEW (AND IDEALLY HAVE LEGALLY REVIEWED) BEFORE PUBLISHING.**
>
> This document was prepared by the engineering team from a line-by-line audit of the
> PickUp codebase and database schema. It describes only what the app actually collects and
> stores today — nothing more. It has **not** been legally reviewed and is not a substitute for
> legal advice. Before submitting PickUp to the App Store or Google Play, the owner should:
>
> 1. Replace every `[PLACEHOLDER]` below (contact email, legal entity name, effective date).
> 2. Have the final text reviewed by counsel (privacy laws vary by jurisdiction).
> 3. Host this page at the privacy-policy URL you enter into both store consoles.
>
> **Last updated:** `[DATE — owner to set]` &nbsp;·&nbsp; **Effective date:** `[DATE — owner to set]`

---

## 1. Who we are

PickUp ("we", "us", "our") is a mobile app for organizing and running pickup sports games:
players find and join local games, hosts manage rosters, and referees/timekeepers run a live
match with a shared timer, scoreboard, and foul log.

**Contact:** `[privacy@pickup.app]` — replace with a monitored mailbox.
**Operator:** `[LEGAL ENTITY NAME AND ADDRESS — owner to fill in]`.

If you have a privacy question or request, email us. We aim to respond within 30 days.

---

## 2. Data we collect

We collect only what the app needs to do its job. The list below is what the app actually
collects, based on a code audit. We do **not** show ads, run analytics, embed third-party
trackers, process payments, or sell data.

### 2.1 Account data (you provide at sign-up)

| Data | How it's collected | Stored where |
|------|--------------------|--------------|
| **Email address** | You type it when creating or signing into your account (required). | Supabase Auth |
| **Password** | You type it. It is stored only as a one-way hash; we can never read it. | Supabase Auth |
| **Username** | You type it at sign-up (required, 3–20 letters/numbers/underscores). Shown to other players on rosters. | Supabase `profiles` table |
| **Account ID** | An internal identifier (UUID) created automatically for your account. It links your profile, games, roster entries, and ratings together. | Supabase (primary key on all tables) |

Note: the database has reserved fields for a **full name** and an **avatar/photo**, but the
current app does **not** collect either — there is no prompt for a real name and no photo
upload. Avatars shown in the app are initials generated from your username.

### 2.2 Location (when in use, on your device)

The app requests **foreground-only ("while using the app")** location permission. It uses
your device location to:

- sort and show **games near you** (the dashboard), and
- verify **court check-in** — you can only check into a game when you are within about 200 m
  of the court, during the 30 minutes before or after the scheduled start.

Your location is processed **on your device only**. The app does **not** upload or store your
live location on our servers. The only coordinates stored on our servers are the **courts'
locations**, which a host picks when creating a game — not your personal position.

Location is **optional**: if you deny permission, the app still works and simply falls back to
a fixed default location for sorting (nearby-games and check-in features are then less useful).
You can change this at any time in your device's Settings.

### 2.3 Game and gameplay data (created as you use the app)

When you create or join games, we store the content you and other players produce:

- **Game details you create as a host** — sport, court name and court coordinates, date/time,
  rules text, foul/penalty settings, game format/clock, whether an extra referee or timekeeper
  is required, a player limit, and whether join requests need host approval.
- **Roster / participation** — which games you've joined or been invited to, your role
  (player / referee / timekeeper), and your status (invited → accepted/declined → checked in).
- **Live match events** — scores (who scored, how many points), fouls/penalties, timer
  start/pause and added time, and the final score.
- **Post-game ratings** — after a completed game you've checked into, you can rate other
  checked-in players with a 1–5 star score and flag a "no-show." These feed a **trust score**
  shown on player profiles. (A free-text comment field exists in the database but the app does
  not currently collect written review comments.)

### 2.4 Data the app does **not** collect

To be explicit: no contacts, no photos/videos, no health or fitness data, no financial data,
no messages/DMs, no advertising identifiers, no browsing history, and no background location
tracking.

### 2.5 Device-local data

When you sign in, an authentication session (a token that keeps you signed in) is stored on
your device using the operating system's local storage. It is removed when you sign out.

---

## 3. How we use your data

We use the data described above to provide the service, and for no other purpose:

- **Account data** — to create and secure your account, let you sign in, and identify you
  across the app (your username appears on game rosters).
- **Location** — on-device only, to show you nearby games and to verify check-in at a court.
- **Game and gameplay data** — to display and run games: rosters, invites/approvals,
  scoreboards, timers, foul logs, and the trust score derived from post-game ratings.

We do **not** use any of it for advertising, profiling for ads, or automated decisions with
legal or similarly significant effects.

---

## 4. Legal basis for processing

We process your data on the following legal bases (plain-language summary):

- **Your consent** — you choose to create an account (providing email and username), and you
  separately choose to grant location permission. You can withdraw consent at any time (sign
  out / request deletion, and revoke location in your device Settings).
- **Legitimate interests / performance of the service** — operating the games you take part in
  (roster management, scoring, ratings, and the trust score) is necessary for the app to
  function and is what you'd reasonably expect when using PickUp. We balance this against your
  rights and keep the data minimal.

If you are in the EEA/UK, the bases above correspond to GDPR Art. 6(1)(a) (consent) and
Art. 6(1)(b)/(f) (performance of a contract / legitimate interests).

---

## 5. How we share data (processors and service providers)

We do **not sell or rent personal data**, and we do not share it for advertising.

We share data only with the service providers necessary to run the app, under data-processing
terms:

| Provider | What it handles | What it may receive |
|----------|-----------------|---------------------|
| **Supabase** | Hosts our database, authentication, and realtime sync (the backend the app talks to). | All account, game, roster, event, and rating data listed in §2 — as our data processor. |
| **Apple Maps** (iOS) | Renders the map of games on your screen. | Map tile requests, which can include the game court coordinates and, when shown, your on-device location dot. |
| **Google Maps** (Android) | Renders the map of games on Android once a Google Maps key is configured. | Map tile requests, which can include the game court coordinates and, when shown, your on-device location dot. |

There are **no** ad networks, analytics SDKs, or other third-party trackers in the app.

---

## 6. Retention and deletion

We keep your data for as long as your account exists, so you can continue using PickUp.

**Deleting your account and data:** the current version of the app does not yet have a
self-serve "delete account" button. To delete your account and personal data, email us at
`[privacy@pickup.app]` and we will delete it (typically within 30 days). If you'd like, we can
also confirm once deletion is complete.

When you delete your account:

- Your account, profile, and your personal identifiers are removed.
- Where you **participated** in a game (as a player/referee/timekeeper), your roster entry is
  removed.
- Where you **hosted** a game that other players joined, the game record may need to remain so
  those players' game history stays coherent — in that case we will remove your personal
  profile and anonymize your link to the game, or delete the game entirely, at your request.

You can also simply **sign out** at any time, which removes the session token from your device
(but not your account).

---

## 7. Your rights

Depending on where you live, you may have rights to:

- **Access** — a copy of the personal data we hold about you.
- **Correct** — fix inaccurate or incomplete data.
- **Delete** — request erasure of your personal data (see §6).
- **Withdraw consent** — revoke location permission or delete your account at any time.
- **Object / restrict** — in some jurisdictions, object to or limit certain processing.
- **Portability** — receive your data in a machine-readable format (EEA/UK).
- **Non-discrimination** — exercise these rights without retaliation (California).

If you are in the EEA/UK, you may also lodge a complaint with your local data-protection
authority. We don't sell data and don't "share" it for cross-context behavioral advertising,
so there is nothing to opt out of on that front.

To make a request, email `[privacy@pickup.app]`. We'll need to verify it's really you before
acting on it.

---

## 8. Children

PickUp is not directed at children under 13 (or the applicable minimum age in your region),
and we do not knowingly collect personal data from them. If you believe a child has created an
account, contact us and we'll delete it.

---

## 9. Changes to this policy

If we change this policy, we'll update the "Last updated" date at the top and, for material
changes, notify you in the app or by email. Your continued use after a change takes effect
means you accept the updated policy.

---

## 10. Contact

Questions about this policy or your data: email **`[privacy@pickup.app]`** (replace with a
monitored mailbox). We'll respond as soon as we can and within any legally required timeframe.
