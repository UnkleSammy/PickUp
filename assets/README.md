# App assets (designer workstream)

The files in this directory are **placeholder** PNGs (solid brand-900 `#0B0E0C`, or transparent)
committed only so an EAS build does not fail on missing files. **Replace them with real art.**

Brand tokens (see `tailwind.config.js`):
- `brand-900` `#0B0E0C` (near-black charcoal — used for icon/splash backgrounds)
- `brand-700` `#1B211E`
- `accent` `#C9F24B` (volt — pair with `text-brand-900`, never white on volt)

## Required files

| File | Size | Format | Notes |
|------|------|--------|-------|
| `icon.png` | 1024×1024 | PNG, **opaque (no alpha)** | iOS app icon + Android legacy fallback. Apple rejects transparency; round-masking is automatic. |
| `adaptive-icon.png` | 1024×1024 | PNG, **transparent background** | Android adaptive foreground. Keep artwork inside the center ~66% safe zone or Android crops it. |
| `splash-icon.png` | 512×512 (or larger) | PNG, transparent | Centered logo over the splash background; `imageWidth: 200` in `app.json` controls rendered size. |

## Wired in `app.json`

- Top-level `icon` → `./assets/icon.png`
- `android.adaptiveIcon.foregroundImage` → `./assets/adaptive-icon.png`
  - `android.adaptiveIcon.backgroundColor` → `#0B0E0C`
- `expo-splash-screen` plugin → `./assets/splash-icon.png`, `backgroundColor: #0B0E0C`,
  `imageWidth: 200`, `resizeMode: contain`

EAS/Expo generates all store-required sizes from these masters automatically — no per-density
export needed.
