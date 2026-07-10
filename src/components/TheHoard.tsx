import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, statusEffects } from '../state/store'
import { ITEMS, RARITY_ORDER, effectText, getItem, SHOP_STOCK, priceOf } from '../state/items'
import type { Item, ItemType, Rarity } from '../state/items'
import { useToast } from '../ui/toastContext'
import { useModalDismiss } from '../ui/useModalDismiss'

/* ================================================================
   THE HOARD — the relics, trophies, titles and cosmetics of a life
   at the iron. Owned items burn in their rarity's colour; the rest
   sit as locked silhouettes, whispering how they might be claimed.
   Nothing is granted here yet — this is the vault and its window.
   ================================================================ */

const TYPE_RUNE: Record<ItemType, string> = {
  relic: '❖', // ❖
  trophy: '◆', // ◆
  cosmetic: '✦', // ✦
  title: '✥', // ✥
}
const TYPE_LABEL: Record<ItemType, string> = {
  relic: 'Relic',
  trophy: 'Trophy',
  cosmetic: 'Cosmetic',
  title: 'Title',
}

type RStyle = { label: string; color: string; ring: string; glow: string }

/* warm ember palette + a cold spectral palette for Hollowed Mode */
const RARITY_WARM: Record<Rarity, RStyle> = {
  legendary: { label: 'Legendary', color: 'var(--color-souls)', ring: 'var(--color-souls)', glow: 'var(--shadow-souls-glow)' },
  rare: { label: 'Rare', color: 'var(--color-humanity)', ring: 'var(--color-humanity)', glow: '0 0 12px rgba(157,184,201,0.35)' },
  uncommon: { label: 'Uncommon', color: 'var(--color-verdant)', ring: 'var(--color-verdant)', glow: '0 0 10px rgba(107,143,94,0.28)' },
  common: { label: 'Common', color: 'var(--color-bone-dim)', ring: 'var(--color-stone)', glow: 'none' },
}
const RARITY_HOLLOW: Record<Rarity, RStyle> = {
  legendary: { label: 'Legendary', color: '#a6cfe6', ring: '#a6cfe6', glow: '0 0 14px rgba(166,207,230,0.4)' },
  rare: { label: 'Rare', color: '#7fb0d4', ring: '#7fb0d4', glow: '0 0 12px rgba(127,176,212,0.32)' },
  uncommon: { label: 'Uncommon', color: '#8fa2ad', ring: '#8fa2ad', glow: 'none' },
  common: { label: 'Common', color: 'var(--color-bone-dim)', ring: 'var(--color-stone)', glow: 'none' },
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="10.5" width="14" height="9" rx="1.5" />
      <path d="M8 10.5 V8 a4 4 0 0 1 8 0 v2.5" />
    </svg>
  )
}

export default function TheHoard({ open, onClose }: { open: boolean; onClose: () => void }) {
  useModalDismiss(open, onClose)
  const inventory = useGame((s) => s.inventory)
  const manualHollow = useGame((s) => s.settings.hollowed)
  const battles = useGame((s) => s.battles)
  const hollowed = manualHollow || statusEffects(battles).cursed

  const ownedIds = useMemo(() => new Set(inventory.map((o) => o.id)), [inventory])
  const acquired = useMemo(
    () => Object.fromEntries(inventory.map((o) => [o.id, o.acquiredDate])),
    [inventory]
  )
  const [sel, setSel] = useState<Item | null>(null)
  const [mode, setMode] = useState<'hoard' | 'merchant'>('hoard')
  const souls = useGame((s) => s.souls)
  const buyItem = useGame((s) => s.buyItem)
  const toast = useToast()

  useEffect(() => {
    if (!open) {
      setSel(null)
      setMode('hoard')
    }
  }, [open])

  /* owned first, then brightest rarity first */
  const sorted = useMemo(
    () =>
      [...ITEMS].sort((a, b) => {
        const own = Number(ownedIds.has(b.id)) - Number(ownedIds.has(a.id))
        if (own !== 0) return own
        return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
      }),
    [ownedIds]
  )

  const palette = hollowed ? RARITY_HOLLOW : RARITY_WARM
  const selOwned = sel ? ownedIds.has(sel.id) : false
  const selStyle = sel ? palette[sel.rarity] : null

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[64] bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="The Hoard"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
            className="min-h-screen max-w-2xl mx-auto px-5 pb-32"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="divider-ornate flex-1">The Hoard</div>
              <button
                onClick={onClose}
                aria-label="close the hoard"
                className="ml-3 min-h-10 min-w-10 shrink-0 inline-flex items-center justify-center text-bone-dim hover:text-souls transition-colors"
              >
                &times;
              </button>
            </div>
            <p className="font-ui text-xs text-faded mb-4">
              <span className="text-souls">{ownedIds.size}</span> of {ITEMS.length} relics claimed &middot;{' '}
              <span className="text-souls">{souls.toLocaleString()}</span> souls held.
            </p>

            {/* ---- Hoard / Merchant toggle ---- */}
            <div className="flex border border-ash w-max mb-5">
              {(['hoard', 'merchant'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m)
                    setSel(null)
                  }}
                  className={`min-h-10 px-5 font-display text-[0.6rem] tracking-[0.2em] uppercase transition-colors ${
                    mode === m ? 'bg-iron text-souls' : 'text-bone-dim'
                  }`}
                >
                  {m === 'hoard' ? 'Hoard' : 'Merchant'}
                </button>
              ))}
            </div>

            {/* ---- grid ---- */}
            {mode === 'hoard' && (
            <div className="grid grid-cols-3 gap-2">
              {sorted.map((item) => {
                const owned = ownedIds.has(item.id)
                const rs = palette[item.rarity]
                return (
                  <motion.button
                    key={item.id}
                    layout
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSel(item)}
                    className="relative aspect-square p-2 flex flex-col items-center justify-center text-center border bg-charcoal"
                    style={{
                      borderColor: owned ? rs.ring : 'var(--color-ash)',
                      boxShadow: owned ? rs.glow : 'none',
                      opacity: owned ? 1 : 0.55,
                    }}
                  >
                    {owned ? (
                      <>
                        <span className="text-2xl leading-none" style={{ color: rs.color }} aria-hidden>
                          {TYPE_RUNE[item.type]}
                        </span>
                        <span className="font-display text-[0.55rem] tracking-wide text-bone-dim mt-1.5 line-clamp-2 leading-tight">
                          {item.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-faded" aria-hidden>
                          <LockIcon />
                        </span>
                        <span className="font-display text-[0.5rem] tracking-[0.2em] text-faded mt-1.5">
                          {rs.label.toUpperCase()}
                        </span>
                      </>
                    )}
                  </motion.button>
                )
              })}
            </div>
            )}

            {/* ---- Merchant ---- */}
            {mode === 'merchant' && (
              <div className="space-y-2">
                <p className="font-body italic text-bone-dim text-sm mb-3">
                  &ldquo;Ashen one... these relics do not come cheaply. Yet souls serve the hollow
                  nothing. Spend them, ere thou forget why thou gathered them.&rdquo;
                </p>
                {SHOP_STOCK.map((id) => {
                  const item = getItem(id)
                  if (!item) return null
                  const rs = palette[item.rarity]
                  const price = priceOf(id)
                  const owned = ownedIds.has(id)
                  const affordable = souls >= price
                  return (
                    <div
                      key={id}
                      className="panel p-3 flex items-center gap-3"
                      style={{ borderColor: owned ? rs.ring : 'var(--color-ash)' }}
                    >
                      <span className="text-2xl leading-none shrink-0" style={{ color: rs.color }} aria-hidden>
                        {TYPE_RUNE[item.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-display text-sm tracking-wide truncate"
                          style={{ color: owned ? rs.color : 'var(--color-bone)' }}
                        >
                          {item.name}
                        </div>
                        <div className="font-ui text-[0.6rem] tracking-[0.15em] uppercase text-faded">
                          {rs.label} &middot; {item.type}
                        </div>
                      </div>
                      {owned ? (
                        <span className="font-display text-[0.6rem] tracking-[0.2em] uppercase text-souls-dim shrink-0">
                          Claimed
                        </span>
                      ) : (
                        <div className="text-right shrink-0">
                          <button
                            onClick={() => {
                              if (buyItem(id, price)) toast(`Acquired ${item.name}`, 'souls')
                            }}
                            disabled={!affordable}
                            className="btn-ember min-h-11 px-3 text-[0.6rem] disabled:opacity-40"
                          >
                            &#9737; {price.toLocaleString()}
                          </button>
                          {!affordable && (
                            <div className="font-ui text-[0.55rem] text-blood-bright mt-1">too few souls</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ---- detail sheet ---- */}
            <AnimatePresence>
              {sel && selStyle && (
                <motion.div
                  key={sel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="fixed inset-x-0 bottom-0 z-[65] px-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
                  onClick={() => setSel(null)}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="max-w-2xl mx-auto panel panel-ornate p-5"
                    style={{ borderColor: selOwned ? selStyle.ring : 'var(--color-ash)', boxShadow: selOwned ? selStyle.glow : 'none' }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl leading-none shrink-0" style={{ color: selOwned ? selStyle.color : 'var(--color-faded)' }} aria-hidden>
                        {selOwned ? TYPE_RUNE[sel.type] : '❖'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-lg tracking-[0.1em] truncate" style={{ color: selOwned ? selStyle.color : 'var(--color-bone-dim)' }}>
                          {selOwned ? sel.name : 'Undiscovered'}
                        </h3>
                        <div className="font-ui text-[0.6rem] tracking-[0.2em] uppercase text-faded mt-0.5">
                          {selStyle.label} &middot; {TYPE_LABEL[sel.type]}
                          {selOwned && acquired[sel.id] && <> &middot; claimed {fmtDate(acquired[sel.id])}</>}
                        </div>
                      </div>
                    </div>

                    {selOwned ? (
                      <>
                        <p className="font-body italic text-bone-dim text-sm leading-relaxed mt-3">{sel.lore}</p>
                        <div className="mt-3 pt-3 border-t border-ash">
                          <span className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">Bearing</span>
                          <p className={`font-ui text-sm mt-1 ${sel.effect ? 'text-glow-ember' : 'text-bone-dim italic'}`}>
                            {effectText(sel.effect)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-body italic text-faded text-sm leading-relaxed mt-3">
                          This relic is not yet thine. Its nature stays hidden until claimed.
                        </p>
                        <div className="mt-3 pt-3 border-t border-ash">
                          <span className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">How to claim</span>
                          <p className="font-ui text-sm text-bone-dim mt-1">{sel.unlockHint}</p>
                        </div>
                      </>
                    )}

                    <button onClick={() => setSel(null)} className="btn-hollow w-full min-h-11 mt-4 text-[0.6rem]">
                      Close
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
