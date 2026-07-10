import { useEffect } from 'react'

/* A shared stack of open modals so Escape only ever closes the TOP-most one
   (e.g. the exercise picker opened from within the grimoire, not both at once). */
const modalStack: symbol[] = []

/**
 * Shared full-screen-modal behavior:
 *  - Escape closes the modal (only when it is the top-most open modal)
 *  - the page behind is scroll-locked while the modal is open (no bleed-through on mobile)
 * Only active while `open` is true; restores the prior body overflow on close.
 */
export function useModalDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const id = Symbol('modal')
    modalStack.push(id)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === id) onClose()
    }
    window.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      const i = modalStack.indexOf(id)
      if (i >= 0) modalStack.splice(i, 1)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])
}
