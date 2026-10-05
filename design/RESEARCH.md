# PickUp — Competitive Research Memo

**Design track · Phase 2, item #1 · Author: designer**
**Date:** 2026-10-05 · **Repo:** UnkleSammy/PickUp

This memo grounds the visual identity in what real shipping apps actually do. Every
claim is sourced from something I could reach and verify; anything I could *not*
verify is flagged explicitly rather than inferred.

---

## Method & verification

- **Primary sources:** Apple App Store listings fetched via the public iTunes Search /
  Lookup API (`itunes.apple.com/search` and `/lookup`). These return the publisher's own
  description, ratings, and version metadata — a first-party, verifiable record of what
  each product ships.
- **Secondary sources:** each product's public marketing site (HTML/CSS), where reachable.
- **Not verifiable in this environment:** GoodRec's marketing site (`goodrec.com`) is
  behind a Cloudflare "verify you are human" challenge (HTTP 403) and returned no content;
  the model I run on cannot ingest screenshots, so **live-app visual design (screens,
  motion, iconography-in-context) is not independently verified for any competitor.**
  I describe only what I could read (copy + CSS color/type tokens). Where I note a
  competitor's "feel", it is marked as an impression, not a verified fact.

---

## Teardown 1 — GoodRec (Just Play Apps, Inc.)

**What it is:** "Find pickup games near you in seconds." Live in 70+ cities (US, Canada,
Europe). App Store rating **4.86★ (13,762 ratings)**, v2.1.0. Source: iTunes Lookup
`id1510554246` (description).

- **Trust signals:** Notably **thin** in the public description. There is no mention of
  ratings/reviews, reputation score, verified identity, or no-show tracking. Trust is
  implied via scale ("live in 70+ cities", "all levels, all genders welcome") and via the
  brand promise of "show up and play" — i.e. *the game will actually happen*. GoodRec's
  model is **hosted drop-in** (GoodRec/venue provides the game), so it carries the
  trust burden itself rather than asking players to build reputation.
- **Discovery:** "Find pickup games **near you** in seconds"; "play casual or
  competitive — your call" (a skill/level filter). Positioned around instant, nearby,
  low-friction discovery.
- **Onboarding:** Explicit 3-step loop — "1. Pick your sport and city → 2. Choose your
  game → 3. Show up and play." This is textbook **choice reduction** (Hick's Law): three
  decisions, minimal fields, no profile-building gate before value is delivered.
- **Visual energy:** Not verifiable (Cloudflare-blocked site; no screenshot ingestion).
  *Impression (unverified):* known in-market for a high-energy acid-green/dark treatment.
- **Takeaway for PickUp:** GoodRec optimizes for **zero-friction drop-in**, and its
  reputation surface is conspicuously absent. That is the gap PickUp's `trust_score`
  (post-game ratings + no-show flags) targets: *reliable-regular* discovery is
  under-served by the frictionless leader.

---

## Teardown 2 — Plei "Pick Up Soccer" (Plei, Inc.)

**What it is:** "Find, join, and play pickup soccer games … in just 2 clicks." App Store
rating **4.84★ (12,427 ratings)**, v4.3.1. Source: iTunes Lookup `id1225575821`.

- **Trust signals:** Trust is delivered via **human support**, not reputation mechanics:
  "Communicate with the Plei customer service team immediately through direct messages,
  texts, or phone calls. Giving you peace of mind." "Made by players for players" is the
  social-proof frame (in-group credibility). No player reputation score.
- **Discovery:** "Discover pickup soccer games in your area"; a "game feed for daily
  games in your city"; "find nearby soccer facilities"; game details include "facility
  location, parking, and player info" (logistics up front = reduces uncertainty).
- **Onboarding:** "In just 2 clicks" + reservation with friends/guests + groups ("invite
  entire groups"). Lightweight, social-led onboarding.
- **Visual energy:** Not verifiable in this environment.
- **Takeaway:** Plei's "2 clicks" + "peace of mind" support loop validates PickUp's
  low-friction join *and* shows that trust can be built through **visible organizational
  completeness** (parking, facility, who's playing) — relevant to our roster/game-detail
  surfaces.

---

## Teardown 3 — OpenSports (OpenSports Inc.)

**What it is:** "OpenSports — meetup for sports." The most **reputation-forward**
competitor. App Store rating **4.91★ (2,432 ratings)**, v6.42.0. Source: iTunes Lookup
`id1056940981` (description, truncated in fetch but captured through the "player card"
line).

- **Trust signals (the richest in the set — closest analog to PickUp):**
  - "**Build your playing history on your player card**" — an explicit reputation
    artifact, directly analogous to our `trust_score` + rating history.
  - "**Group reviews**" and "**leaderboard of top group members**" — public, ranked
    reputation.
  - **Attendance is tracked:** "RSVP limits", "automatic waitlist", "**check-in
    attendees**" — i.e. a machine-readable *showed-up / didn't-show* signal (our no-show
    flag, but without the public consequence layer).
  - "Create **invite lists & invite your regulars first**", "suggested invites list
    displays local players", filters for "gender, sport, availability, and level".
- **Discovery:** "Browse and join local sports groups via app or web"; public/private
  groups; "interactive monthly calendar".
- **Onboarding:** Group-join gated; organizer/admin roles; electronic waivers; payments
  (13 currencies) — heavier, organizer-first onboarding.
- **Visual energy:** Public site (`opensports.net`) CSS shows a **green** primary
  `#277a36` on white/black, with Inter / Lato / Montserrat / Outfit typefaces.
- **Takeaway:** OpenSports *proves the premise* of PickUp — playing history, reviews, and
  attendance tracking are real, shipping trust surfaces. Its trust model is
  **organizer-centric and heavy** (payments, waivers, roles). PickUp's opportunity is a
  **player-centric, lightweight trust score** that is legible at a glance.

---

## Teardown 4 — Playo (TechMash Solutions)

**What it is:** "Playo — Sports Community App … Book & Play Sports Near You … 5M+
players." App Store rating **4.57★**, v5.2.3. Source: iTunes Lookup `id1018786950` +
`playo.co` CSS.

- **Trust signals:** Trust is **venue-centric and gamified**, not player-reputation:
  "**verified venues**", "**Trusted by millions of players**" (social proof), and "**Karma
  Points** every time you play or book" (engagement gamification). "Match with people
  based on your sport and **skill level**."
- **Discovery:** "Find and book nearby venues for 50+ sports"; "real-time availability";
  "connect with players near you"; hosted "GameTime" activities.
- **Onboarding:** Book a slot → show up. Venue-booking-led (marketplace), skill-matched.
- **Visual energy:** `playo.co` CSS: primary **green** `#00b562` (+ dark `#00914e`),
  neutral `#3b4540` / `#758a80` / `#f2f2f4`, accent red `#ff2d55`; typeface **Figtree**.
- **Takeaway:** Playo confirms two things: (1) green is the *dominant* primary color in
  this category; (2) a "trust" signal can be hollow (Karma = engagement, not
  reliability). PickUp's differentiation: a *real* reliability score, and a palette that
  doesn't look like every other sports app.

---

## Teardown 5 — TeamSnap (TeamSnap)

**What it is:** "The #1 youth sports team/club/league management platform … 25M users."
App Store rating **4.76★ (60,085 ratings)**, v7.73.0. Source: iTunes Lookup
`id393048976` + `teamsnap.com` CSS.

- **Trust signals:** Trust = **reliable logistics**, not reputation: "Roster management",
  "keep track of player **availability**, so there are no surprises on game day",
  scheduling, chat, "live updates". Attendance/availability is the core reliability
  mechanism — directly analogous to our RSVP → show-up signal.
- **Discovery:** N/A — team/league-scoped (invite-based), not open discovery.
- **Onboarding:** Roster/team-setup led (organizer/parent first).
- **Visual energy:** `teamsnap.com` CSS: **orange** primary `#ff6900` / `#ff5a00`, dark
  ink `#101828`, blue accent `#0066ff`. A classic **warm-accent + navy-ink** athletic
  pairing.
- **Takeaway:** TeamSnap validates the **navy-ink + energetic-accent** convention (credible
  dark base + flashy accent) that PickUp adopts, and shows availability-as-trust at scale.
  It also confirms orange is already "owned" in this category.

---

## Cross-cutting findings (what I'll design against)

1. **Reputation is the whitespace.** GoodRec, Plei, and Playo all skip real player
   reputation; OpenSports has it but heavy/organizer-first; TeamSnap has availability but
   no public reputation. PickUp's `trust_score` + no-show flags are a genuine differentiator.
2. **Green and orange are taken.** Verified: OpenSports `#277a36`, Playo `#00b562`
   (green primaries); TeamSnap `#ff6900` (orange). A **blue/navy primary** is unclaimed
   in the verified set and pairs credibility (blue = competence/trust) with athletic
   convention (blue is the most common sports-uniform color).
3. **Low-friction onboarding is table stakes.** GoodRec's 3 steps and Plei's "2 clicks"
   set the bar; PickUp's signup → game flow must stay in that range (applies later, at
   screen polish).
4. **"Show up and play" is the core promise** — every leader sells *the game will happen*.
   Trust surfaces should reinforce that promise (confirmed rosters, check-ins, ratings),
   which is where the semantic status tokens (success / warning / danger) earn their keep.
5. **Verified ≠ vibes.** I could read each app's *own words* (App Store descriptions) and
   *CSS tokens* (palette/type), but not their live screens or motion. Motion language in
   IDENTITY.md is therefore proposed as a *principle* (grounded in
   expectation-setting/feedback), not copied from an observed competitor.
