/**
 * Dictation via the Web Speech API — no dependency, and it degrades to absent.
 *
 * Typed locally rather than pulling in DOM lib definitions that vary by
 * TypeScript version: SpeechRecognition is still vendor-prefixed in Safari and
 * missing from Firefox, so the feature has to be optional anyway.
 */

interface SpeechAlternative {
  transcript: string
}
interface SpeechResult {
  readonly length: number
  readonly isFinal: boolean
  item: (index: number) => SpeechAlternative
  [index: number]: SpeechAlternative
}
interface SpeechResultList {
  readonly length: number
  item: (index: number) => SpeechResult
  [index: number]: SpeechResult
}
interface SpeechEvent {
  resultIndex: number
  results: SpeechResultList
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: SpeechEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | null {
  const w: Record<string, unknown> = window as unknown as Record<string, unknown>
  const found = w['SpeechRecognition'] ?? w['webkitSpeechRecognition']
  return typeof found === 'function' ? (found as RecognitionCtor) : null
}

export function speechSupported(): boolean {
  return ctor() !== null
}

export interface Dictation {
  stop: () => void
}

/**
 * Start dictating. `onText` receives each finalised phrase; the caller appends.
 * Returns null when unsupported, so the caller can hide the control.
 */
export function startDictation(
  locale: string,
  onText: (text: string) => void,
  onEnd: () => void,
): Dictation | null {
  const Ctor = ctor()
  if (!Ctor) {
    return null
  }
  const rec = new Ctor()
  rec.lang = locale === 'en' ? 'en-GB' : 'fr-FR'
  rec.continuous = true
  rec.interimResults = false

  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i]
      if (result?.isFinal) {
        const text = result[0]?.transcript?.trim()
        if (text) {
          onText(text)
        }
      }
    }
  }
  // A refused microphone and a natural stop are the same thing to the caller:
  // the control goes back to idle.
  rec.onerror = onEnd
  rec.onend = onEnd

  try {
    rec.start()
  } catch {
    return null
  }
  return { stop: () => rec.stop() }
}
