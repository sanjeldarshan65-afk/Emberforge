# Publishing Emberforge to the App Store

The honest map from this repo (developed on Windows) to a live App Store listing. The web app is submission-ready; what remains is wrapping it in a native iOS shell, building that shell on a Mac, and walking App Store Connect. Companion doc: `app-store-listing.md` (this folder) has every listing field pre-written within Apple's caps.

---

## 0. What you need (one-time)

| Requirement | Why | Cost |
|---|---|---|
| Apple Developer Program account | Required to submit anything | $99/year |
| Access to macOS + Xcode | iOS binaries can only be built/signed by Xcode | see options below |
| A public URL for the privacy policy | App Store Connect requires one | free (GitHub Pages works) |

**macOS options from a Windows machine**, in order of least friction:

1. **A borrowed/owned Mac** — even an old one that runs a current-ish Xcode.
2. **Codemagic or Bitrise** (CI clouds with macOS runners) — free tiers exist; they build, sign, and upload to App Store Connect from a Git repo without you ever touching a Mac. Codemagic has first-class Capacitor support.
3. **GitHub Actions `macos` runner** — free minutes for public repos; more setup (fastlane) but fully scriptable.
4. **MacinCloud / rented cloud Mac** — hourly remote desktop into a Mac.

Signing on CI needs an **App Store Connect API key** (Users and Access → Integrations) plus a **distribution certificate**; Codemagic can generate/manage both for you.

---

## 1. Wrap the web app with Capacitor

Capacitor puts the built `dist/` inside a native WKWebView shell. Apple accepts these when the app feels native and substantial — Emberforge does (offline, installable, no browser chrome, rich interaction). `capacitor.config.json` is already in the repo root (app id `com.emberforge.app` — change it if you own a domain; it must match the Bundle ID you register with Apple and **cannot change after first release**).

On any machine (Windows is fine for this part):

```bash
npm i @capacitor/core
npm i -D @capacitor/cli
npm run build              # produces dist/
npx cap add ios            # creates the ios/ Xcode project (commit it)
npx cap sync               # copies dist/ + config into ios/
```

After every web change: `npm run build && npx cap sync`.

Notes specific to this app:

- **Data**: the save lives in `localStorage` (`emberforge-save`). Inside a Capacitor shell this persists like normal app data and is included in device backups. No change needed for v1. (Optional hardening later: mirror the save through `@capacitor/preferences`.)
- **Service worker / PWA plugin**: harmless inside the shell; the app just loads locally. Leave as is — the same build still works as a web PWA.
- **Icons & splash**: `public/AppStore-1024.png` is the 1024×1024, alpha-free marketing icon Apple requires. Use `@capacitor/assets` to generate the full native icon/splash set from it:
  ```bash
  npm i -D @capacitor/assets
  npx capacitor-assets generate --ios --iconBackgroundColor '#0a0806' --splashBackgroundColor '#0a0806'
  ```
- **Status bar**: `viewport-fit=cover` + the app's safe-area padding already handle the notch. If the status-bar text needs forcing to light, add `@capacitor/status-bar` and call `StatusBar.setStyle({ style: Style.Dark })` once at boot — optional.

## 2. Build & upload the binary

**On a Mac:** open `ios/App/App.xcworkspace` in Xcode → select the *App* target → Signing & Capabilities → your team → Product ▸ Archive → Distribute App ▸ App Store Connect. Xcode uploads the build.

**On Codemagic (no Mac):** connect the Git repo → pick the Capacitor workflow → add your App Store Connect API key → set the bundle id → run. The build lands in App Store Connect automatically.

Version discipline: keep `package.json`, `src/version.ts`, and the Xcode marketing version in lockstep (all `1.0.0` today). The build number must increase with every upload.

## 3. App Store Connect

1. **Register the Bundle ID** (developer.apple.com → Identifiers) matching `capacitor.config.json`.
2. **Create the app** (App Store Connect → My Apps → +): name, bundle id, SKU (anything, e.g. `emberforge-001`).
3. **Paste the listing** from `docs/app-store-listing.md` — name, subtitle, promo text, keywords, description, What's New. All fields are pre-counted under Apple's caps.
4. **Categories & rating**: Health & Fitness primary; run the rating questionnaire flagging *Infrequent/Mild Horror or Fear Themes* → expect 9+.
5. **Privacy**: answer **Data Not Collected** in every category (true: no accounts, no analytics, no network calls with user data). Paste the public privacy-policy URL — host `public/privacy.html` anywhere public (GitHub Pages: push the repo, enable Pages, use `https://<you>.github.io/<repo>/privacy.html`).
6. **Screenshots**: capture the 6.9" (1290×2796) set from the iOS Simulator — the suggested six-shot sequence is in the listing kit. The Simulator's `Cmd+S` saves at exact device resolution.
7. **Review notes**: paste section 9 of the listing kit. It preempts the two questions reviewers actually ask (no login needed; the archaic language is theme, not medical advice).
8. Attach the uploaded build, then **Submit for Review**.

## 4. TestFlight first (strongly recommended)

Before public submission, push the same build to TestFlight and run it on a real iPhone for a week: log real workouts, background the app mid-rest-timer, force-quit and relaunch (save must survive), toggle Hollowed mode, try aeroplane mode. TestFlight review is lighter and fast; it catches shell-specific issues (safe areas, keyboard overlap in the Cauldron inputs) before the real review clock starts.

## 5. Rejection risks & mitigations

| Guideline | Risk | Mitigation (already in place) |
|---|---|---|
| 4.2 Minimum functionality | Web wrappers get rejected when they're thin | Emberforge is fully offline, interactive, and native-feeling. In review notes, describe it as a *fitness tracker* — never as a "web app" or "PWA". |
| 5.1.1 Data collection | Mismatched privacy answers | "Data Not Collected" is genuinely true — keep it that way (adding any analytics SDK later changes this). |
| 1.4.1 Medical harm | Fitness apps giving medical advice | The Fire Keeper gives training counsel, not medical claims; review notes say so explicitly. |
| 2.3 Accurate metadata | Screenshots must match the app | Capture from the real build, not mockups. |

## 6. Launch-day checklist

- [ ] `npm test && npm run build && npm run lint` all green
- [ ] Version bumped in `package.json` + `src/version.ts` + Xcode
- [ ] `npx cap sync` run after final build
- [ ] Privacy policy live at a public URL
- [ ] 6-shot screenshot set uploaded
- [ ] TestFlight pass on a physical device
- [ ] Listing fields pasted from `docs/app-store-listing.md`
- [ ] Review notes pasted; demo instructions verified against the real build
