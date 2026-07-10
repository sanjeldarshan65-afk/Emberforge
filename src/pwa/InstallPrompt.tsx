import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* Chrome/Edge/Android fire `beforeinstallprompt`; we stash it and
   offer our own themed install button. iOS never fires it, so we
   show gentle instructions instead when in Safari and not installed. */

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // @ts-expect-error - iOS Safari only
  window.navigator.standalone === true

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    if (isIOS()) setShowIOSHint(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') setDeferred(null)
  }

  const visible = !dismissed && (deferred !== null || showIOSHint)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 2 }}
          className="fixed bottom-20 inset-x-0 z-[58] px-4 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="max-w-2xl mx-auto panel panel-ornate p-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-display text-souls text-[0.7rem] tracking-[0.2em] uppercase">
                Rest at this Bonfire
              </div>
              <p className="font-ui text-xs text-bone-dim mt-0.5">
                {deferred
                  ? 'Install Emberforge on thy device — no browser, pure flame.'
                  : 'On iOS: tap Share, then "Add to Home Screen" to enshrine the app.'}
              </p>
            </div>
            {deferred && (
              <button onClick={install} className="btn-ember min-h-12 px-4 shrink-0 text-[0.6rem]">
                Install
              </button>
            )}
            <button
              onClick={() => setDismissed(true)}
              aria-label="dismiss install prompt"
              className="min-h-10 min-w-10 shrink-0 text-faded hover:text-bone transition-colors"
            >
              &times;
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
