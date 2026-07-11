import type { TabId } from '../components/BottomNav'

/** ask App to switch tabs without prop-drilling a callback through the tree */
export function navigateTab(to: TabId) {
  window.dispatchEvent(new CustomEvent('emberforge:navigate', { detail: to }))
}

/* ---- the gauntlet thrown: launch Combat pre-loaded with a foe ----
   Codex (or any tab) stashes the movement, then navigates; CombatLog
   consumes it on mount and opens a freestyle battle on that lift. */
let pendingFoe: string | null = null

export function faceFoe(movement: string) {
  pendingFoe = movement
  navigateTab('combat')
}

export function consumePendingFoe(): string | null {
  const foe = pendingFoe
  pendingFoe = null
  return foe
}
