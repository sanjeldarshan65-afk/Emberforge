import { motion } from 'framer-motion'

/* ================================================================
   EMPTY WIDGET — an inviting, on-theme empty state: a small bonfire
   illustration (which cools to spectral blue in Hollowed mode, since
   it draws in the ember token), a title, a line of lore, and ONE clear
   call-to-action. Used wherever a data widget has nothing to show yet.
   (navigateTab lives in ui/navigate.ts so this file stays
   fast-refresh clean.)
   ================================================================ */

export default function EmptyWidget({
  title,
  body,
  cta,
  onCta,
}: {
  title: string
  body: string
  cta: string
  onCta: () => void
}) {
  return (
    <div className="panel panel-ornate p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto mb-3 w-14 h-14 text-ember drop-shadow-[0_0_12px_rgba(255,117,24,0.35)]"
        aria-hidden
      >
        <svg
          viewBox="0 0 64 64"
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* ash mound + crossed logs */}
          <path d="M16 50 q16 6 32 0" stroke="var(--color-stone)" />
          <path d="M22 50 l6 -12 M42 50 l-6 -12" stroke="var(--color-ash)" />
          {/* the flame */}
          <path
            d="M32 47 c-7 -4 -9 -15 -1 -22 c-0.5 5 3 6 3 10 c2 -2 2 -6 1 -9 c7 5 8 17 1 21"
            fill="currentColor"
            fillOpacity="0.16"
          />
          {/* a rising spark */}
          <circle cx="39" cy="18" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      </motion.div>
      <div className="font-display text-souls text-sm tracking-[0.15em] uppercase mb-1">{title}</div>
      <p className="font-body italic text-bone-dim text-sm mb-4 max-w-xs mx-auto leading-snug">
        {body}
      </p>
      <button onClick={onCta} className="btn-ember min-h-11 px-6 text-[0.65rem]">
        {cta}
      </button>
    </div>
  )
}
