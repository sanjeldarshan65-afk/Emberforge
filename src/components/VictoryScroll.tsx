import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../state/store'
import { useToast } from '../ui/toastContext'

/* ================================================================
   VICTORY SCROLL — a shareable stone tablet for new records
   Captured with html-to-image at 3x for Instagram-story size.
   NOTE: the card uses only inline hex/rgba styles so the capture
   never trips on modern CSS color functions.
   ================================================================ */

export type ScrollData = {
  movement: string
  weight: number
  reps: number
  xp: number
  souls: number
}

const PROCLAMATIONS = [
  'THE IRON YIELDS',
  'A RECORD IS FORGED',
  'THE ANVIL REMEMBERS',
  'STRENGTH BEYOND ASH',
]

export default function VictoryScroll({
  scroll,
  onClose,
}: {
  scroll: ScrollData | null
  onClose: () => void
}) {
  const profile = useGame((s) => s.profile)
  const units = useGame((s) => s.settings.units)
  const toast = useToast()
  const cardRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  const proclamation = scroll
    ? PROCLAMATIONS[(scroll.weight + scroll.reps) % PROCLAMATIONS.length]
    : PROCLAMATIONS[0]

  const share = async () => {
    const node = cardRef.current
    if (!node || saving) return
    setSaving(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `emberforge-${scroll?.movement.replace(/\s+/g, '-').toLowerCase()}-${scroll?.weight}${units}.png`
      a.click()
      toast('Victory Scroll inscribed', 'souls')
    } catch {
      toast('The scroll resists... capture failed', 'blood')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {scroll && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[64] bg-black/85 flex flex-col items-center justify-center px-4 overflow-y-auto py-6"
        >
          {/* ---- the tablet (capture target, story ratio 9:16) ---- */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1, transition: { delay: 0.15, duration: 0.5 } }}
            className="shrink-0"
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
              {/* ember glow at the peak */}
              <div
                style={{
                  position: 'absolute',
                  top: -80,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 300,
                  height: 220,
                  background: 'radial-gradient(ellipse at center, rgba(255,117,24,0.22), rgba(255,117,24,0) 70%)',
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
                  fontSize: 21,
                  letterSpacing: '0.22em',
                  color: '#dc2626',
                  textShadow: '0 0 18px rgba(220,38,38,0.5)',
                  marginBottom: 30,
                }}
              >
                {proclamation}
              </div>

              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, letterSpacing: '0.3em', color: '#e9e1cb', marginBottom: 8 }}>
                {scroll.movement.toUpperCase()}
              </div>

              <div
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontWeight: 900,
                  fontSize: 64,
                  lineHeight: 1,
                  color: '#e6c35c',
                  textShadow: '0 0 26px rgba(230,195,92,0.45)',
                }}
              >
                {scroll.weight}
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 16, color: '#a89e86', marginTop: 6 }}>
                {units} &times; {scroll.reps} — a new personal record
              </div>

              <div style={{ width: 140, height: 1, background: '#4d4335', margin: '28px 0' }} />

              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: '#a89e86' }}>
                forged by <span style={{ color: '#e6c35c' }}>{profile?.name ?? 'an unnamed ashen one'}</span>
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#6e6553', marginTop: 4 }}>
                {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>

              <div style={{ position: 'absolute', bottom: 22, fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#6e6553' }}>
                +{scroll.xp} XP &middot; +{scroll.souls.toLocaleString()} souls
              </div>
            </div>
          </motion.div>

          {/* ---- actions ---- */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
            className="flex gap-3 mt-5 w-full max-w-[324px] shrink-0"
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
