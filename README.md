<<<<<<< HEAD
# Emberforge
Emberforge health
=======
# EMBERFORGE

*Thy body is thy covenant. Tend the flame.*

A dark-fantasy strength companion — workout logging, PRs, routines, nutrition,
muscle recovery, achievements, and an AI-ready coach, wrapped in a FromSoftware
aesthetic. Built with Vite, React 19, TypeScript, Tailwind CSS v4, Framer Motion,
Zustand, and Recharts. Installs as a PWA; all data stays on-device.

---

## Quick start (development)

```bash
npm install
npm run dev        # http://localhost:5173
```

## Production build

```bash
npm run build      # type-checks (tsc -b) then bundles to dist/
npm run preview    # serve the production build locally
```

The production build is where the PWA comes alive: service worker, offline
support, install prompt, splash. Always test features there before shipping.

---

## Ship path 1 — Web / installable PWA (fastest, free)

Host the `dist/` folder on any static host (Netlify, Vercel, Cloudflare Pages,
GitHub Pages). Drag-and-drop `dist/` into Netlify and you're live in a minute.
Users on Android/desktop get the "Rest at this Bonfire" install banner;
iOS users use Share → Add to Home Screen. Privacy policy ships at `/privacy.html`.

## Ship path 2 — The actual App Store (Capacitor)

A PWA cannot be submitted to the App Store directly; wrap it with Capacitor:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init Emberforge com.yourname.emberforge --web-dir dist
npm run build
npx cap add ios          # requires a Mac with Xcode
npx cap sync
npx cap open ios         # opens Xcode — set signing team, build, archive
```

App Store submission checklist:

- **Apple Developer account** ($99/yr) and a Mac with Xcode.
- **Icons**: replace the generated `public/pwa-*.png` placeholders with real
  1024×1024 art (`public/icon.svg` is the vector source to render from).
  Xcode needs the 1024 marketing icon; Capacitor's `@capacitor/assets` package
  can generate every size from one file.
- **Screenshots**: 6.7" and 6.5" iPhone sizes minimum. Run in the simulator,
  log a few battles, screenshot the Sanctum / Combat Log / Victory Scroll.
- **Privacy**: point the listing's privacy URL at your hosted `/privacy.html`.
  In App Store Connect's privacy questionnaire, declare **no data collected** —
  it's true, everything is localStorage.
- **Review notes**: mention it works fully offline and no login is required
  (reviewers love that).
- Android/Play Store is the same flow with `npx cap add android` + Android Studio.

## Replacing placeholder art

- `public/icon.svg` — app icon vector (edit freely)
- `public/pwa-192.png`, `public/pwa-512.png` — PWA icons (regenerate from the SVG)
- `public/splash-*.png` — iOS startup images

## Hooking up the AI Fire Keeper

`src/ai/fireKeeper.ts` — replace the body of `seekGuidance()` with the LM Studio
fetch documented at the top of that file. `KEEPER_PERSONA` (system prompt) and
`buildPrompt()` (user prompt from real stats) are already written. Enable CORS
in LM Studio's server tab. In a Capacitor build, point at your machine's LAN IP
instead of localhost.

## Architecture map

```
src/
  state/store.ts       Zustand store — all persisted game state (localStorage)
  state/exercises.ts   canonical exercise catalog (single source of truth)
  state/recovery.ts    muscle fatigue derived from battle history
  state/ritual.ts      onboarding quiz -> plan generation
  state/sigils.ts      achievement definitions + checks
  ai/fireKeeper.ts     AI coach (LLM swap point)
  components/          one file per feature (CombatLog, Dashboard, Grimoire...)
  ui/                  Toast system, sound synth, ErrorBoundary
  pwa/                 install prompt
```

## Known limitations (honest list)

- **Data is per-device.** No accounts/sync; use Settings → Preserve/Restore
  to move saves between devices manually.
- **Switching lb/kg does not convert history** — it changes labels, plate math,
  and the bar; previously logged numbers keep their original magnitude.
- **Vibration** is Android-only (iOS ignores the Web Vibration API).
- Battle history retains the most recent 60 battles; lifetime totals for
  sigils are kept separately and are never lost.
- The Fire Keeper speaks from local heuristics until an LLM is connected.
>>>>>>> aee5201 (EmberForge app source)
