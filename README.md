# EMBERFORGE

*Thy body is thy covenant. Tend the flame.*

A dark-fantasy strength companion — a workout and body-recomposition tracker reskinned as a FromSoftware-style RPG. Log "battles" with the iron, earn souls, break records, keep your streak, forge the Golden Taper, and outfit a Hoard of relics. It installs as a PWA and works fully offline; **all data stays on your device** — no accounts, no cloud, no tracking.

Built with Vite 8, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Zustand, and Recharts.

---

## Features

**The Sanctum (dashboard)**
- Character sheet with inline "Amend Measurements" editing (bodyweight, body fat, waist, shoulders, chest, derived lean mass).
- An anatomical front/back **muscle heatmap avatar** — muscle groups light ember with the work you log and cool over ~48h; tap one for a recovery reading.
- **The Golden Taper** — live shoulder-to-waist ratio toward the golden 1.618, folded into the Covenant system.
- **Echoes of Ash** — a 12-week GitHub-style rune grid of daily tonnage.
- Weight ledger, recent battles, the Souls Ledger chart, and sigils.

**The Combat Log**
- Template battle plans (the Grimoire) and custom routines.
- Swipeable set rows with automatic estimated-1RM, PR detection, ghost prefill from your last session, an inline **Plate Blacksmith** (per-side plate math), and a **Bloodstain** toggle to mark failed attempts.
- A **Bonfire Rest Timer** (burning ring, +30s / Skip, screen-edge pulse on zero).
- A cinematic **Victory Overlay** on End Battle — "GREAT ENEMY FELLED", a tonnage-fed XP bar, spoils, PR badge — and a shareable **Victory Scroll** (rendered to an image at story size).

**Estus Rations (nutrition)**
- Estus-flask calorie fill, macro bars, a searchable food codex, and the **Strict Covenant** filter (chicken-exclusive, high-protein, mayonnaise banished).
- **The Cauldron** — craft, save, edit, and one-tap-log custom meals from codex items or manual macros, with an optional photo → AI calorie estimate (bring your own vision key; falls back to manual).

**The Fire Keeper** — a coach that reads your battle history, plus **The Fading Flame** auto-deload counsel when a lift stalls while its muscles stay fatigued.

**The Codex** — the exercise library with FromSoft-toned form cues and looping-video slots.

**The economy**
- **Souls & XP/levels** earned per battle (volume → souls, sets/PRs → XP).
- **The Hoard** — a persistent inventory of relics, trophies, titles, and cosmetics, styled by rarity.
- **Loot drops** — items drop from real milestones: a level-up table and first-time PR thresholds. A few relics carry *real* effects (+% souls, +% XP, faster recovery) that apply in the reward and recovery paths.
- **The Merchant** — spend souls to buy relics (prices scale with rarity; owned uniques sell out).
- **Covenants** — trackable quests whose progress derives live from real data (level, PRs, battles logged, streak, macro-days, taper). Complete one to claim souls + a relic through the same loot path.

**Hollowed Mode** — a spectral ash-and-bone reskin of the whole app (manual toggle in the header/Settings, and auto-triggered by the Curse of Hollowing after idle days).

**PWA** — standalone manifest, offline service worker, install prompt, splash screens, and a forged flame icon set (including the alpha-free 1024 App Store marketing icon).

---

## Quick start (development)

```bash
npm install
npm run dev        # http://localhost:5173
```

## Production build

```bash
npm run build      # type-checks (tsc -b) then bundles to dist/
npm run preview    # serve the production build at http://localhost:4173
npm run lint       # oxlint
```

The production build is where the PWA comes alive: service worker, offline support, install prompt, splash. Tab views are code-split, so the initial bundle stays small and each tab loads on demand.

---

## Ship path 1 — Web / installable PWA (fastest, free)

Host the `dist/` folder on any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages). Users on Android/desktop get the "Rest at this Bonfire" install banner; iOS users use Share → Add to Home Screen. Privacy policy ships at `/privacy.html`.

## Ship path 2 — The App Store (Capacitor)

A PWA cannot be submitted to the App Store directly; wrap it with Capacitor. **The full walkthrough — including building from Windows via a cloud Mac, App Store Connect steps, and rejection-risk mitigations — lives in [`docs/PUBLISHING.md`](docs/PUBLISHING.md).** `capacitor.config.json` is already in the repo root (change `appId` before first submission — it's permanent). Short version:

```bash
npm install @capacitor/core
npm install -D @capacitor/cli
npm run build
npx cap add ios          # creates the ios/ Xcode project
npx cap sync
npx cap open ios         # on a Mac: set signing team, build, archive
```

App Store checklist:

- **Apple Developer account** ($99/yr) and a Mac with Xcode.
- **Icons** — the marketing art is already forged: `public/AppStore-1024.png` (1024×1024, no alpha) is the App Store icon; `public/icon.svg` is the vector source and `public/pwa-*.png` / `apple-touch-icon.png` cover the rest.
- **Screenshots** — 6.9" and 6.5" iPhone sizes. Log a few battles, capture the Sanctum / Combat Log / Victory overlay.
- **Privacy** — point the listing's privacy URL at your hosted `/privacy.html`; in App Store Connect declare **Data Not Collected** (it's all localStorage).
- **Review notes** — it works fully offline and needs no login.
- Android/Play Store is the same flow with `npx cap add android` + Android Studio.

---

## Architecture map

```
src/
  App.tsx              shell, view switching, Hollowed-Mode sync, lazy-loaded tabs
  state/store.ts       Zustand store — all persisted state (localStorage 'emberforge-save')
  state/exercises.ts   canonical exercise catalog (single source of truth)
  state/recovery.ts    muscle fatigue derived from battle history (+ relic recovery perks)
  state/ritual.ts      onboarding quiz -> plan generation
  state/sigils.ts      achievement definitions + checks
  state/items.ts       Hoard catalog, rarity, effects, drop tables, Merchant stock
  state/quests.ts      Covenant catalog + live progress derivations
  state/deload.ts      The Fading Flame — overreaching detection
  ai/fireKeeper.ts     coach (LLM swap point)
  ai/vision.ts         optional photo -> macro estimate (bring-your-own key)
  components/          one file per feature (CombatLog, Dashboard, TheHoard,
                       TheCovenants, TheCauldron, EchoesOfAsh, VictoryOverlay, ...)
  ui/                  Toast system + context, sound synth, ErrorBoundary
  pwa/                 install prompt
```

State that persists (no `partialize` — the whole store is saved): profile, vitals, xp/souls, PRs, battles, rations, saved meals, weigh-ins, settings, routines, **inventory**, **claimedQuests**, and install-dismissed.

---

## Data & privacy

Everything lives in `localStorage` on the device. There is no backend and no analytics. Move a save between devices with **Settings → Preserve / Restore**. The App Store privacy answer is genuinely "Data Not Collected."

## The AI Fire Keeper (optional)

`src/ai/fireKeeper.ts` ships with local heuristics. To connect a real LLM, replace the body of `seekGuidance()` with a fetch to your model (the persona and prompt-builder are already written). In a Capacitor build, point at your machine's LAN IP instead of localhost.

## Photo calorie estimate (optional)

`src/ai/vision.ts` will appraise a food photo if you store a personal OpenAI-compatible vision key on the device (a field in the Cauldron). Without a key, the photo capture falls back to manual entry — no fabricated numbers. Calling a vision API straight from the browser can hit CORS and exposes the key client-side; for a shipped app, proxy it.

---

## Known limitations (honest list)

- **Data is per-device.** No accounts/sync; use Settings → Preserve/Restore to move saves.
- **Switching lb/kg does not convert history** — it changes labels, plate math, and the bar; logged numbers keep their original magnitude.
- **Vibration** is Android-only (iOS ignores the Web Vibration API).
- Battle history keeps the most recent 60 battles; lifetime totals for sigils are tracked separately and never lost.
- The Fire Keeper speaks from local heuristics until an LLM is connected.

## Roadmap

- **Boss Encounters** — milestone challenge workouts with bonus souls and unique sigils.
- **The Constellation** — a souls-spent skill tree of passive perks.
- **The Rite of Ascension** — a full New Game+ / prestige endgame.
