import type { Battle } from '../state/store'
import { statusEffects, todayKey } from '../state/store'
import { dailyForDay, dailyProgress } from '../state/daily'
import type { DailyContext } from '../state/daily'
import { currentSeason, seasonReps } from '../state/season'

/* ================================================================
   EMBER REMINDERS — a local, no-backend reminder scaffold.

   This app keeps no server, so there is no true push. What CAN be
   done honestly: while the app is open (or freshly opened), derive
   what deserves the ashen one's attention and raise a system
   notification — at most once per condition per day. If the
   Notification API is missing or denied, everything degrades to
   silence; the Sanctum cards still carry the same information.
   A future backend (or iOS PWA web-push) can reuse computeReminders
   unchanged and swap the delivery layer.
   ================================================================ */

export type Reminder = { id: string; title: string; body: string }

export const remindersSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window

export const remindersPermitted = () =>
  remindersSupported() && Notification.permission === 'granted'

/** ask the browser for permission; resolves true when granted */
export async function requestReminderPermission(): Promise<boolean> {
  if (!remindersSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const res = await Notification.requestPermission()
  return res === 'granted'
}

export type ReminderState = {
  battles: Battle[]
  rations: { date: string; calories: number; protein: number }[]
  weighIns: { date: string; weight: number }[]
  macroGoals: { calories: number; protein: number; carbs: number; fats: number }
  claimedDailies: string[]
  claimedSeasons: string[]
  emberBurns: string[]
  emberBank: number
}

/** pure: which reminders are due right now (delivery-agnostic) */
export function computeReminders(s: ReminderState, now: Date = new Date()): Reminder[] {
  const out: Reminder[] = []
  const dayKey = todayKey()

  /* no battle yet today and the chain would break at midnight — a banked
     ember shields it silently, so only cry out when the bank is empty */
  const { streak, daysSinceLast } = statusEffects(s.battles, s.emberBurns)
  if (streak > 0 && daysSinceLast !== null && daysSinceLast >= 1 && s.emberBank === 0) {
    out.push({
      id: 'streak-at-risk',
      title: 'The fire gutters',
      body: `Thy ${streak}-day streak dies at midnight. One battle keeps it burning.`,
    })
  }

  /* the Daily Ember is won but unclaimed */
  const ember = dailyForDay(dayKey)
  const ctx: DailyContext = {
    battles: s.battles,
    rations: s.rations as DailyContext['rations'],
    weighIns: s.weighIns,
    macroGoals: s.macroGoals,
    dayKey,
  }
  const { progress, target } = dailyProgress(ember, ctx)
  if (progress >= target && !s.claimedDailies.includes(dayKey)) {
    out.push({
      id: 'daily-unclaimed',
      title: 'Thy Daily Ember awaits',
      body: `"${ember.name}" is fulfilled — claim its souls in the Sanctum.`,
    })
  }

  /* the seasonal rite is won but unclaimed */
  const season = currentSeason(now)
  if (seasonReps(s.battles, season) >= season.target && !s.claimedSeasons.includes(season.id)) {
    out.push({
      id: `season-unclaimed-${season.id}`,
      title: 'The Rite of the Season is fulfilled',
      body: `${season.name} is complete. Its reward waits in the Sanctum.`,
    })
  }

  return out
}

const SHOWN_KEY = 'emberforge-reminders-shown'

/** which reminder ids already fired today (localStorage, outside the game save) */
function shownToday(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as { day: string; ids: string[] }
    return parsed.day === todayKey() ? new Set(parsed.ids) : new Set()
  } catch {
    return new Set()
  }
}

function markShown(ids: string[]) {
  try {
    const prior = shownToday()
    for (const id of ids) prior.add(id)
    localStorage.setItem(SHOWN_KEY, JSON.stringify({ day: todayKey(), ids: [...prior] }))
  } catch {
    /* storage full or blocked — worst case a reminder repeats */
  }
}

/** derive + deliver: raise each due reminder as a notification, once per day */
export function runReminderCheck(s: ReminderState) {
  if (!remindersPermitted()) return
  const due = computeReminders(s)
  const seen = shownToday()
  const fresh = due.filter((r) => !seen.has(r.id))
  if (fresh.length === 0) return

  for (const r of fresh) {
    try {
      new Notification(r.title, { body: r.body, icon: '/pwa-192.png', tag: `emberforge-${r.id}` })
    } catch {
      /* some platforms (notably page-context iOS) throw — degrade silently */
    }
  }
  markShown(fresh.map((r) => r.id))
}
