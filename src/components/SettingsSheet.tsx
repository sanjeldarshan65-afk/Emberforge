import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, DEFAULT_SETTINGS } from '../state/store'
import { APP_VERSION } from '../version'
import { useToast } from '../ui/toastContext'
import { useModalDismiss } from '../ui/useModalDismiss'
import {
  buildExport,
  parseImport,
  applySave,
  listBackups,
  restoreBackup,
  markExported,
  needsExportReminder,
} from '../state/backup'
import { encryptText, decryptText, isEncryptedBackup } from '../state/crypto'
import { remindersSupported, remindersPermitted, requestReminderPermission } from '../pwa/reminders'
import { pushToCloud, pullFromCloud } from '../state/cloudSync'
import { buildDemoState } from '../state/demoData'
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

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      /* the ::after overlay stretches the tap target to ~64x44 while the
         switch itself stays its visual 48x28 */
      className={`relative inline-block w-12 h-7 border shrink-0 transition-colors duration-300 after:content-[''] after:absolute after:-inset-2 ${
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
  useModalDismiss(open, onClose)
  const settings = useGame((s) => s.settings)
  const updateSettings = useGame((s) => s.updateSettings)
  const macroGoals = useGame((s) => s.macroGoals)
  const setMacroGoal = useGame((s) => s.setMacroGoal)
  const applyDemo = useGame((s) => s.applyDemo)
  const demoActive = useGame((s) => s.demoActive)
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const download = (contents: string, ext: string) => {
    const blob = new Blob([contents], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `emberforge-${new Date().toLocaleDateString('en-CA')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportSave = async (encrypted: boolean) => {
    try {
      let contents = buildExport(APP_VERSION)
      let ext = 'json'
      if (encrypted) {
        const pass = window.prompt(
          'Choose a passphrase to seal this backup. Thou wilt need it to restore — it cannot be recovered.'
        )
        if (!pass) return
        contents = await encryptText(contents, pass)
        ext = 'enc.json'
      }
      download(contents, ext)
      markExported()
      toast(encrypted ? 'Thy legend is sealed and preserved' : 'Thy legend is preserved', 'souls')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The rite of preservation failed', 'blood')
    }
  }

  const importSave = async (file: File) => {
    try {
      const text = await file.text()
      let saveText = text
      if (isEncryptedBackup(text)) {
        const pass = window.prompt('This backup is sealed. Enter its passphrase to restore.')
        if (!pass) return
        saveText = await decryptText(text, pass)
      }
      const saveString = parseImport(saveText)
      if (!window.confirm('Restore this legend? Thy current progress will be replaced.')) return
      applySave(saveString)
      window.location.reload()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'These ashes are no true save', 'blood')
    }
  }

  const restoreLocalBackup = (id: string, at: number) => {
    if (
      !window.confirm(
        `Roll back to the snapshot from ${new Date(at).toLocaleString()}? Current progress will be replaced.`
      )
    )
      return
    if (restoreBackup(id)) window.location.reload()
    else toast('That snapshot could not be found', 'blood')
  }

  const cloudPush = async () => {
    const pass = window.prompt('Passphrase to encrypt this sync (never stored, never sent):')
    if (!pass) return
    try {
      await pushToCloud(settings.cloudEndpoint, pass, APP_VERSION)
      toast('Thy legend is synced, sealed in cipher', 'souls')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The sync failed', 'blood')
    }
  }

  const cloudPull = async () => {
    const pass = window.prompt('Passphrase to unseal the cloud backup:')
    if (!pass) return
    if (!window.confirm('Pull the cloud backup? Thy current progress will be replaced.')) return
    try {
      await pullFromCloud(settings.cloudEndpoint, pass)
      window.location.reload()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The pull failed', 'blood')
    }
  }

  const lightFirstFlame = () => {
    if (
      !window.confirm(
        'Light the First Flame? This fills the app with ~4 weeks of sample data so thou canst see it fully alive. Thy real save is kept safe and restored when thou dost clear the demo.'
      )
    )
      return
    localStorage.setItem('emberforge-predemo', localStorage.getItem('emberforge-save') ?? '')
    applyDemo(buildDemoState())
    toast('The First Flame is lit — a sample legend fills the ash', 'souls')
    onClose()
  }

  const clearDemo = () => {
    if (!window.confirm('Clear the demo and restore thy true save?')) return
    const pre = localStorage.getItem('emberforge-predemo')
    if (pre) localStorage.setItem('emberforge-save', pre)
    else localStorage.removeItem('emberforge-save')
    localStorage.removeItem('emberforge-predemo')
    window.location.reload()
  }

  const backups = listBackups()
  const showExportReminder = needsExportReminder()

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
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
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
                <Toggle label="Auto rest timer" on={settings.autoRestTimer} onChange={(v) => updateSettings({ autoRestTimer: v })} />
              </Row>

              <Row label="Haptic pulse" hint="tremble when the rest burns out">
                <Toggle label="Haptic pulse" on={settings.vibration} onChange={(v) => updateSettings({ vibration: v })} />
              </Row>

              <Row label="Sound of the forge" hint="synthesized thuds, shings, and tolls">
                <Toggle label="Sound of the forge" on={settings.sound} onChange={(v) => updateSettings({ sound: v })} />
              </Row>

              {/* ============ THE VESSEL ============ */}
              <h3 className="font-display text-souls text-[0.7rem] tracking-[0.25em] uppercase mt-6 mb-1">
                The Vessel
              </h3>

              <Row label="Show avatar" hint="the wireframe body in the Sanctum">
                <Toggle label="Show avatar" on={settings.showAvatar} onChange={(v) => updateSettings({ showAvatar: v })} />
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
                <Toggle label="Hollowed Mode" on={settings.hollowed} onChange={(v) => updateSettings({ hollowed: v })} />
              </Row>

              <Row
                label="Ember Reminders"
                hint={
                  remindersSupported()
                    ? 'a nudge when thy streak gutters or a reward waits — while the app is open'
                    : 'this vessel cannot bear notifications — install to the home screen and return'
                }
              >
                <Toggle
                  label="Ember Reminders"
                  on={settings.reminders && remindersPermitted()}
                  onChange={async (v) => {
                    if (!v) {
                      updateSettings({ reminders: false })
                      return
                    }
                    const granted = await requestReminderPermission()
                    updateSettings({ reminders: granted })
                    toast(
                      granted
                        ? 'The embers will call to thee'
                        : 'The realm refused — grant notifications in thy browser settings',
                      granted ? 'souls' : 'blood'
                    )
                  }}
                />
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

              {/* ============ LIGHT THE FIRST FLAME (demo mode) ============ */}
              <h3 className="font-display text-souls text-[0.7rem] tracking-[0.25em] uppercase mt-6 mb-1">
                Light the First Flame
              </h3>
              {demoActive ? (
                <Row label="Demo data is lit" hint="a sample legend — not thy true record">
                  <button
                    onClick={clearDemo}
                    className="min-h-10 px-4 font-display text-[0.6rem] tracking-[0.18em] uppercase border border-blood-bright/70 text-blood-bright hover:bg-blood/30 transition-colors"
                  >
                    Clear Demo
                  </button>
                </Row>
              ) : (
                <Row label="See the app fully alive" hint="seed ~4 weeks of sample battles, meals &amp; weigh-ins">
                  <button onClick={lightFirstFlame} className="btn-ember min-h-10 px-4 text-[0.6rem]">
                    Light It
                  </button>
                </Row>
              )}

              {/* ============ THE DARK SIGN ============ */}
              <h3 className="font-display text-blood-bright text-[0.7rem] tracking-[0.25em] uppercase mt-6 mb-1">
                The Dark Sign
              </h3>

              {showExportReminder && (
                <p className="font-ui text-[0.62rem] text-glow-ember italic mb-2">
                  It has been a while since thy last export. Keep an off-device copy — a cleared
                  cache spares nothing.
                </p>
              )}

              <Row label="Preserve thy save" hint="download — plain, or sealed with a passphrase">
                <div className="flex gap-2">
                  <button
                    onClick={() => exportSave(false)}
                    className="btn-hollow min-h-10 px-4 text-[0.6rem]"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => exportSave(true)}
                    className="btn-hollow min-h-10 px-3 text-[0.6rem]"
                  >
                    Encrypted
                  </button>
                </div>
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

              {/* ---- automatic local snapshots ---- */}
              {backups.length > 0 && (
                <div className="mt-4">
                  <div className="font-ui text-[0.6rem] tracking-[0.2em] uppercase text-faded mb-2">
                    Local Snapshots &middot; taken automatically
                  </div>
                  <div className="space-y-1.5">
                    {backups.map((b) => (
                      <div key={b.id} className="flex items-center justify-between panel px-3 py-2">
                        <div className="font-ui text-xs text-bone-dim">
                          {new Date(b.at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          <span className="text-faded">
                            {' '}
                            &middot; {Math.max(1, Math.round(b.bytes / 1024))} KB
                          </span>
                        </div>
                        <button
                          onClick={() => restoreLocalBackup(b.id, b.at)}
                          className="btn-hollow min-h-9 px-3 text-[0.55rem]"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="font-ui text-[0.58rem] text-faded italic mt-1.5">
                    Snapshots live on this device only — they survive a bad state, not a cleared cache.
                  </p>
                </div>
              )}

              {/* ---- optional encrypted cloud sync (opt-in; off by default) ---- */}
              <h3 className="font-display text-humanity text-[0.7rem] tracking-[0.25em] uppercase mt-6 mb-1">
                Cloud Sync &middot; Experimental
              </h3>
              <p className="font-ui text-[0.62rem] text-faded leading-relaxed mb-3">
                Off by default — thy save never leaves this device unless thou set an endpoint. When
                set, the backup is encrypted in thy browser with a passphrase before sending; the
                endpoint stores only ciphertext, and the passphrase is never stored nor sent.
              </p>
              <input
                type="url"
                inputMode="url"
                placeholder="https://your-endpoint/… (blank = off)"
                value={settings.cloudEndpoint ?? ''}
                onChange={(e) => updateSettings({ cloudEndpoint: e.target.value.trim() })}
                className="input-dark min-h-11 text-xs mb-2"
                aria-label="cloud sync endpoint URL"
              />
              {settings.cloudEndpoint ? (
                <div className="flex gap-2">
                  <button onClick={cloudPush} className="btn-hollow flex-1 min-h-11 text-[0.6rem]">
                    Sync Up
                  </button>
                  <button onClick={cloudPull} className="btn-hollow flex-1 min-h-11 text-[0.6rem]">
                    Restore Down
                  </button>
                </div>
              ) : (
                <p className="font-ui text-[0.6rem] text-faded italic">
                  No endpoint set — cloud sync is disabled.
                </p>
              )}

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
