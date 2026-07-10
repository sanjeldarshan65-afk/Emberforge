# EmberForge — Usability Test Kit

**Method:** Moderated 1:1, task-based, think-aloud optional, **silent observation**.
**Participants:** 5 people who both lift and play games.
**Session length:** ~25–30 min each.
**Goal:** Find where a first-time user hesitates while logging a real workout — and whether the game framing (souls, battles, the Sanctum) helps or gets in the way.

> The golden rule of this test: **we are testing the app, not the person.** If they get stuck, that is a finding, not a failure.

---

## Before each session (setup checklist)

- [ ] Device ready with EmberForge open to a **fresh first-run state** (new user / cleared save / a separate browser profile or incognito window). This lets you observe onboarding, the first workout, and the empty-state Sanctum.
- [ ] Screen recording + audio running (with consent). A second observer to take notes is ideal.
- [ ] Have a plan for **resetting between participants.** Because the reset ("Sever thy save") is destructive, do it yourself between sessions — or simplest, give each participant a fresh incognito window / browser profile so you never have to wipe data.
- [ ] Observation sheet printed (one per participant). Pen. Stopwatch/phone timer.
- [ ] Know the participant's real workout for today so the task is authentic.

---

## Facilitator script (read aloud)

**Intro (~1 min):**
> "Thanks for helping. This is an early fitness app with a dark-fantasy theme. I'm going to ask you to log a real workout in it. A few things: there are no wrong answers, and if something's confusing, that's exactly what I want to find — you're testing the app, not the other way around. I won't be able to help while you work, because I want to see what happens naturally. Talk out loud if it's comfortable, but don't force it. Ready?"

**Consent:**
> "Is it okay if I record the screen and audio? It's only for our notes."

**Warm-up task (orientation, ~2 min):**
> "First, just open it up and poke around for a minute. Tell me what you think this app is and what you could do here." *(Observe first impressions before any task.)*

**Core task (unaided, silent observation):**
> "Now, log the workout you actually did today — or the one you'd do today — as if I weren't here. Take your time. I'll be quiet and just watch."

Then **stay silent.** Do not point, nod toward the screen, or answer "how do I…". Note every hesitation.

**If they are truly, painfully stuck (30–45s of visible frustration):** offer the smallest nudge and **record that a nudge was needed** (that's a critical finding). Escalate only as needed:
1. "What are you trying to do right now?"
2. "What would you expect to do next?"
3. (Last resort) point them to the area, and mark the step **Assisted**.

**Second-lift probe (only if their workout was a single lift):**
> "Add a different exercise to this same session." *(This specifically tests the multi-lift tab switching.)*

**Wrap-up:**
> "Great — that's the task. I've got a few quick questions." *(Go to the debrief.)*

---

## Observation sheet (print one per participant)

**Participant #____   Date ______   Lifts: Y/N   Games: Y/N   Uses a lifting app already? ______**

**Completion legend:** ✓ = unaided · ~ = partial/struggled · ✗ = failed · A = needed assist

| # | Flow / checkpoint | Done | Time | Where they hesitated / what they said |
|---|---|---|---|---|
| 1 | Understands what the app is (warm-up) | | | |
| 2 | Completes onboarding (name / vitals) | | | |
| 3 | Finds the workout screen (the **Combat** tab) | | | |
| 4 | Chooses freestyle vs. a **battle plan** (e.g. The Iron Trinity) | | | |
| 5 | Enters weight + reps for a set | | | |
| 6 | **Marks a set complete** (the ◆ "Slay" button) | | | |
| 7 | Adds another set | | | |
| 8 | **Switches to a second exercise** (plan tabs) | | | |
| 9 | Understands the rest timer (and it doesn't block them) | | | |
| 10 | **Ends the workout** (End Battle → Claim Rewards) | | | |
| 11 | Understands the reward (**souls / XP / level**) | | | |
| 12 | Recognizes the workout was saved (back in the Sanctum) | | | |
| 13 | Reacts to the first-run **Kindling** roadmap / empty sections | | | |

**Friction hotspots — tick if observed (these are the ones we most want data on):**

- [ ] Couldn't tell the diamond/◆ was the "mark set done" control
- [ ] Didn't realize plan **tabs are tappable** to switch lifts
- [ ] Hunted for how to **finish/save** the workout
- [ ] Rest timer covered or distracted from the next set
- [ ] Confused by vocabulary (**"battles," "souls," "the iron," "Sanctum," "Fire Keeper"**)
- [ ] Unsure what **souls are for** / what the numbers mean
- [ ] First-run screen felt empty or unclear about what fills in later
- [ ] Tried a gesture/tap that did nothing (note what: __________)

**Severity of the worst issue this session:** 1 (cosmetic) · 2 (minor) · 3 (major, needed workaround) · 4 (blocker, couldn't finish)

**Top 3 verbatim quotes:**
1. ______________________________________________
2. ______________________________________________
3. ______________________________________________

---

## Debrief questions (ask after the task)

Keep it conversational; let silences breathe. Star the ones that matter most if you're short on time (★).

1. ★ On a scale of 1–5, how easy or hard was it to log that workout? What made it that number?
2. Was there any moment you felt stuck or unsure what to do? Walk me through it.
3. ★ When you finished, how did you know the workout was saved — or weren't you sure?
4. You earned **souls** and **XP** for that workout. What do you think those are for? Did you care about them?
5. ★ The app is themed like a dark-fantasy game (battles, the Sanctum, a Fire Keeper). Did that theme help, get in the way, or not matter — and where specifically?
6. Was there anything you expected to be able to do that you couldn't find?
7. If you train more than one lift in a session, did adding the second exercise work the way you expected?
8. How does this compare to whatever you use now to track lifts? What would make you switch — or not?
9. ★ Would you use this for real next week? Why / why not?
10. If you could change one thing, what would it be?

---

## After all 5 sessions (quick synthesis)

- Build a simple grid: participants down the side, the 13 checkpoints across the top; fill in ✓/~/✗/A. Patterns jump out fast — anything failed by **2+ of 5** is a priority.
- Rank issues by **severity × frequency**. A severity-4 hit by even one person outranks a cosmetic annoyance everyone noticed.
- Pull the recurring verbatim quotes — they're the most persuasive part of the readout.
- Sanity check the theme question (Q5): if the vocabulary consistently blocks task completion, that's a signal to add plainer labels alongside the lore.
