import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../state/store'
import { useToast } from '../ui/toastContext'
import type { Rank } from '../state/ranks'

/* ================================================================
   RANK SCROLL — a shareable stone tablet proclaiming thy standing.
   Same idiom as the Victory Scroll: captured with html-to-image at
   3x, inline hex styles only so the capture never trips on modern
   CSS color functions (var(), color-mix, oklch...).
   ================================================================ */

export type RankScrollData = {
  rank: Rank
  level: number
}

export default function RankScroll({
  data,
  onClose,
}: {
  data: RankScrollData | null
  onClose: () => void
}) {
  const profile = useGame((s) => s.profile)
  const toast = useToast()
  const cardRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  const share = async () => {
    const node = cardRef.current
    if (!node || saving || !data) return
    setSaving(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `emberforge-rank-${data.rank.key}.png`
      a.click()
      toast('Rank Scroll inscribed', 'souls')
    } catch {
      toast('The scroll resists... capture failed', 'blood')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[66] bg-black/85 flex flex-col items-center justify-center px-4 overflow-y-auto py-6"
          onClick={(e) => {
            e.stopPropagation() // don't let the click fall through to the ladder's dismiss overlay
            onClose()
          }}
        >
          {/* ---- the tablet (capture target, story ratio 9:16) ---- */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1, transition: { delay: 0.15, duration: 0.5 } }}
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={cardRef}
              style={{
                width: 324,
                height: 576,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                background: 'linear-gradient(180deg, #17130f 0%, #0a0806 70%)',
                border: '1px solid #9c7f35',
                overflow: 'hidden',
              }}
            >
              {/* glow at the peak, tinted by the rank itself */}
              <div
                style={{
                  position: 'absolute',
                  top: -80,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 300,
                  height: 220,
                  background: `radial-gradient(ellipse at center, ${data.rank.hex}38, ${data.rank.hex}00 70%)`,
                }}
              />
              {/* corner brackets */}
              {[
                { top: 8, left: 8, borderTop: '1px solid #9c7f35', borderLeft: '1px solid #9c7f35' },
                { top: 8, right: 8, borderTop: '1px solid #9c7f35', borderRight: '1px solid #9c7f35' },
                { bottom: 8, left: 8, borderBottom: '1px solid #9c7f35', borderLeft: '1px solid #9c7f35' },
                { bottom: 8, right: 8, borderBottom: '1px solid #9c7f35', borderRight: '1px solid #9c7f35' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 22, height: 22, ...s }} />
              ))}

              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.35em', color: '#9c7f35', marginBottom: 26 }}>
                EMBERFORGE
              </div>

              <div style={{ width: 140, height: 1, background: '#4d4335', marginBottom: 26 }} />

              <div
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontWeight: 700,
                  fontSize: 19,
                  letterSpacing: '0.28em',
                  color: '#e9e1cb',
                  marginBottom: 26,
                }}
              >
                RANK ATTAINED
              </div>

              {/* the rank emblem */}
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  border: `2px solid ${data.rank.hex}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: data.rank.hex,
                  fontSize: 40,
                  lineHeight: 1,
                  boxShadow: `0 0 28px ${data.rank.hex}66`,
                  background: `radial-gradient(circle, ${data.rank.hex}22, ${data.rank.hex}00 70%)`,
                  marginBottom: 22,
                }}
              >
                {data.rank.glyph}
              </div>

              <div
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontWeight: 900,
                  fontSize: 27,
                  lineHeight: 1.2,
                  letterSpacing: '0.14em',
                  color: data.rank.hex,
                  textShadow: `0 0 26px ${data.rank.hex}73`,
                  padding: '0 20px',
                }}
              >
                {data.rank.name.toUpperCase()}
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 16, color: '#a89e86', marginTop: 8 }}>
                Level {data.level} of the climb
              </div>

              <div style={{ width: 140, height: 1, background: '#4d4335', margin: '28px 0' }} />

              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: '#a89e86' }}>
                forged by <span style={{ color: '#e6c35c' }}>{profile?.name ?? 'an unnamed ashen one'}</span>
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#6e6553', marginTop: 4 }}>
                {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>

              <div style={{ position: 'absolute', bottom: 22, fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#6e6553' }}>
                the fire remembers
              </div>
            </div>
          </motion.div>

          {/* ---- actions ---- */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
            className="flex gap-3 mt-5 w-full max-w-[324px] shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={share} disabled={saving} className="btn-ember flex-1 min-h-12">
              {saving ? 'Inscribing...' : 'Share to Realm'}
            </button>
            <button onClick={onClose} className="btn-hollow flex-1 min-h-12">
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
