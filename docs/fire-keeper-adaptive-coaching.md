# The Fire Keeper — Adaptive Coaching Design Doc & Roadmap

**Status:** Proposal (design only — no implementation yet)
**Owner:** EmberForge
**Scope:** Evolve the Fire Keeper from static, rule-based counsel into a genuinely adaptive strength coach that detects stalls, adjusts programming, and speaks to the user's actual history — without losing its FromSoftware-sanctuary voice, and without breaking the app's local-first, private-by-default promise.

---

## 1. Where we are today

The Fire Keeper is already well-architected for growth, but shallow in what it actually reasons about.

**The entry point is clean.** `src/ai/fireKeeper.ts` exposes one async function:

```
seekGuidance(ctx: KeeperContext): Promise<string>
```

`KeeperContext` today is `{ battles, prs, vitals, taperRatio, taperGoal }`. Because the boundary is "plain data in, string out," we can grow the analysis and swap the narrator without touching the UI. A `KEEPER_PERSONA` system prompt and an LM Studio fetch are already stubbed in comments — the seam for a real model exists.

**The reasoning is static.** `generateLocally(ctx)` picks the single weakest lift as `PR / (bodyweight × STANDARD)` and returns a **fixed** critique + counsel string per lift (`CRITIQUE[movement]`), plus a taper reading. Given the same weakest lift, it says the same thing every session. It does not look at trend, tempo, adherence, or what the user did last time.

**Stall detection exists but is siloed.** `src/state/deload.ts` (`detectDeload`) already computes something genuinely adaptive: a lift is "overreaching" when its estimated 1RM has not beaten its best across the last `DELOAD_LOOKBACK = 3` sessions **and** the primary muscle's fatigue is `>= 0.6`; it then prescribes `-10%` load and `-1` set. But this lives in "The Fading Flame" UI flags, **separate from what the Keeper says**. The coach's mouth and the app's analysis are two disconnected systems.

**Net:** the pieces of an adaptive coach exist (a clean interface, a fatigue model in `recovery.ts`, a stall detector in `deload.ts`, rich per-battle history in the store), but they are not composed, and the guidance itself does not adapt.

### What "genuinely adaptive" must add

1. **Detect stalls of several kinds** — not just e1RM-over-3-sessions, but rep-PR stalls, volume plateaus, and missed/irregular training.
2. **Adjust programming** — prescribe the *next* session's targets from what actually happened (made all reps → add load; stalled but fresh → intensity technique; stalled and fatigued → deload; drifting away → re-engagement).
3. **Reference real history** — "thy bench has held at 185 for four sessions," "thy squat climbed 15 lb across three weeks," "as I counselled last week, thou didst add the plate."
4. **Keep the voice** — every number and decision above must arrive in the Keeper's archaic, caring cadence.

---

## 2. Design principles

These constraints shape every phase below.

1. **Deterministic truth, narrated.** The **numbers and prescriptions are computed on-device by testable code** — never invented by a language model. The narrator (template or LLM) only *phrases* facts the engine produced. This preserves accuracy, makes the coach unit-testable, and matches EmberForge's existing "no fabricated numbers" stance in `ai/vision.ts`.
2. **In character, always.** Voice is a first-class requirement, not a skin. The persona (`KEEPER_PERSONA`) is the contract; adaptivity must never flatten it into a spreadsheet.
3. **Local-first, private by default.** The current promise is "data never leaves this device." The deterministic coach honors that with zero network. Any LLM step is **opt-in**, and on-device is preferred so the promise still holds. (We just shipped opt-in, client-encrypted cloud sync — the same consent discipline applies here.)
4. **Safety over cleverness.** Prescriptions are bounded (max weekly jump, never below the empty bar, deload floors). The Keeper defers to rest when overreaching, and never poses as a physician or physical therapist — consistent with the app's wellbeing posture.
5. **Ship value at every phase.** Each phase is independently shippable and improves the experience even if later phases never land. No phase depends on an LLM to be useful.

---

## 3. Target architecture — three layers

Split the single `generateLocally` into a pipeline. Each layer is pure data → data, so each is testable in isolation (as the codebase already does with node logic tests).

```
   store state (battles, prs, vitals, rations, weighIns, settings)
        │
        ▼
  ┌───────────────────────┐   Layer A — SIGNALS  (coach/signals.ts)
  │ deterministic analysis│   PR velocity · stalls · fatigue · adherence ·
  │  "what is true?"      │   volume trend · bodyweight/taper trend · readiness
  └───────────┬───────────┘
        │  CoachSignals
        ▼
  ┌───────────────────────┐   Layer B — PROGRAMMING  (coach/program.ts)
  │ decision engine       │   next-session prescriptions · deload cycles ·
  │  "what to do?"        │   weak-point accessories · bounded & safe
  └───────────┬───────────┘
        │  CoachPlan (structured, numeric)
        ▼
  ┌───────────────────────┐   Layer C — NARRATION  (ai/fireKeeper.ts)
  │ the Keeper's voice     │   templates now → optional grounded LLM later
  │  "how to say it?"     │   NEVER invents numbers; only phrases the CoachPlan
  └───────────┬───────────┘
        │  string
        ▼
     FireKeeper.tsx (typewriter dialogue, unchanged interface)
```

**Layer A — Signals (`coach/signals.ts`).** Fold `detectDeload` and `muscleFatigue` in here and add:
- **PR velocity** per lift: change in best e1RM over the last N sessions / weeks.
- **Stall classes:** e1RM plateau (extend `detectDeload`), rep-PR plateau (same top weight, reps not climbing), volume plateau.
- **Adherence/cadence:** sessions per week vs. the user's own baseline; days since last battle; broken streaks.
- **Body trend:** bodyweight and shoulder:waist (taper) slope from `weighIns`/`vitals`, and macro adherence from `rations` vs `macroGoals` (is the user eating to support the goal?).
- **Readiness (later):** fatigue + optional RPE (Phase 3).

Output a single typed `CoachSignals` object. This is the "source of truth" everything downstream reads.

**Layer B — Programming (`coach/program.ts`).** Turn signals into a concrete, bounded plan using a transparent progression model (recommend **autoregulated double progression** as the default):
- Made all prescribed reps last time and not fatigued → **+ smallest available plate** (respecting `settings.units`/`barWeight`), or add a rep toward the top of the range.
- Stalled but muscle is fresh → **hold load, add an intensity technique** (pause reps, tempo, an extra back-off set) before deloading.
- Stalled **and** fatigued (the `detectDeload` case) → **deload**: `-10%` load, `-1` set, and a lighter week.
- Drifting (missed sessions) → **re-engagement**: lower the target, rebuild the streak, forgive the lapse in-voice.
- Weakest lift → choose accessories **from the data**, not a fixed string (e.g., if bench stalls with high triceps fatigue vs. weak lockout, pick different assistance).
- **Guardrails:** cap weekly load increase (e.g., ≤ 2.5–5%), never prescribe below the bar, floor deloads, and never prescribe through a flagged failed-set pattern (`Battle.failed`).

Output a typed `CoachPlan`: per-lift next-session targets, a headline diagnosis, the "why," and 1–2 accessory prescriptions — all numeric and deterministic.

**Layer C — Narration (`ai/fireKeeper.ts`).** Today: a template renderer that reads `CoachPlan` and produces the Keeper's speech (a richer version of the current joined-paragraph approach, but now driven by real, varied facts). Later (Phase 4): an optional LLM that receives the `CoachPlan` **as ground-truth facts** plus `KEEPER_PERSONA`, and is constrained to phrase — not compute. Either way `seekGuidance` keeps returning a `Promise<string>`; the UI never changes.

---

## 4. Data-model additions

Small, additive, and persisted through the existing zustand store (whole-state persistence, so new fields survive automatically).

- **Coach memory (`coachLog`):** the last plan given per lift and its date, so the Keeper can say "as I counselled" and measure whether advice was followed (did the user actually add the plate?). Enables continuity and a weekly review.
- **Optional user inputs (Phase 3+):**
  - **RPE / reps-in-reserve** per top set — unlocks true autoregulation. Adds friction, so it stays optional and defaulted off.
  - **Goal** (strength vs. physique vs. general) and **injury/exclusion flags** — steer accessory choice and standards.
- **Per-user standards drift (Phase 5):** the current `STANDARDS` are population multiples of bodyweight; over time, weight them toward the individual's demonstrated trajectory so "weakest lift" reflects *their* balance, not a generic table.

---

## 5. Phased roadmap

Each phase is shippable on its own. Phases 0–2 need **no** network and no model — they are the bulk of the "genuinely adaptive" feel.

### Phase 0 — Foundation (refactor, zero behavior change)
- Create `src/coach/` with `signals.ts`, `program.ts`, and shared `types.ts`. Move `detectDeload` logic in; re-export for `FireKeeper.tsx` compatibility.
- Widen `KeeperContext` to carry everything the signals need (`rations`, `macroGoals`, `weighIns`, `settings`) — plain data, still.
- Golden-master test: same inputs → same current output, proving the refactor is safe.
- **Done when:** the Keeper says exactly what it says today, but through the new pipeline, with tests.

### Phase 1 — Real signals in the Keeper's mouth (biggest UX jump, no deps)
- Implement the full `CoachSignals` (PR velocity, stall classes, adherence, body/macro trend).
- Unify "The Fading Flame" deload flags **into** the spoken guidance instead of a separate panel.
- Add history-referencing template sentences built from real numbers: "thy squat has climbed 15 lb across three weeks," "thy bench has held at 185 for four sessions — the plateau is real."
- **Done when:** the counsel visibly changes week to week and cites the user's own history; still 100% deterministic/on-device.

### Phase 2 — Adaptive programming engine
- Implement `program.ts`: next-session prescriptions via autoregulated double progression, deload cycles, data-chosen accessories, all bounded and safe.
- Add `coachLog` memory; the Keeper references prior advice and whether it was followed.
- Surface a compact "next session" prescription in the UI (targets per lift) alongside the prose.
- **Done when:** the coach tells you *what to do next* and adapts it to what you actually did.

### Phase 3 — Optional readiness & goals (true autoregulation)
- Lightweight, optional RPE capture on the top set in `CombatLog`; a goal picker in Settings.
- Feed readiness/goal into `program.ts` for finer autoregulation and accessory selection.
- **Done when:** users who opt in get session-by-session load adjustments tuned to how hard the work felt.

### Phase 4 — LLM narration (opt-in; on-device preferred)
- Replace Layer C's template renderer with an LLM that narrates the `CoachPlan` in-voice, chosen at runtime:
  - **On-device** (WebLLM in-browser, or a local server like the already-stubbed LM Studio) — keeps the privacy promise intact; **recommended default** for the opt-in.
  - **Opt-in cloud** as an alternative for users who want higher quality and accept the trade-off — same explicit-consent discipline as the new cloud-sync feature, sending only the minimal structured summary.
- **Grounding guardrails:** the model receives numbers as facts and is instructed//validated to never introduce new figures; a post-check rejects any numeric token not present in the `CoachPlan`. Template renderer remains the always-available fallback.
- **Done when:** opted-in users get fluid, varied, in-character coaching that is still numerically identical to the deterministic plan.

### Phase 5 — Feedback loop & personalization
- Learn which cues/loads produce progress for this user; drift `STANDARDS` toward their demonstrated balance.
- Longitudinal weekly "audience with the Fire Keeper": a scheduled review of the week (ties into the existing scheduled-task capability).
- **Done when:** the coach measurably improves its own advice from outcomes.

---

## 6. Safety & correctness

- **Bounded prescriptions:** cap weekly load increases, floor at the empty bar, and floor deloads — the engine can never suggest something reckless even if signals are noisy.
- **Overreaching & injury:** when the deload signal fires, counsel is rest, not more; failed-set patterns (`Battle.failed`) suppress load increases. The Keeper never diagnoses injury or gives rehab/medical instruction, consistent with the app's wellbeing guidance — it points to rest and, where appropriate, to seeking a professional.
- **No fabricated numbers:** the deterministic core owns every figure; under an LLM, a numeric-grounding check enforces it.
- **Testability:** `signals.ts` and `program.ts` are pure functions with fixture-based tests (stall → deload, made-reps → progress, drift → re-engage), matching how the rest of EmberForge is verified.

---

## 7. Privacy posture

The default experience stays **fully on-device with no network**, preserving "data never leaves this device." An LLM narrator is strictly opt-in; the recommended path (on-device model) keeps even that private. If a user opts into a cloud model, consent is explicit and only the minimal structured `CoachPlan`/summary is sent — never the full history — reusing the consent and minimization patterns from the encrypted cloud-sync work.

---

## 8. Success metrics

- **Retention/engagement:** do users return to the Fire Keeper tab and to training?
- **Advice-followed rate:** did the prescribed load/reps show up in the next battle (measurable from `coachLog`)?
- **Progress velocity:** PR velocity for users who follow counsel vs. a baseline period.
- **Qualitative:** "does it feel like it knows me?" — the flagship test.

---

## 9. Open decisions (need your call before Phase 4)

1. **LLM strategy:** on-device (WebLLM/LM Studio) vs. opt-in cloud vs. stay fully templated. *Recommendation: build Phases 0–3 templated (they carry most of the value), then add on-device LLM as an opt-in in Phase 4, with the template renderer as the permanent fallback.*
2. **RPE input (Phase 3):** worth the logging friction for real autoregulation? *Recommendation: optional, default off, so purists get it and casual users are undisturbed.*
3. **Default programming model:** autoregulated double progression (recommended) vs. linear vs. block periodization as the baseline the engine assumes.

---

## 10. Suggested first step

Phase 0 + Phase 1 together are the highest-leverage, lowest-risk slice: they make the Keeper feel adaptive and history-aware **today**, with no new dependencies and no privacy change — just by composing the analysis the app already computes and letting the Keeper actually speak it. If you approve this direction, I'll start with the Phase 0 refactor (behavior-preserving, test-backed) and then Phase 1's signals.
