import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, DEFAULT_SETTINGS } from '../state/store'
import { APP_VERSION } from '../version'
import { useToast } from '../ui/Toast'
import type { Macros } from '../state/store'

/* ================================================================
   SETTINGS — the covenant of preferences
   ================================================================ */

const REST_PRESETS = [60, 90, 120, 180]

const MACRO_FIELDS: { key: keyof Macros; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fats', label: 'Fats', unit: 'g' },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative inline-block w-12 h-7 border shrink-0 transition-colors duration-300 ${
        on ? 'border-ember bg-ember-deep/40 shadow-ember-glow' : 'border-ash bg-abyss'
      }`}
    >
      <motion.span
        initial={false}
        animate={{ x: on ? 25 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-[5px] h-4 w-4 ${on ? 'bg-ember' : 'bg-stone'}`}
      />
    </button>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-ash/60">
      <div className="min-w-0">
        <div className="text-bone text-sm">{label}</div>
        {hint && <div className="font-ui text-xs text-faded">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useGame((s) => s.settings)
  const updateSettings = useGame((s) => s.updateSettings)
  const macroGoals = useGame((s) => s.macroGoals)
  const setMacroGoal = useGame((s) => s.setMacroGoal)
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const exportSave = () => {
    const raw = localStorage.getItem('emberforge-save')
    if (!raw) {
      toast('No save yet exists to preserve', 'blood')
      return
    }
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `emberforge-save-${new Date().toLocaleDateString('en-CA')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Thy legend is preserved', 'souls')
  }

  const importSave = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result)
        const parsed: unknown = JSON.parse(text)
        if (!parsed || typeof parsed !== 'object' || !('state' in parsed)) throw new Error('invalid')
        if (!window.confirm('Restore this legend? Thy current progress will be replaced.')) return
        localStorage.setItem('emberforge-save', text)
        window.location.reload()
      } catch {
        toast('These ashes are no true save', 'blood')
      }
    }
    reader.readAsText(file)
  }

  const setUnits = (u: 'lb' | 'kg') => {
    if (u === settings.units) return
    updateSettings({ units: u, barWeight: u === 'kg' ? 20 : 45 })
  }

  const wipeSave = () => {
    if (!window.confirm('Sever thy save? ALL progress — souls, records, battles, rations — returns to ash. This cannot be undone.')) return
    localStorage.removeItem('emberforge-save')
    window.location.reload()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[66] bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 inset-x-0 max-h-[88vh] overflow-y-auto border-t border-souls-dim/50 bg-void/80 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),1.25rem)]"
          >
            <div className="max-w-2xl mx-auto px-5 pt-5">
              <div className="divider-ornate mb-2">Covenant of Preferences</div>

              {/* ============ THE IRON ============ */}
              <h3 className="font-display text-souls text-[0.7rem] tracking-[0.25em] uppercase mt-5 mb-1">
                The Iron
              </h3>

              <Row label="Units" hint="applies to the iron — plates, records, ledger">
                <div className="flex border border-ash">
                  {(['lb', 'kg'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnits(u)}
                      className={`min-h-10 px-4 font-display text-[0.65rem] tracking-[0.15em] uppercase transition-colors ${
                        settings.units === u ? 'bg-iron text-souls' : 'text-bone-dim'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </Row>

              <Row label="Bar weight" hint="the empty barbell, for the Blacksmith">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={settings.barWeight}
                    onChange={(e) => updateSettings({ barWeight: Math.max(0, Number(e.target.value) || 0) })}
                    className="input-dark min-h-10 w-20 text-center"
                    aria-label="bar weight"
                  />
                  <span className="font-ui text-xs text-faded">{settings.units}</span>
                </div>
              </Row>

              <Row label="Rest duration" hint="how long the embers burn between sets">
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {REST_PRESETS.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateSettings({ restSeconds: s })}
                      className={`min-h-10 px-2.5 font-ui text-xs border transition-colors ${
                        settings.restSeconds === s
                          ? 'border-souls-dim text-souls bg-iron'
                          : 'border-ash text-bone-dim'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                  <input
                    type="number"
                    inputMode="numeric"
                    value={settings.restSeconds}
                    onChange={(e) =>
                      updateSettings({ restSeconds: Math.max(10, Math.min(600, Number(e.target.value) || 90)) })
                    }
                    className="input-dark min-h-10 w-18 text-center"
                    aria-label="custom rest seconds"
                  />
                </div>
              </Row>

              <Row label="Auto rest timer" hint="kindle when a set is completed">
                <Toggle on={settings.autoRestTimer} onChange={(v) => updateSettings({ autoRestTimer: v })} />
              </Row>

              <Row label="Haptic pulse" hint="tremble when the rest burns out">
                <Toggle on={settings.vibration} onChange={(v) => updateSettings({ vibration: v })} />
              </Row>

              <Row label="Sound of the forge" hint="synthesized thuds, shings, and tolls">
                <Toggle on={settings.sound} onChange={(v) => updateSettings({ sound: v })} />
              </Row>

              {/* ============ THE VESSEL ============ */}
              <h3 className="font-display text-souls text-[0.7rem] tracking-[0.25em] uppercase mt-6 mb-1">
                The Vessel
              </h3>

              <Row label="Show avatar" hint="the wireframe body in the Sanctum">
                <Toggle on={settings.showAvatar} onChange={(v) => updateSettings({ showAvatar: v })} />
              </Row>

              <Row label="Retake the Rite" hint="re-answer the quiz; goals and plans re-forged">
                <button
                  onClick={() => {
                    onClose()
                    window.dispatchEvent(new Event('emberforge:rite'))
                  }}
                  className="btn-hollow min-h-10 px-4 text-[0.6rem]"
                >
                  Begin
                </button>
              </Row>

              <Row label="Golden Taper goal" hint="shoulder : waist ratio to chase">
                <input
                  type="number"
                  inputMode="decimal"
                  step={0.01}
                  value={settings.taperGoal}
                  onChange={(e) =>
                    updateSettings({ taperGoal: Math.max(1, Math.min(2.2, Number(e.target.value) || 1.618)) })
                  }
                  className="input-dark min-h-10 w-24 text-center"
                  aria-label="taper goal ratio"
                />
              </Row>

              {/* ============ THE FLAME ============ */}
              <h3 className="font-display text-souls text-[0.7rem] tracking-[0.25em] uppercase mt-6 mb-1">
                The Flame
              </h3>

              <Row label="Hollowed Mode" hint="let the fire fade — ash, bone & cold spectral blue">
                <Toggle on={settings.hollowed} onChange={(v) => updateSettings({ hollowed: v })} />
              </Row>

              {/* ============ ESTUS RATIONS ============ */}
              <h3 className="font-display text-souls text-[0.7rem] tracking-[0.25em] uppercase mt-6 mb-1">
                Estus Rations &middot; Daily Goals
              </h3>

              {MACRO_FIELDS.map((f) => (
                <Row key={f.key} label={f.label}>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={macroGoals[f.key]}
                      onChange={(e) => setMacroGoal(f.key, Number(e.target.value) || 0)}
                      className="input-dark min-h-10 w-24 text-center"
                      aria-label={`${f.label} goal`}
                    />
                    <span className="font-ui text-xs text-faded w-8">{f.unit}</span>
                  </div>
                </Row>
              ))}

              {/* ============ THE DARK SIGN ============ */}
              <h3 className="font-display text-blood-bright text-[0.7rem] tracking-[0.25em] uppercase mt-6 mb-1">
                The Dark Sign
              </h3>

              <Row label="Preserve thy save" hint="download thy legend as a file">
                <button onClick={exportSave} className="btn-hollow min-h-10 px-4 text-[0.6rem]">
                  Export
                </button>
              </Row>

              <Row label="Restore from ashes" hint="load a previously preserved save">
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) importSave(f)
                      e.target.value = ''
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="btn-hollow min-h-10 px-4 text-[0.6rem]"
                  >
                    Import
                  </button>
                </>
              </Row>

              <Row label="Restore defaults" hint="settings only — progress is untouched">
                <button
                  onClick={() => updateSettings(DEFAULT_SETTINGS)}
                  className="btn-hollow min-h-10 px-4 text-[0.6rem]"
                >
                  Restore
                </button>
              </Row>

              <Row label="Sever thy save" hint="everything returns to ash. forever.">
                <button
                  onClick={wipeSave}
                  className="min-h-10 px-4 font-display text-[0.6rem] tracking-[0.18em] uppercase border border-blood-bright/70 text-blood-bright hover:bg-blood/30 transition-colors"
                >
                  Sever
                </button>
              </Row>

              <button onClick={onClose} className="btn-ember w-full min-h-12 mt-6 mb-2">
                Seal the Covenant
              </button>
              <p className="text-center font-ui text-[0.65rem] text-faded mb-1">
                EMBERFORGE v{APP_VERSION} &middot; thy data never leaves this device
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
