/* ================================================================
   APPRAISAL OF THE FEAST — optional AI photo → calorie/macro estimate.

   The forge keeps its own counsel: with no key set, nothing leaves the
   device and the Cauldron simply asks the ashen one to enter macros by
   hand. If a personal OpenAI-compatible vision key is stored (on this
   device only), a photo may be appraised. No numbers are ever invented
   here — a failed or keyless call returns null, and the caller falls
   back to manual entry.
   ================================================================ */

export type MacroEstimate = {
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

const KEY_STORE = 'emberforge-vision-key'

export function getVisionKey(): string {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY_STORE) : null
    if (stored) return stored
  } catch {
    /* storage blocked — fall through */
  }
  const env = (import.meta as unknown as { env?: Record<string, string> }).env
  return env?.VITE_OPENAI_API_KEY ?? ''
}

export function setVisionKey(key: string): void {
  try {
    localStorage.setItem(KEY_STORE, key.trim())
  } catch {
    /* ignore */
  }
}

export const hasVisionKey = (): boolean => getVisionKey().length > 0

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const clampNum = (v: unknown): number => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * Appraise a food photo. Returns a macro estimate, or `null` when no key
 * is configured or the appraisal fails — the caller then requests manual entry.
 */
export async function estimateMealFromPhoto(file: File): Promise<MacroEstimate | null> {
  const key = getVisionKey()
  if (!key) return null

  try {
    const dataUrl = await toDataUrl(file)
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Estimate the food in this photo for a single serving. Reply with ONLY strict minified ' +
                  'JSON and no prose: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number}. ' +
                  'calories in kcal; protein, carbs and fats in grams. If unsure, give your best estimate.',
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    })

    if (!res.ok) return null
    const data: unknown = await res.json()
    const text =
      (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null

    const parsed = JSON.parse(match[0]) as Partial<MacroEstimate>
    return {
      name:
        typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Appraised Repast',
      calories: clampNum(parsed.calories),
      protein: clampNum(parsed.protein),
      carbs: clampNum(parsed.carbs),
      fats: clampNum(parsed.fats),
    }
  } catch {
    return null
  }
}
